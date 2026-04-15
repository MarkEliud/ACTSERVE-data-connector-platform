'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Table,
  Button,
  Spinner,
  Alert,
  Badge,
  Pagination,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaDownload, FaTrash, FaShare, FaLock, FaGlobe } from 'react-icons/fa';
import FileShareModal from '@/components/storage/FileShareModal';

interface FileExport {
  id: number;
  job_name: string;
  file_format: string;
  file_name: string;
  file_size: number;
  is_public: boolean;
  can_access: boolean;
  created_at: string;
  download_url: string;
}

export default function StorageFilesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [files, setFiles] = useState<FileExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileExport | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated, pagination.current_page]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/storage/exports/', {
        params: {
          page: pagination.current_page,
          page_size: pagination.page_size,
        },
      });
      setFiles(response.data.results);
      setPagination(prev => ({
        ...prev,
        count: response.data.pagination?.count || 0,
        total_pages: response.data.pagination?.total_pages || 1,
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileExport) => {
    try {
      const response = await apiClient.get(`/storage/exports/${file.id}/download/`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download failed:', err);
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          const text = await err.response.data.text();
          try {
            const errorData = JSON.parse(text);
            alert(`Download failed: ${errorData.error || 'Unknown error'}`);
          } catch {
            alert(`Download failed: ${text || 'Unknown error'}`);
          }
        } else {
          alert(`Download failed: ${err.response?.data?.error || 'Unknown error'}`);
        }
      } else {
        alert('Failed to download file. Please check your connection.');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await apiClient.delete(`/storage/exports/${id}/`);
      fetchFiles();
    } catch (err: any) {
      alert(`Failed to delete: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleTogglePublic = async (file: FileExport) => {
    try {
      await apiClient.post(`/storage/exports/${file.id}/toggle_public/`);
      fetchFiles();
    } catch (err: any) {
      alert(`Failed to update: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleShare = (file: FileExport) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading files...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">Stored Files</h1>
          <p className="text-muted">Download, share, and manage exported data files</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {files.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-3">No files available</p>
            <p className="small text-muted">
              Export data from the data grid to create downloadable files.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>File Name</th>
                    <th>Job</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>Access</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <strong>{file.file_name}</strong>
                      </td>
                      <td>{file.job_name}</td>
                      <td>
                        <Badge bg={file.file_format === 'json' ? 'info' : 'success'}>
                          {file.file_format.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{formatFileSize(file.file_size)}</td>
                      <td>
                        {file.is_public ? (
                          <Badge bg="success">
                            <FaGlobe className="me-1" /> Public
                          </Badge>
                        ) : (
                          <Badge bg="secondary">
                            <FaLock className="me-1" /> Private
                          </Badge>
                        )}
                      </td>
                      <td>{formatDate(file.created_at)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleDownload(file)}
                          disabled={!file.can_access}
                          title="Download"
                        >
                          <FaDownload />
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShare(file)}
                          title="Share with users"
                        >
                          <FaShare />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleTogglePublic(file)}
                          title={file.is_public ? 'Make Private' : 'Make Public'}
                        >
                          {file.is_public ? <FaLock /> : <FaGlobe />}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {pagination.total_pages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                  disabled={pagination.current_page === 1}
                />
                {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                  let pageNum = pagination.current_page;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.current_page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.current_page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.current_page - 2 + i;
                  }
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === pagination.current_page}
                      onClick={() => setPagination(prev => ({ ...prev, current_page: pageNum }))}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                  disabled={pagination.current_page === pagination.total_pages}
                />
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Share Modal */}
      {selectedFile && (
        <FileShareModal
          show={showShareModal}
          onHide={() => {
            setShowShareModal(false);
            setSelectedFile(null);
          }}
          fileId={selectedFile.id}
          fileName={selectedFile.file_name}
          onShareSuccess={fetchFiles}
        />
      )}
    </Container>
  );
}
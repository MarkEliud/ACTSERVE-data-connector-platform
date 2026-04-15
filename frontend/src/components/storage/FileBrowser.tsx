// frontend/src/components/storage/FileBrowser.tsx
import { useState, useEffect } from 'react';
import { Table, Badge, Button, Spinner, Form, InputGroup, Pagination } from 'react-bootstrap';
import { FaDownload, FaTrash, FaShare, FaLock, FaGlobe, FaSearch, FaFolder, FaFile } from 'react-icons/fa';
import apiClient from '@/lib/api/client';

interface FileItem {
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

interface FileBrowserProps {
  onFileSelect?: (file: FileItem) => void;
  onFileDelete?: (id: number) => void;
  onTogglePublic?: (file: FileItem) => void;
}

export default function FileBrowser({ onFileSelect, onFileDelete, onTogglePublic }: FileBrowserProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchFiles();
  }, [currentPage, search]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/storage/exports/', {
        params: {
          page: currentPage,
          page_size: pageSize,
          search: search || undefined,
        },
      });
      setFiles(response.data.results);
      setTotalPages(response.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      window.open(file.download_url, '_blank');
    } catch (err) {
      alert('Failed to download file');
    }
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <FaFolder size={48} className="mb-3" />
          <p>No files available</p>
        </div>
      ) : (
        <>
          <Table responsive hover>
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
                <tr
                  key={file.id}
                  style={{ cursor: onFileSelect ? 'pointer' : 'default' }}
                  onClick={() => onFileSelect?.(file)}
                >
                  <td>
                    <FaFile className="me-2 text-secondary" />
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      disabled={!file.can_access}
                    >
                      <FaDownload />
                    </Button>
                    {onTogglePublic && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePublic(file);
                        }}
                      >
                        {file.is_public ? <FaLock /> : <FaGlobe />}
                      </Button>
                    )}
                    {onFileDelete && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileDelete(file.id);
                        }}
                      >
                        <FaTrash />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                />
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = currentPage;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
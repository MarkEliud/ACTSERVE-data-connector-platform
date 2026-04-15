// frontend/src/components/storage/FilePreview.tsx
import { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card } from 'react-bootstrap';
import { FaFile, FaDownload, FaTimes } from 'react-icons/fa';
import apiClient from '@/lib/api/client';

interface FilePreviewProps {
  file: {
    id: number;
    file_name: string;
    file_format: string;
    file_size: number;
    download_url: string;
  } | null;
  show: boolean;
  onHide: () => void;
}

export default function FilePreview({ file, show, onHide }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && file && file.file_format === 'json') {
      fetchPreview();
    } else {
      setContent(null);
    }
  }, [show, file]);

  const fetchPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(file.download_url);
      const data = response.data;
      setContent(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (file) {
      window.open(file.download_url, '_blank');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaFile className="me-2" />
          {file?.file_name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {file && (
          <div className="mb-3">
            <Card className="bg-light">
              <Card.Body className="py-2">
                <div className="d-flex justify-content-between">
                  <div>
                    <small className="text-muted">Format:</small>{' '}
                    <strong>{file.file_format.toUpperCase()}</strong>
                  </div>
                  <div>
                    <small className="text-muted">Size:</small>{' '}
                    <strong>{formatFileSize(file.file_size)}</strong>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading preview...</p>
          </div>
        )}

        {content && !loading && (
          <pre className="bg-dark text-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto' }}>
            {content}
          </pre>
        )}

        {!loading && !content && file?.file_format !== 'json' && (
          <div className="text-center py-5 text-muted">
            <p>Preview not available for {file?.file_format.toUpperCase()} files</p>
            <Button variant="primary" onClick={handleDownload}>
              <FaDownload className="me-2" /> Download to view
            </Button>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" /> Close
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <FaDownload className="me-1" /> Download
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
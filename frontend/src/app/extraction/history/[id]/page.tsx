'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
  Row,
  Col,
  ProgressBar,
  Table,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaArrowLeft, FaPlay, FaStop, FaTable } from 'react-icons/fa';

interface ExtractionJob {
  id: number;
  name: string;
  description: string;
  connection: number;
  connection_name: string;
  status: string;
  table_name: string;
  schema_name: string;
  columns: string[];
  query: string;
  batch_size: number;
  total_rows: number;
  total_batches: number;
  progress_percentage: number;
  created_at: string;
  completed_at: string | null;
}

interface Batch {
  id: number;
  batch_number: number;
  status: string;
  row_count: number;
  error_message: string;
  created_at: string;
}

export default function ExtractionHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchJob();
      fetchBatches();
    }
  }, [isAuthenticated, params.id]);

  // Poll while running
  useEffect(() => {
    if (!job) return;
    if (!['running', 'pending'].includes(job.status)) return;

    const interval = setInterval(() => {
      fetchJob();
      fetchBatches();
    }, 3000);

    return () => clearInterval(interval);
  }, [job?.status]);

  const fetchJob = async () => {
    try {
      const response = await apiClient.get(`/extraction/jobs/${params.id}/`);
      setJob(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await apiClient.get('/extraction/batches/', {
        params: { job: params.id },
      });
      setBatches(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const handleStart = async () => {
    try {
      await apiClient.post(`/extraction/jobs/${params.id}/start/`);
      fetchJob();
    } catch (err: any) {
      alert(`Failed to start: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this extraction?')) return;
    try {
      await apiClient.post(`/extraction/jobs/${params.id}/cancel/`);
      fetchJob();
    } catch (err: any) {
      alert(`Failed to cancel: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'warning',
      running: 'info',
      completed: 'success',
      failed: 'danger',
      cancelled: 'secondary',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading extraction details...</p>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container className="py-5">
        <Alert variant="danger">Job not found</Alert>
        <Button variant="primary" onClick={() => router.push('/extraction/history')}>
          Back to History
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button
        variant="link"
        className="mb-3 ps-0"
        onClick={() => router.push('/extraction/history')}
      >
        <FaArrowLeft className="me-2" /> Back to History
      </Button>

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Job Header */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2 className="mb-2">{job.name}</h2>
              {job.description && <p className="text-muted">{job.description}</p>}
              <div className="d-flex gap-3">
                <div>
                  <small className="text-muted">Status:</small>
                  <div>{getStatusBadge(job.status)}</div>
                </div>
                <div>
                  <small className="text-muted">Created:</small>
                  <div>{formatDate(job.created_at)}</div>
                </div>
                {job.completed_at && (
                  <div>
                    <small className="text-muted">Completed:</small>
                    <div>{formatDate(job.completed_at)}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex gap-2">
              {job.status === 'pending' && (
                <Button variant="success" onClick={handleStart}>
                  <FaPlay className="me-2" /> Start Extraction
                </Button>
              )}
              {['pending', 'running'].includes(job.status) && (
                <Button variant="danger" onClick={handleCancel}>
                  <FaStop className="me-2" /> Cancel
                </Button>
              )}
              {job.status === 'completed' && (
                <Button variant="primary" onClick={() => router.push(`/data-grid/${params.id}`)}>
                  <FaTable className="me-2" /> View Data Grid
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Progress */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white border-0 pt-3">
          <h5 className="mb-0">Extraction Progress</h5>
        </Card.Header>
        <Card.Body>
          <ProgressBar
            now={job.progress_percentage}
            label={`${job.progress_percentage}%`}
            variant={job.status === 'failed' ? 'danger' : 'primary'}
            className="mb-3"
            style={{ height: '30px' }}
          />
          <Row>
            <Col md={3} className="text-center">
              <h3>{job.total_rows?.toLocaleString() || 0}</h3>
              <small className="text-muted">Total Rows</small>
            </Col>
            <Col md={3} className="text-center">
              <h3>{job.total_batches || 0}</h3>
              <small className="text-muted">Total Batches</small>
            </Col>
            <Col md={3} className="text-center">
              <h3>{job.batch_size?.toLocaleString() || 0}</h3>
              <small className="text-muted">Batch Size</small>
            </Col>
            <Col md={3} className="text-center">
              <h3>
                {batches.filter(b => b.status === 'completed').length} / {batches.length}
              </h3>
              <small className="text-muted">Completed Batches</small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Configuration */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Source Configuration</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-2"><strong>Connection:</strong> {job.connection_name}</div>
              <div className="mb-2"><strong>Table:</strong> {job.table_name || 'Custom Query'}</div>
              {job.schema_name && (
                <div className="mb-2"><strong>Schema:</strong> {job.schema_name}</div>
              )}
              {job.columns?.length > 0 && (
                <div className="mb-2">
                  <strong>Columns:</strong>{' '}
                  {job.columns.map(col => (
                    <Badge key={col} bg="secondary" className="me-1">{col}</Badge>
                  ))}
                </div>
              )}
              {job.query && (
                <div className="mb-2">
                  <strong>Custom Query:</strong>
                  <pre className="bg-light p-2 mt-1 rounded small">{job.query}</pre>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <h5 className="mb-0">Extraction Settings</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-2"><strong>Batch Size:</strong> {job.batch_size} rows</div>
              <div className="mb-2"><strong>Status:</strong> {getStatusBadge(job.status)}</div>
              <div className="mb-2"><strong>Created:</strong> {formatDate(job.created_at)}</div>
              {job.completed_at && (
                <div className="mb-2"><strong>Completed:</strong> {formatDate(job.completed_at)}</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Batches Table */}
      {batches.length > 0 && (
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white border-0 pt-3">
            <h5 className="mb-0">Extraction Batches</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Batch #</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Created</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{batch.batch_number}</td>
                    <td>{getStatusBadge(batch.status)}</td>
                    <td>{batch.row_count?.toLocaleString() || 0}</td>
                    <td>{formatDate(batch.created_at)}</td>
                    <td className="text-danger">{batch.error_message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
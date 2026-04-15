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
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaPlay, FaStop, FaEye, FaDownload } from 'react-icons/fa';

interface ExtractionJob {
  id: number;
  name: string;
  description: string;
  connection_name: string;
  status: string;
  total_rows: number;
  total_batches: number;
  progress_percentage: number;
  created_at: string;
  completed_at: string | null;
}

export default function ExtractionHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
  });
  const [filter, setFilter] = useState({
    status: '',
    search: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated, pagination.current_page, filter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        page_size: pagination.page_size,
      };
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;

      const response = await apiClient.get('/extraction/jobs/', { params });
      setJobs(response.data.results);
      setPagination(prev => ({
        ...prev,
        count: response.data.pagination?.count || 0,
        total_pages: response.data.pagination?.total_pages || 1,
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load extraction history');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await apiClient.post(`/extraction/jobs/${id}/start/`);
      fetchJobs();
    } catch (err: any) {
      alert(`Failed to start: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this extraction?')) return;
    try {
      await apiClient.post(`/extraction/jobs/${id}/cancel/`);
      fetchJobs();
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
        <p className="mt-3">Loading extraction history...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">Extraction History</h1>
          <p className="text-muted">View and manage your data extraction jobs</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/extraction')}>
          New Extraction
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by name..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filter.status}
                  onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="secondary" onClick={fetchJobs}>
                Apply Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {jobs.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-3">No extraction jobs found</p>
            <Button variant="primary" onClick={() => router.push('/extraction')}>
              Create Your First Extraction
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Name</th>
                    <th>Connection</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Rows</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
  <strong>{job.name}</strong>
  {job.description && (
    <>
      <br />
      <small className="text-muted">{job.description}</small>
    </>
  )}
</td>
                      <td>{job.connection_name}</td>
                      <td>{getStatusBadge(job.status)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                            <div
                              className={`progress-bar bg-${job.status === 'failed' ? 'danger' : 'primary'}`}
                              style={{ width: `${job.progress_percentage}%` }}
                            />
                          </div>
                          <span className="small">{job.progress_percentage}%</span>
                        </div>
                      </td>
                      <td>{job.total_rows?.toLocaleString() || '-'}</td>
                      <td>{formatDate(job.created_at)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => router.push(`/extraction/history/${job.id}`)}
                        >
                          <FaEye />
                        </Button>
                        {job.status === 'pending' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleStart(job.id)}
                          >
                            <FaPlay />
                          </Button>
                        )}
                        {['pending', 'running'].includes(job.status) && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleCancel(job.id)}
                          >
                            <FaStop />
                          </Button>
                        )}
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
    </Container>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Badge } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { 
  FaDatabase, FaFileAlt, FaTable, FaChartLine, FaPlug, FaHistory, 
  FaArrowRight, FaCheckCircle, FaClock, FaExclamationTriangle 
} from 'react-icons/fa';
// import { FaFileExport } from "react-icons/fa6";
import { FaFileDownload } from "react-icons/fa";
// import { FaFileExport } from "react-icons/fa";

interface DashboardStats {
  total_connections: number;
  active_connections: number;
  total_extractions: number;
  completed_extractions: number;
  total_records_extracted: number;
  total_exports: number;
  extraction_by_status: Record<string, number>;
  connections_by_type: Record<string, number>;
  recent_connections: Array<{
    id: number;
    name: string;
    database_type: string;
    database_type_display: string;
    is_active: boolean;
    created_at: string;
  }>;
  recent_extractions: Array<{
    id: number;
    name: string;
    status: string;
    status_display: string;
    created_at: string;
    total_rows: number;
    progress_percentage: number;
  }>;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/dashboard/stats/');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f89734',
      running: '#46b754',
      completed: '#46b754',
      failed: '#dc2626',
      cancelled: '#6c757d',
    };
    return colors[status] || '#6c757d';
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <FaCheckCircle />;
      case 'pending': return <FaClock />;
      case 'failed': return <FaExclamationTriangle />;
      default: return <FaClock />;
    }
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <div className="fade-in">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading dashboard...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <div className="text-center fade-in">
          <div className="text-danger mb-3">
            <FaPlug size={48} />
          </div>
          <h4>Unable to load dashboard</h4>
          <p className="text-muted">{error}</p>
          <Button variant="primary" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      </Container>
    );
  }

  const statCards = [
    {
      title: 'Connections',
      value: stats?.total_connections || 0,
      subtext: `${stats?.active_connections || 0} active`,
      icon: <FaDatabase size={28} />,
      iconBg: '#46b75410',
      iconColor: '#46b754',
      link: '/connections',
    },
    {
      title: 'Extractions',
      value: stats?.total_extractions || 0,
      subtext: `${stats?.completed_extractions || 0} completed`,
      icon: <FaFileAlt size={28} />,
      iconBg: '#f8973410',
      iconColor: '#f89734',
      link: '/extraction/history',
    },
    {
      title: 'Records Extracted',
      value: stats?.total_records_extracted?.toLocaleString() || '0',
      subtext: 'Total rows processed',
      icon: <FaTable size={28} />,
      iconBg: '#244a4a10',
      iconColor: '#244a4a',
      link: '/extraction/history',
    },
    {
      title: 'Exports',
      value: stats?.total_exports || 0,
      subtext: 'JSON/CSV files',
      icon: <FaChartLine size={28} />,
      iconBg: '#22384310',
      iconColor: '#223843',
      link: '/storage/files',
    },
  ];

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 fade-in">
        <div>
          <h1 className="mb-0">Dashboard</h1>
          <p className="text-muted mt-1">
            Welcome back, <strong>{user?.username || user?.email?.split('@')[0] || 'User'}</strong>
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => router.push('/extraction')}
          className="d-flex align-items-center gap-2"
        >
          <FaFileDownload size={14} />
          New Extraction
          <FaArrowRight size={12} />
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="g-4 mb-5">
        {statCards.map((card, index) => (
          <Col md={6} lg={3} key={index}>
            <Card
              className="h-100 border-0 fade-in"
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => router.push(card.link)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>{card.title}</h6>
                    <h2 className="mb-1 fw-bold" style={{ fontSize: '2rem' }}>{card.value}</h2>
                    <small className="text-muted">{card.subtext}</small>
                  </div>
                  <div 
                    className="rounded-circle p-3 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                  >
                    {card.icon}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      {(stats?.connections_by_type && Object.keys(stats.connections_by_type).length > 0) ||
       (stats?.extraction_by_status && Object.keys(stats.extraction_by_status).length > 0) ? (
        <Row className="mb-4">
          {stats?.connections_by_type && Object.keys(stats.connections_by_type).length > 0 && (
            <Col lg={6}>
              <Card className="border-0 fade-in">
                <Card.Header className="bg-white border-0 pt-4 pb-2">
                  <h5 className="mb-0">Connections by Type</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex flex-wrap gap-3">
                    {Object.entries(stats.connections_by_type).map(([type, count]) => (
                      <div key={type} className="text-center p-3 rounded" style={{ backgroundColor: '#edf7f5', minWidth: '100px' }}>
                        <Badge bg="primary" className="p-2 mb-2">
                          <strong>{type.toUpperCase()}</strong>
                        </Badge>
                        <div className="mt-1">
                          <strong style={{ fontSize: '1.5rem' }}>{count}</strong>
                          <div className="text-muted small">connection{count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
          
          {stats?.extraction_by_status && Object.keys(stats.extraction_by_status).length > 0 && (
            <Col lg={6}>
              <Card className="border-0 fade-in">
                <Card.Header className="bg-white border-0 pt-4 pb-2">
                  <h5 className="mb-0">Extractions by Status</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex flex-wrap gap-3">
                    {Object.entries(stats.extraction_by_status).map(([status, count]) => (
                      <div key={status} className="text-center p-3 rounded" style={{ backgroundColor: '#edf7f5', minWidth: '100px' }}>
                        <div className="mb-2" style={{ color: getStatusColor(status) }}>
                          {getStatusIcon(status)}
                        </div>
                        <Badge style={{ backgroundColor: getStatusColor(status) }} className="mb-2">
                          {status.toUpperCase()}
                        </Badge>
                        <div>
                          <strong style={{ fontSize: '1.5rem' }}>{count}</strong>
                          <div className="text-muted small">extraction{count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      ) : null}

      {/* Recent Activity */}
      <Row className="g-4">
        <Col lg={6}>
          <Card className="border-0 fade-in">
            <Card.Header className="bg-white border-0 pt-4 pb-2">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaDatabase style={{ color: '#46b754' }} />
                Recent Connections
              </h5>
            </Card.Header>
            <Card.Body>
              {stats?.recent_connections?.length ? (
                <div className="list-group list-group-flush">
                  {stats.recent_connections.slice(0, 5).map((conn) => (
                    <div
                      key={conn.id}
                      className="list-group-item d-flex justify-content-between align-items-center p-3 border-0 border-bottom"
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => router.push(`/connections/${conn.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#edf7f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>
                        <strong>{conn.name}</strong>
                        <br />
                        <small className="text-muted">
                          {conn.database_type_display || conn.database_type}
                        </small>
                        {!conn.is_active && (
                          <Badge bg="secondary" className="ms-2">Inactive</Badge>
                        )}
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/extraction?connection=${conn.id}`);
                        }}
                      >
                        Extract
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4">No connections yet</p>
              )}
              <Button
                variant="link"
                className="mt-3 p-0 d-flex align-items-center gap-1"
                onClick={() => router.push('/connections')}
              >
                View All Connections <FaArrowRight size={12} />
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 fade-in">
            <Card.Header className="bg-white border-0 pt-4 pb-2">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaHistory style={{ color: '#f89734' }} />
                Recent Extractions
              </h5>
            </Card.Header>
            <Card.Body>
              {stats?.recent_extractions?.length ? (
                <div className="list-group list-group-flush">
                  {stats.recent_extractions.slice(0, 5).map((extraction) => (
                    <div
                      key={extraction.id}
                      className="list-group-item d-flex justify-content-between align-items-center p-3 border-0 border-bottom"
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => router.push(`/extraction/history/${extraction.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#edf7f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div>
                        <strong>{extraction.name}</strong>
                        <br />
                        <small className="text-muted">
                          {new Date(extraction.created_at).toLocaleDateString()}
                        </small>
                        {extraction.total_rows > 0 && (
                          <small className="text-muted ms-2">
                            • {extraction.total_rows.toLocaleString()} rows
                          </small>
                        )}
                      </div>
                      <Badge style={{ backgroundColor: getStatusColor(extraction.status) }}>
                        {extraction.status_display || extraction.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4">No extractions yet</p>
              )}
              <Button
                variant="link"
                className="mt-3 p-0 d-flex align-items-center gap-1"
                onClick={() => router.push('/extraction/history')}
              >
                View All Extractions <FaArrowRight size={12} />
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
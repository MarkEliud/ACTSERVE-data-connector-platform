'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Badge,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaSave, FaVial, FaArrowLeft } from 'react-icons/fa';

interface Connection {
  id: number;
  name: string;
  description: string;
  database_type: string;
  host: string;
  port: number;
  database_name: string;
  user: string;
  password?: string;
  options: Record<string, any>;
  connection_timeout: number;
  max_connections: number;
  is_active: boolean;
  is_public: boolean;
  created_by: number;
  created_by_email: string;
}

const databaseTypes = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017 },
  { value: 'clickhouse', label: 'ClickHouse', defaultPort: 8123 },
];

export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Connection>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id !== 'new') {
      fetchConnection();
    } else if (params.id === 'new') {
      setLoading(false);
      setFormData({
        database_type: 'postgresql',
        port: 5432,
        connection_timeout: 30,
        max_connections: 10,
        is_active: true,
        is_public: false,
      });
    }
  }, [isAuthenticated, params.id]);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/connections/${params.id}/`);
      setConnection(response.data);
      setFormData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load connection');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleDatabaseTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = databaseTypes.find(t => t.value === e.target.value);
    setFormData(prev => ({
      ...prev,
      database_type: e.target.value,
      port: selected?.defaultPort || 5432,
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const isNew = params.id === 'new';
    try {
      let response;

      if (!isNew && !formData.password) {
        response = await apiClient.post(`/connections/${params.id}/test/`);
        const ok = response.data.status === 'success';
        if (ok) {
          alert(`Connection test successful! (${response.data.response_time_ms}ms)`);
          await fetchConnection();
        } else {
          alert(`Test failed: ${response.data.error}`);
        }
      } else {
        response = await apiClient.post('/connections/test/', {
          database_type: formData.database_type,
          host: formData.host,
          port: formData.port,
          database_name: formData.database_name,
          user: formData.user,
          password: formData.password,
          connection_timeout: formData.connection_timeout,
        });
        const ok = response.data.success;
        if (ok) {
          alert(`Connection test successful! (${response.data.response_time}ms)`);
        } else {
          alert(`Test failed: ${response.data.error}`);
        }
      }
    } catch (err: any) {
      alert(`Test failed: ${err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const isNew = params.id === 'new';

    try {
      if (isNew) {
        const response = await apiClient.post('/connections/', formData);
        setSuccess('Connection created successfully!');
        setTimeout(() => {
          router.push(`/connections/${response.data.id}`);
        }, 1500);
      } else {
        await apiClient.put(`/connections/${params.id}/`, formData);
        setSuccess('Connection updated successfully!');
        fetchConnection();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const isOwner = () => {
    if (!connection || !user) return false;
    return user.id === connection.created_by;
  };

  if (loading || authLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading connection...</p>
      </Container>
    );
  }

  const isNew = params.id === 'new';
  const userCanEdit = isNew || (connection && (user?.is_admin || isOwner()));

  if (!isNew && !userCanEdit) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You do not have permission to edit this connection.</p>
        </Alert>
        <Button variant="primary" onClick={() => router.push('/connections')}>
          Back to Connections
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Button
        variant="link"
        className="mb-3 ps-0"
        onClick={() => router.push('/connections')}
      >
        <FaArrowLeft className="me-2" /> Back to Connections
      </Button>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0 pt-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0">{isNew ? 'New Connection' : connection?.name}</h2>
              {!isNew && connection && (
                <div className="mt-2">
                  <Badge bg={connection.is_active ? 'success' : 'danger'} className="me-2">
                    {connection.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge bg={connection.is_public ? 'info' : 'secondary'}>
                    {connection.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
              )}
            </div>
            {!isNew && connection && connection.created_by_email && (
              <div className="text-muted">
                <small>Created by: {connection.created_by_email}</small>
              </div>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)} dismissible>
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Connection Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Database Type *</Form.Label>
                  <Form.Select
                    name="database_type"
                    value={formData.database_type || ''}
                    onChange={handleDatabaseTypeChange}
                    required
                    disabled={!isNew}
                  >
                    {databaseTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                  {!isNew && (
                    <Form.Text className="text-muted">
                      Database type cannot be changed after creation.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Optional description of this connection"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Host *</Form.Label>
                  <Form.Control
                    type="text"
                    name="host"
                    value={formData.host || ''}
                    onChange={handleChange}
                    required
                    placeholder="localhost or database hostname"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Port *</Form.Label>
                  <Form.Control
                    type="number"
                    name="port"
                    value={formData.port || ''}
                    onChange={handleChange}
                    required
                    min={1}
                    max={65535}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Database Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="database_name"
                    value={formData.database_name || ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control
                    type="text"
                    name="user"
                    value={formData.user || ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password {!isNew && '(leave blank to keep current)'}</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password || ''}
                    onChange={handleChange}
                    required={isNew}
                    placeholder={isNew ? 'Enter password' : 'Enter new password to change'}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Connection Timeout (seconds)</Form.Label>
                  <Form.Control
                    type="number"
                    name="connection_timeout"
                    value={formData.connection_timeout || 30}
                    onChange={handleChange}
                    min={1}
                    max={300}
                  />
                  <Form.Text className="text-muted">
                    How long to wait when connecting to the database
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Connections</Form.Label>
                  <Form.Control
                    type="number"
                    name="max_connections"
                    value={formData.max_connections || 10}
                    onChange={handleChange}
                    min={1}
                    max={100}
                  />
                  <Form.Text className="text-muted">
                    Maximum number of simultaneous connections
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                name="is_active"
                label="Active (connection is working)"
                checked={formData.is_active || false}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Mark as inactive if this connection is not currently working
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Check
                type="switch"
                name="is_public"
                label="Make Public (visible to other users)"
                checked={formData.is_public || false}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                When public, other users can see and use this connection for their extractions.
                Private connections are only visible to you.
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-3">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? <Spinner size="sm" animation="border" className="me-2" /> : <FaVial className="me-2" />}
                Test Connection
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? <Spinner size="sm" animation="border" className="me-2" /> : <FaSave className="me-2" />}
                {isNew ? 'Create Connection' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
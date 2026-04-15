'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import apiClient from '@/lib/api/client';

interface ConnectionFormProps {
  connectionId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const databaseTypes = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017 },
  { value: 'clickhouse', label: 'ClickHouse', defaultPort: 8123 },
];

export default function ConnectionForm({ connectionId, onSuccess, onCancel }: ConnectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    database_type: 'postgresql',
    host: '',
    port: 5432,
    database_name: '',
    user: '',
    password: '',
    connection_timeout: 30,
    max_connections: 10,
    is_active: true,
  });

  useEffect(() => {
    if (connectionId) {
      fetchConnection();
    }
  }, [connectionId]);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/connections/${connectionId}/`);
      const data = response.data;
      setFormData({
        name: data.name || '',
        description: data.description || '',
        database_type: data.database_type || 'postgresql',
        host: data.host || '',
        port: data.port || 5432,
        database_name: data.database_name || '',
        user: data.user || '',
        password: '',
        connection_timeout: data.connection_timeout || 30,
        max_connections: data.max_connections || 10,
        is_active: data.is_active ?? true,
      });
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
    setError(null);
    try {
      const response = await apiClient.post('/connections/test/', {
        database_type: formData.database_type,
        host: formData.host,
        port: formData.port,
        database_name: formData.database_name,
        user: formData.user,
        password: formData.password,
        connection_timeout: formData.connection_timeout,
      });
      if (response.data.success) {
        alert(`Connection test successful! (${response.data.response_time}ms)`);
      } else {
        alert(`Test failed: ${response.data.error}`);
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

    try {
      if (connectionId) {
        await apiClient.put(`/connections/${connectionId}/`, formData);
      } else {
        await apiClient.post('/connections/', formData);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Connection Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
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
              value={formData.database_type}
              onChange={handleDatabaseTypeChange}
              required
              disabled={!!connectionId}
            >
              {databaseTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </Form.Group>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Host *</Form.Label>
            <Form.Control
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group className="mb-3">
            <Form.Label>Port *</Form.Label>
            <Form.Control
              type="number"
              name="port"
              value={formData.port}
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
              value={formData.database_name}
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
              value={formData.user}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Password {!connectionId && '*'}</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!connectionId}
              placeholder={connectionId ? 'Leave blank to keep current' : ''}
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
              value={formData.connection_timeout}
              onChange={handleChange}
              min={1}
              max={300}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Max Connections</Form.Label>
            <Form.Control
              type="number"
              name="max_connections"
              value={formData.max_connections}
              onChange={handleChange}
              min={1}
              max={100}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-4">
        <Form.Check
          type="switch"
          name="is_active"
          label="Active"
          checked={formData.is_active}
          onChange={handleChange}
        />
      </Form.Group>

      <div className="d-flex gap-3">
        <Button
          type="button"
          variant="outline-secondary"
          onClick={handleTestConnection}
          disabled={testing}
        >
          {testing ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          Test Connection
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          {connectionId ? 'Save Changes' : 'Create Connection'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Form>
  );
}
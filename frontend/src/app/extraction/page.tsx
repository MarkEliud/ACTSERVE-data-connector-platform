'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface Connection {
  id: number;
  name: string;
  database_type: string;
  database_type_display: string;
  host: string;
  database_name: string;
}

interface Table {
  table_name: string;
  table_type: string;
  description?: string;
}

interface Schema {
  name: string;
}

export default function ExtractionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionId = searchParams.get('connection');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    connection: connectionId ? parseInt(connectionId) : '',
    table_name: '',
    schema_name: '',
    columns: [] as string[],
    columnsInput: '',
    query: '',
    filters: {} as Record<string, any>,
    batch_size: 1000,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConnections();
    }
  }, [isAuthenticated]);

  // Fetch schemas when connection changes
  useEffect(() => {
    if (formData.connection) {
      fetchSchemas();
    } else {
      setSchemas([]);
      setTables([]);
      setFormData(prev => ({ ...prev, schema_name: '', table_name: '' }));
    }
  }, [formData.connection]);

  // Fetch tables when schema changes
  useEffect(() => {
    if (formData.connection && formData.schema_name) {
      fetchTables();
    } else {
      setTables([]);
      setFormData(prev => ({ ...prev, table_name: '' }));
    }
  }, [formData.connection, formData.schema_name]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/connections/');
      setConnections(response.data.results || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchemas = async () => {
    if (!formData.connection) return;
    
    try {
      setLoadingSchemas(true);
      const response = await apiClient.get(`/connections/${formData.connection}/schemas/`);
      setSchemas(response.data.schemas || response.data || []);
    } catch (err: any) {
      console.error('Failed to load schemas:', err);
      setError(err.response?.data?.error || 'Failed to load schemas');
    } finally {
      setLoadingSchemas(false);
    }
  };

  const fetchTables = async () => {
    if (!formData.connection || !formData.schema_name) return;
    
    try {
      setLoadingTables(true);
      const response = await apiClient.get(
        `/connections/${formData.connection}/tables/`,
        { params: { schema: formData.schema_name } }
      );
      setTables(response.data.tables || response.data || []);
    } catch (err: any) {
      console.error('Failed to load tables:', err);
      setError(err.response?.data?.error || 'Failed to load tables');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleConnectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      connection: value ? parseInt(value) : '',
      schema_name: '',
      table_name: '',
    }));
  };

  const handleSchemaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      schema_name: value,
      table_name: '',
    }));
  };

  const handleColumnsAdd = () => {
    if (formData.columnsInput.trim()) {
      const newColumns = formData.columnsInput.split(',').map(c => c.trim()).filter(c => c);
      setFormData(prev => ({
        ...prev,
        columns: [...prev.columns, ...newColumns],
        columnsInput: '',
      }));
    }
  };

  const handleColumnsRemove = (column: string) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c !== column),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await apiClient.post('/extraction/jobs/', {
        ...formData,
        columns: formData.columns,
      });
      // Start extraction automatically
      await apiClient.post(`/extraction/jobs/${response.data.id}/start/`);
      router.push(`/extraction/history/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create extraction job');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading...</p>
      </Container>
    );
  }

  const selectedConnection = connections.find(c => c.id === formData.connection);

  return (
    <Container className="py-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0 pt-4">
          <h2 className="mb-0">New Data Extraction</h2>
          <p className="text-muted">Configure and start a new data extraction job</p>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Job Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Customer Data Export"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description of this extraction job"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Source Connection *</Form.Label>
              <Form.Select
                name="connection"
                value={formData.connection}
                onChange={handleConnectionChange}
                required
              >
                <option value="">Select a database connection</option>
                {connections.map(conn => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.database_type_display})
                  </option>
                ))}
              </Form.Select>
              {selectedConnection && (
                <Form.Text className="text-muted">
                  Host: {selectedConnection.host} | Database: {selectedConnection.database_name}
                </Form.Text>
              )}
            </Form.Group>

            <hr />

            <h5 className="mb-3">Extraction Configuration</h5>

            {/* Schema Dropdown */}
            <Form.Group className="mb-3">
              <Form.Label>Schema / Database *</Form.Label>
              <Form.Select
                name="schema_name"
                value={formData.schema_name}
                onChange={handleSchemaChange}
                required={!formData.query}
                disabled={!formData.connection || loadingSchemas}
              >
                <option value="">Select a schema/database</option>
                {schemas.map(schema => (
                  <option key={schema.name} value={schema.name}>
                    {schema.name}
                  </option>
                ))}
              </Form.Select>
              {loadingSchemas && (
                <Form.Text className="text-muted">
                  <Spinner size="sm" animation="border" className="me-1" />
                  Loading schemas...
                </Form.Text>
              )}
            </Form.Group>

            {/* Table Dropdown */}
            <Form.Group className="mb-3">
              <Form.Label>Table Name *</Form.Label>
              <Form.Select
                name="table_name"
                value={formData.table_name}
                onChange={handleChange}
                required={!formData.query}
                disabled={!formData.schema_name || loadingTables}
              >
                <option value="">Select a table</option>
                {tables.map(table => (
                  <option key={table.table_name} value={table.table_name}>
                    {table.table_name} {table.description && `- ${table.description}`}
                  </option>
                ))}
              </Form.Select>
              {loadingTables && (
                <Form.Text className="text-muted">
                  <Spinner size="sm" animation="border" className="me-1" />
                  Loading tables...
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Columns to Extract (Optional - leave empty for all)</Form.Label>
              <Row>
                <Col md={8}>
                  <Form.Control
                    type="text"
                    value={formData.columnsInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, columnsInput: e.target.value }))}
                    placeholder="Enter column names separated by commas"
                  />
                </Col>
                <Col md={4}>
                  <Button variant="outline-secondary" onClick={handleColumnsAdd} type="button">
                    Add Columns
                  </Button>
                </Col>
              </Row>
              {formData.columns.length > 0 && (
                <div className="mt-2">
                  {formData.columns.map(col => (
                    <Badge
                      key={col}
                      bg="secondary"
                      className="me-2 mb-2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleColumnsRemove(col)}
                    >
                      {col} ×
                    </Badge>
                  ))}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Custom Query (Optional - overrides table selection)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="query"
                value={formData.query}
                onChange={handleChange}
                placeholder="SELECT * FROM customers WHERE created_at > '2024-01-01'"
              />
              <Form.Text className="text-muted">
                Use custom SQL for advanced extraction needs. Leave empty to use table-based extraction.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Batch Size (rows per batch)</Form.Label>
              <Form.Control
                type="number"
                name="batch_size"
                value={formData.batch_size}
                onChange={handleChange}
                min={1}
                max={100000}
              />
              <Form.Text className="text-muted">
                Larger batches are faster but use more memory. Recommended: 1000-10000.
              </Form.Text>
            </Form.Group>

            <div className="d-flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                {creating ? 'Creating & Starting...' : 'Create & Start Extraction'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
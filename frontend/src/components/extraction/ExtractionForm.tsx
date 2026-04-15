import { useState } from 'react';
import { Form, Button, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';

interface ExtractionFormProps {
  connections: Array<{ id: number; name: string; database_type_display: string }>;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  loading?: boolean;
}

export default function ExtractionForm({
  connections,
  onSubmit,
  initialData,
  loading = false,
}: ExtractionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    connection: initialData?.connection || '',
    table_name: initialData?.table_name || '',
    schema_name: initialData?.schema_name || '',
    columns: initialData?.columns || [] as string[],
    columnsInput: '',
    query: initialData?.query || '',
    batch_size: initialData?.batch_size || 1000,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setError(null);
    
    if (!formData.name) {
      setError('Job name is required');
      return;
    }
    if (!formData.connection) {
      setError('Source connection is required');
      return;
    }
    if (!formData.table_name && !formData.query) {
      setError('Either table name or custom query is required');
      return;
    }
    
    await onSubmit(formData);
  };

  const selectedConnection = connections.find(c => c.id === Number(formData.connection));

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

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
          onChange={handleChange}
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
            Selected: {selectedConnection.name}
          </Form.Text>
        )}
      </Form.Group>

      <hr />

      <h5 className="mb-3">Extraction Configuration</h5>

      <Form.Group className="mb-3">
        <Form.Label>Table Name *</Form.Label>
        <Form.Control
          type="text"
          name="table_name"
          value={formData.table_name}
          onChange={handleChange}
          required={!formData.query}
          placeholder="e.g., customers"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Schema Name (Optional)</Form.Label>
        <Form.Control
          type="text"
          name="schema_name"
          value={formData.schema_name}
          onChange={handleChange}
          placeholder="e.g., public"
        />
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
          Use custom SQL for advanced extraction needs.
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
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          {initialData ? 'Update Job' : 'Create & Start Extraction'}
        </Button>
      </div>
    </Form>
  );
}
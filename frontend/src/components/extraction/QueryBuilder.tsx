import { useState } from 'react';
import { Form, Button, Row, Col, Card, Badge, Alert } from 'react-bootstrap';

interface QueryBuilderProps {
  connectionType: string;
  tableName?: string;
  schemaName?: string;
  onQueryChange: (query: string) => void;
  onExecute?: () => void;
}

export default function QueryBuilder({
  connectionType,
  tableName,
  schemaName,
  onQueryChange,
  onExecute,
}: QueryBuilderProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Array<{ field: string; operator: string; value: string }>>([]);
  const [customQuery, setCustomQuery] = useState('');

  const operators = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Than or Equal' },
    { value: 'like', label: 'Contains' },
    { value: 'in', label: 'In' },
    { value: 'is_null', label: 'Is Null' },
    { value: 'is_not_null', label: 'Is Not Null' },
  ];

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const generateQuery = () => {
    if (!tableName) return '';

    const table = schemaName ? `${schemaName}.${tableName}` : tableName;
    const columns = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';
    
    let whereClause = '';
    if (filters.length > 0) {
      const conditions = filters.map(f => {
        if (f.operator === 'is_null') return `${f.field} IS NULL`;
        if (f.operator === 'is_not_null') return `${f.field} IS NOT NULL`;
        if (f.operator === 'in') return `${f.field} IN (${f.value.split(',').map(v => `'${v.trim()}'`).join(', ')})`;
        if (f.operator === 'like') return `${f.field} LIKE '%${f.value}%'`;
        return `${f.field} = '${f.value}'`;
      });
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    return `SELECT ${columns} FROM ${table}${whereClause}`;
  };

  const updateQuery = () => {
    if (mode === 'simple') {
      const query = generateQuery();
      onQueryChange(query);
    } else {
      onQueryChange(customQuery);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Query Builder</h6>
          <div>
            <Button
              variant={mode === 'simple' ? 'primary' : 'outline-secondary'}
              size="sm"
              className="me-2"
              onClick={() => {
                setMode('simple');
                updateQuery();
              }}
            >
              Simple Mode
            </Button>
            <Button
              variant={mode === 'advanced' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => {
                setMode('advanced');
                setCustomQuery(generateQuery());
                updateQuery();
              }}
            >
              Advanced Mode
            </Button>
          </div>
        </div>

        {mode === 'simple' ? (
          <>
            {!tableName && (
              <Alert variant="warning" className="mb-3">
                Select a table name to build a query.
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Columns to Select</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter column names separated by commas (leave empty for all)"
                onChange={(e) => {
                  const cols = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                  setSelectedColumns(cols);
                }}
                disabled={!tableName}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Filters</Form.Label>
              {filters.map((filter, idx) => (
                <Row key={idx} className="mb-2">
                  <Col md={4}>
                    <Form.Control
                                           type="text"
                      placeholder="Field name"
                      value={filter.field}
                      onChange={(e) => updateFilter(idx, 'field', e.target.value)}
                      disabled={!tableName}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Select
                      value={filter.operator}
                      onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                      disabled={!tableName}
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                      disabled={!tableName || ['is_null', 'is_not_null'].includes(filter.operator)}
                    />
                  </Col>
                  <Col md={1}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeFilter(idx)}
                      disabled={!tableName}
                    >
                      ×
                    </Button>
                  </Col>
                </Row>
              ))}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={addFilter}
                disabled={!tableName}
              >
                + Add Filter
              </Button>
            </Form.Group>

            <Button
              variant="primary"
              onClick={updateQuery}
              disabled={!tableName}
              className="mt-2"
            >
              Build Query
            </Button>
          </>
        ) : (
          <Form.Group className="mb-3">
            <Form.Label>Custom SQL Query</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              value={customQuery}
              onChange={(e) => {
                setCustomQuery(e.target.value);
                onQueryChange(e.target.value);
              }}
              placeholder="SELECT * FROM table_name WHERE condition"
            />
            <Form.Text className="text-muted">
              Write your own SQL query. Be careful with large result sets.
            </Form.Text>
          </Form.Group>
        )}
      </Card.Body>
    </Card>
  );
}
import { Form, Row, Col, Alert } from 'react-bootstrap';

interface BatchConfigProps {
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  showAdvanced?: boolean;
  error?: string;
}

export default function BatchConfig({
  batchSize,
  onBatchSizeChange,
  showAdvanced = false,
  error,
}: BatchConfigProps) {
  return (
    <>
      <Form.Group className="mb-3">
        <Form.Label>Batch Size (rows per batch)</Form.Label>
        <Form.Control
          type="number"
          value={batchSize}
          onChange={(e) => onBatchSizeChange(parseInt(e.target.value) || 1000)}
          min={1}
          max={100000}
          isInvalid={!!error}
        />
        <Form.Text className="text-muted">
          Larger batches are faster but use more memory. Recommended: 1000-10000.
        </Form.Text>
        {error && (
          <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
        )}
      </Form.Group>

      {showAdvanced && (
        <>
          <hr />
          <h6 className="mb-3">Advanced Batch Settings</h6>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Max Concurrent Batches</Form.Label>
                <Form.Control
                  type="number"
                  defaultValue={4}
                  min={1}
                  max={10}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Retry Attempts on Failure</Form.Label>
                <Form.Control
                  type="number"
                  defaultValue={3}
                  min={0}
                  max={5}
                />
              </Form.Group>
            </Col>
          </Row>
          <Alert variant="info" className="small">
            <strong>Note:</strong> Advanced batch settings are for large-scale extractions.
            Default settings work well for most use cases.
          </Alert>
        </>
      )}
    </>
  );
}
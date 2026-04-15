// frontend/src/components/data-grid/ValidationErrors.tsx
import { Alert, ListGroup, Badge } from 'react-bootstrap';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationErrorsProps {
  errors: ValidationError[];
  onErrorClick?: (row: number, field: string) => void;
}

export default function ValidationErrors({ errors, onErrorClick }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="danger" className="mb-3">
      <Alert.Heading className="h6">
        <Badge bg="danger" className="me-2">{errors.length}</Badge>
        Validation Errors Found
      </Alert.Heading>
      <ListGroup variant="flush" className="mb-0">
        {errors.slice(0, 10).map((error, idx) => (
          <ListGroup.Item
            key={idx}
            className="bg-transparent border-0 ps-0 py-1"
            style={{ cursor: onErrorClick ? 'pointer' : 'default' }}
            onClick={() => onErrorClick?.(error.row, error.field)}
          >
            <strong>Row {error.row}, {error.field}:</strong> {error.message}
          </ListGroup.Item>
        ))}
        {errors.length > 10 && (
          <ListGroup.Item className="bg-transparent border-0 ps-0 py-1 text-muted">
            ...and {errors.length - 10} more errors
          </ListGroup.Item>
        )}
      </ListGroup>
    </Alert>
  );
}
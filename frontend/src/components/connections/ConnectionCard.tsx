import { Card, Badge, Button } from 'react-bootstrap';
import { FaDatabase, FaEdit, FaTrash, FaPlug, FaArrowRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface ConnectionCardProps {
  id: number;
  name: string;
  description?: string;
  database_type: string;
  database_type_display: string;
  host: string;
  port: number;
  database_name: string;
  is_active: boolean;
  onTest?: (id: number) => void;
  onDelete?: (id: number) => void;
  testing?: boolean;
}

export default function ConnectionCard({
  id,
  name,
  description,
  database_type_display,
  host,
  port,
  database_name,
  is_active,
  onTest,
  onDelete,
  testing = false,
}: ConnectionCardProps) {
  const router = useRouter();

  return (
    <Card className="h-100 shadow-sm border-0">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <FaDatabase className="text-primary me-2" size={24} />
            <h5 className="d-inline-block mb-0">{name}</h5>
          </div>
          <Badge bg={is_active ? 'success' : 'secondary'}>
            {is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {description && (
          <p className="text-muted small mb-3">{description}</p>
        )}

        <div className="mb-3">
          <div className="mb-1">
            <small className="text-muted">Type:</small>{' '}
            <strong>{database_type_display}</strong>
          </div>
          <div className="mb-1">
            <small className="text-muted">Host:</small>{' '}
            <strong>{host}:{port}</strong>
          </div>
          <div>
            <small className="text-muted">Database:</small>{' '}
            <strong>{database_name}</strong>
          </div>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => onTest?.(id)}
            disabled={testing}
          >
            <FaPlug className="me-1" /> Test
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => router.push(`/connections/${id}`)}
          >
            <FaEdit className="me-1" /> Edit
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => router.push(`/extraction?connection=${id}`)}
          >
            Extract <FaArrowRight className="ms-1" />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete?.(id)}
          >
            <FaTrash />
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
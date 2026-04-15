'use client';

import { Table, Badge, Button, Spinner } from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlug, FaPlus } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface Connection {
  id: number;
  name: string;
  description: string;
  database_type: string;
  database_type_display: string;
  host: string;
  port: number;
  database_name: string;
  is_active: boolean;
}

interface ConnectionListProps {
  connections: Connection[];
  loading?: boolean;
  onTest?: (id: number) => void;
  onDelete?: (id: number) => void;
  testingId?: number | null;
}

export default function ConnectionList({
  connections,
  loading = false,
  onTest,
  onDelete,
  testingId,
}: ConnectionListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-3">No connections configured yet</p>
        <Button variant="primary" onClick={() => router.push('/connections/new')}>
          <FaPlus className="me-2" /> Create Your First Connection
        </Button>
      </div>
    );
  }

  return (
    <Table responsive hover className="mb-0">
      <thead className="bg-light">
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Host</th>
          <th>Database</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {connections.map((conn) => (
          <tr key={conn.id}>
            <td>
              <strong>{conn.name}</strong>
              {conn.description && (
                <>
                  <br />
                  <small className="text-muted">{conn.description}</small>
                </>
              )}
            </td>
            <td>
              <Badge bg="secondary">{conn.database_type_display}</Badge>
            </td>
            <td>
              {conn.host}:{conn.port}
            </td>
            <td>{conn.database_name}</td>
            <td>
              <Badge bg={conn.is_active ? 'success' : 'secondary'}>
                {conn.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td>
              <Button
                variant="outline-primary"
                size="sm"
                className="me-2"
                onClick={() => onTest?.(conn.id)}
                disabled={testingId === conn.id}
              >
                {testingId === conn.id ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <FaPlug />
                )}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => router.push(`/connections/${conn.id}`)}
              >
                <FaEdit />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onDelete?.(conn.id)}
              >
                <FaTrash />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
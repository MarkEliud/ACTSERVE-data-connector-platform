'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Button,
  Table,
  Badge,
  Spinner,
  Alert,
  Modal,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaEdit, FaTrash, FaPlug, FaPlus, FaGlobe, FaLock } from 'react-icons/fa';

interface Connection {
  id: number;
  name: string;
  description: string;
  database_type: string;
  database_type_display: string;
  host: string;
  port: number;
  database_name: string;
  user: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  created_by: number;
  created_by_email: string;
  can_edit: boolean;
  can_delete: boolean;
  can_toggle_public: boolean;
}

export default function ConnectionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [togglingPublic, setTogglingPublic] = useState<number | null>(null);

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

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/connections/');
      const connectionsData = response.data.results || response.data;
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: number) => {
    setTesting(id);
    try {
      const response = await apiClient.post(`/connections/${id}/test/`);
      if (response.data.status === 'success') {
        alert(`Connection test successful! (${response.data.response_time_ms}ms)`);
        await fetchConnections();
      } else {
        alert(`Test failed: ${response.data.error}`);
      }
    } catch (err: any) {
      alert(`Test failed: ${err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleTogglePublic = async (connection: Connection) => {
    setTogglingPublic(connection.id);
    try {
      const response = await apiClient.patch(`/connections/${connection.id}/toggle_public/`);
      if (response.data.success) {
        await fetchConnections();
        const status = response.data.is_public ? 'Public' : 'Private';
        alert(`Connection "${connection.name}" is now ${status}`);
      } else {
        alert(`Failed to update: ${response.data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Unknown error';
      alert(`Failed to update: ${errorMsg}`);
    } finally {
      setTogglingPublic(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedConnection) return;

    try {
      await apiClient.delete(`/connections/${selectedConnection.id}/`);
      setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
      setShowDeleteModal(false);
      setSelectedConnection(null);
      alert(`Connection "${selectedConnection.name}" deleted successfully`);
    } catch (err: any) {
      alert(`Failed to delete: ${err.response?.data?.error || 'Unknown error'}`);
    }
  };

  const isOwner = (connection: Connection) => {
    return user?.id === connection.created_by;
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading connections...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">Database Connections</h1>
          <p className="text-muted">Manage your database connections</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/connections/new')}>
          <FaPlus className="me-2" /> New Connection
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {connections.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-3">No connections configured yet</p>
            <Button variant="primary" onClick={() => router.push('/connections/new')}>
              Create Your First Connection
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Host</th>
                  <th>Database</th>
                  <th>Status</th>
                  <th>Access</th>
                  <th>Owner</th>
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
                      <Badge bg={conn.is_active ? 'success' : 'danger'}>
                        {conn.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Badge 
                        bg={conn.is_public ? 'info' : 'secondary'} 
                        className="d-inline-flex align-items-center gap-1"
                      >
                        {conn.is_public ? <FaGlobe size={12} /> : <FaLock size={12} />}
                        <span>{conn.is_public ? 'Public' : 'Private'}</span>
                      </Badge>
                    </td>
                    <td>
                      <small className="text-muted">
                        {conn.created_by_email || `User ${conn.created_by}`}
                        {isOwner(conn) && <Badge bg="primary" className="ms-1">You</Badge>}
                      </small>
                    </td>
                    <td>
                      {/* Test Button - Only for owners */}
                      {isOwner(conn) && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleTestConnection(conn.id)}
                          disabled={testing === conn.id}
                          title="Test Connection"
                        >
                          {testing === conn.id ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            <FaPlug />
                          )}
                        </Button>
                      )}
                      
                      {/* Public/Private Toggle Button - Show if can_toggle_public is true */}
                      {conn.can_toggle_public === true && (
                        <Button
                          variant={conn.is_public ? "outline-warning" : "outline-success"}
                          size="sm"
                          className="me-2"
                          onClick={() => handleTogglePublic(conn)}
                          disabled={togglingPublic === conn.id}
                          title={conn.is_public ? "Make Private" : "Make Public"}
                        >
                          {togglingPublic === conn.id ? (
                            <Spinner size="sm" animation="border" />
                          ) : conn.is_public ? (
                            <FaLock />
                          ) : (
                            <FaGlobe />
                          )}
                        </Button>
                      )}
                      
                      {/* Edit Button - Only for owners or admins */}
                      {conn.can_edit === true && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => router.push(`/connections/${conn.id}`)}
                          title="Edit"
                        >
                          <FaEdit />
                        </Button>
                      )}
                      
                      {/* Delete Button - Only for owners or admins */}
                      {conn.can_delete === true && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(conn);
                            setShowDeleteModal(true);
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete connection "{selectedConnection?.name}"?
          <br />
          <small className="text-danger">This action cannot be undone.</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
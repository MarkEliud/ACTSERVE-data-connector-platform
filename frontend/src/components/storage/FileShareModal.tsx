'use client';

import { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  ListGroup,
  Badge,
} from 'react-bootstrap';
import { FaShare, FaEnvelope, FaUserPlus } from 'react-icons/fa';
import apiClient from '@/lib/api/client';

interface FileShareModalProps {
  show: boolean;
  onHide: () => void;
  fileId: number;
  fileName: string;
  onShareSuccess?: () => void;
}

export default function FileShareModal({
  show,
  onHide,
  fileId,
  fileName,
  onShareSuccess,
}: FileShareModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sharedUsers, setSharedUsers] = useState<Array<{ email: string; shared_at: string }>>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  const fetchSharedUsers = async () => {
    try {
      setLoadingShared(true);
      const response = await apiClient.get(`/storage/exports/${fileId}/shares/`);
      setSharedUsers(response.data.shares || []);
    } catch (err: any) {
      console.error('Failed to fetch shared users:', err);
    } finally {
      setLoadingShared(false);
    }
  };

  const handleShare = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(`/storage/exports/${fileId}/share/`, {
        user_email: email,
      });
      
      setSuccess(`File shared successfully with ${email}`);
      setEmail('');
      fetchSharedUsers();
      onShareSuccess?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to share file');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userEmail: string) => {
    if (!confirm(`Revoke access for ${userEmail}?`)) return;

    try {
      await apiClient.post(`/storage/exports/${fileId}/revoke/`, {
        user_email: userEmail,
      });
      
      fetchSharedUsers();
      setSuccess(`Access revoked for ${userEmail}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke access');
    }
  };

  // Load shared users when modal opens
  const handleShow = () => {
    fetchSharedUsers();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" onShow={handleShow}>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShare className="me-2" />
          Share File: {fileName}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}

        <div className="mb-4">
          <h6>Share with new user</h6>
          <Form.Group className="mb-3">
            <Form.Label>User Email</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="email"
                placeholder="Enter user's email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleShare()}
              />
              <Button
                variant="primary"
                onClick={handleShare}
                disabled={loading || !email}
              >
                {loading ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <>
                    <FaUserPlus className="me-1" /> Share
                  </>
                )}
              </Button>
            </div>
            <Form.Text className="text-muted">
              User must have an account in the system
            </Form.Text>
          </Form.Group>
        </div>

        <div>
          <h6>Users with access</h6>
          {loadingShared ? (
            <div className="text-center py-3">
              <Spinner size="sm" animation="border" />
            </div>
          ) : sharedUsers.length === 0 ? (
            <p className="text-muted text-center py-3">
              No users have been shared with yet
            </p>
          ) : (
            <ListGroup>
              {sharedUsers.map((user, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  <div>
                    <FaEnvelope className="me-2 text-secondary" />
                    {user.email}
                    <Badge bg="info" className="ms-2">
                      Shared {new Date(user.shared_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRevoke(user.email)}
                  >
                    Revoke Access
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
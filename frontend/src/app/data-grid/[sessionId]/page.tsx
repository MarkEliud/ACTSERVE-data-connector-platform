'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
  Form,
  Modal,
} from 'react-bootstrap';
import { useAuth } from '@/lib/contexts/AuthContext';
import apiClient from '@/lib/api/client';
import { FaArrowLeft, FaSave, FaUndo, FaFileExport } from 'react-icons/fa';

interface DataRow {
  id: number;
  row_number: number;
  original_data: Record<string, any>;
  current_data: Record<string, any>;
  is_modified: boolean;
  is_valid: boolean;
  validation_errors: Record<string, string>;
}

interface DataSet {
  id: number;
  name: string;
  row_count: number;
  modified_count: number;
  invalid_count: number;
  extraction_job_name: string;
}

export default function DataGridPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dataset, setDataset] = useState<DataSet | null>(null);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Step 1: fetch dataset when authenticated
  useEffect(() => {
    if (isAuthenticated && params.sessionId) {
      fetchDataset();
    }
  }, [isAuthenticated, params.sessionId]);

  // Step 2: fetch rows only after dataset is loaded
  useEffect(() => {
    if (dataset?.id) {
      fetchRows(dataset.id);
    }
  }, [dataset?.id]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const fetchDataset = async () => {
    try {
      const response = await apiClient.get('/grid/datasets/', {
        params: { extraction_job: params.sessionId },
      });
      const datasets = response.data.results || response.data;
      if (Array.isArray(datasets) && datasets.length > 0) {
        setDataset(datasets[0]);
      } else {
        setError('No dataset found for this extraction job. Make sure the extraction completed successfully.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dataset');
      setLoading(false);
    }
  };

  const fetchRows = async (datasetId: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/grid/rows/', {
        params: { dataset: datasetId, page_size: 10000 },
      });
      const rowsData = response.data.results || response.data;
      setRows(rowsData);

      // Extract columns from first row
      if (rowsData.length > 0 && rowsData[0].current_data) {
        setColumns(Object.keys(rowsData[0].current_data));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rows');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (row: DataRow, field: string, value: any) => {
    const updatedRow = {
      ...row,
      current_data: {
        ...row.current_data,
        [field]: value,
      },
    };
    setRows(prev => prev.map(r => r.id === row.id ? updatedRow : r));
    setEditingCell(null);
  };

  const startEdit = (row: DataRow, field: string, currentValue: any) => {
    setEditingCell({ rowId: row.id, field });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const handleSaveRow = async (row: DataRow) => {
    try {
      setSaving(true);
      await apiClient.patch(`/grid/rows/${row.id}/`, {
        current_data: row.current_data,
      });
      setSuccess(`Row ${row.row_number} saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
      if (dataset?.id) fetchRows(dataset.id);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        setError(`Validation failed: ${Object.values(errors).join(', ')}`);
      } else {
        setError(err.response?.data?.error || 'Failed to save row');
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleRevertRow = async (row: DataRow) => {
    try {
      await apiClient.post(`/grid/rows/${row.id}/revert/`);
      setSuccess(`Row ${row.row_number} reverted successfully`);
      setTimeout(() => setSuccess(null), 3000);
      if (dataset?.id) fetchRows(dataset.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revert row');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleExport = async () => {
    if (!dataset) return;
    try {
      await apiClient.post('/storage/exports/', {
        job_id: params.sessionId,
        file_format: 'csv',
        include_modified_only: false,
      });
      alert('Export created successfully! You can download it from the Storage page.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create export');
    }
  };

  if (authLoading || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading data grid...</p>
      </Container>
    );
  }

  if (!dataset) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          No data grid available for this extraction job. Make sure the extraction is completed.
        </Alert>
        <Button variant="primary" onClick={() => router.push('/extraction/history')}>
          Back to Extractions
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            variant="link"
            className="mb-2 ps-0"
            onClick={() => router.push(`/extraction/history/${params.sessionId}`)}
          >
            <FaArrowLeft className="me-2" /> Back to Extraction
          </Button>
          <h1 className="mb-0">{dataset.name}</h1>
          <p className="text-muted">
            Job: {dataset.extraction_job_name} | {dataset.row_count} rows
            {dataset.modified_count > 0 && (
              <Badge bg="warning" className="ms-2">{dataset.modified_count} modified</Badge>
            )}
            {dataset.invalid_count > 0 && (
              <Badge bg="danger" className="ms-2">{dataset.invalid_count} invalid</Badge>
            )}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleExport}>
            <FaFileExport className="me-2" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)} dismissible>
          {success}
        </Alert>
      )}

      {rows.length === 0 ? (
        <Alert variant="info">No rows found in this dataset.</Alert>
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0" style={{ overflowX: 'auto' }}>
            <table className="table table-bordered table-hover mb-0" style={{ minWidth: '800px' }}>
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  {columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      !row.is_valid ? 'table-danger' : row.is_modified ? 'table-warning' : ''
                    }
                  >
                    <td className="text-center fw-bold">{row.row_number}</td>
                    {columns.map(col => {
                      const value = row.current_data[col];
                      const isEditing = editingCell?.rowId === row.id && editingCell?.field === col;
                      const hasError = row.validation_errors?.[col];

                      return (
                        <td key={col} className={hasError ? 'bg-danger bg-opacity-25' : ''}>
                          {isEditing ? (
                            <Form.Control
                              ref={inputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellEdit(row, col, editValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(row, col, editValue);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              size="sm"
                              isInvalid={!!hasError}
                            />
                          ) : (
                            <div
                              style={{ cursor: 'pointer', minHeight: '38px' }}
                              onClick={() => startEdit(row, col, value)}
                              title={hasError || ''}
                            >
                              {value !== null && value !== undefined
                                ? String(value)
                                : <span className="text-muted">—</span>}
                              {hasError && (
                                <span className="text-danger ms-1" title={hasError}>⚠️</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-1"
                        onClick={() => handleSaveRow(row)}
                        disabled={saving}
                      >
                        <FaSave />
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedRow(row);
                          setShowRevertModal(true);
                        }}
                      >
                        <FaUndo />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Body>
        </Card>
      )}

      <Modal show={showRevertModal} onHide={() => setShowRevertModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Revert Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to revert all changes to row {selectedRow?.row_number}?
          This will restore the original data.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevertModal(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={() => {
              if (selectedRow) handleRevertRow(selectedRow);
              setShowRevertModal(false);
            }}
          >
            Revert
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
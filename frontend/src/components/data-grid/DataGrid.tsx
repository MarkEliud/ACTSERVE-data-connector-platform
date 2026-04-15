// frontend/src/components/data-grid/DataGrid.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, Badge, Button, Form, Modal, Alert } from 'react-bootstrap';
import { FaSave, FaUndo, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface DataRow {
  id: number;
  row_number: number;
  original_data: Record<string, any>;
  current_data: Record<string, any>;
  is_modified: boolean;
  is_valid: boolean;
  validation_errors: Record<string, string>;
}

interface DataGridProps {
  rows: DataRow[];
  columns: string[];
  onSaveRow: (row: DataRow) => Promise<void>;
  onRevertRow: (row: DataRow) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}

export default function DataGrid({
  rows,
  columns,
  onSaveRow,
  onRevertRow,
  loading = false,
  readOnly = false,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [localRows, setLocalRows] = useState<DataRow[]>(rows);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const handleCellEdit = (row: DataRow, field: string, value: any) => {
    const updatedRow = {
      ...row,
      current_data: {
        ...row.current_data,
        [field]: value,
      },
      is_modified: true,
    };
    setLocalRows(prev => prev.map(r => r.id === row.id ? updatedRow : r));
    setEditingCell(null);
  };

  const startEdit = (row: DataRow, field: string, currentValue: any) => {
    if (readOnly) return;
    setEditingCell({ rowId: row.id, field });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const handleSaveRow = async (row: DataRow) => {
    setSavingRow(row.id);
    try {
      await onSaveRow(row);
    } finally {
      setSavingRow(null);
    }
  };

  const handleRevertRow = async (row: DataRow) => {
    setSelectedRow(row);
    setShowRevertModal(true);
  };

  const confirmRevert = async () => {
    if (selectedRow) {
      await onRevertRow(selectedRow);
      setShowRevertModal(false);
      setSelectedRow(null);
    }
  };

  const getCellStyle = (row: DataRow, field: string) => {
    if (row.validation_errors?.[field]) {
      return { backgroundColor: '#f8d7da' };
    }
    if (row.is_modified) {
      return { backgroundColor: '#fff3cd' };
    }
    return {};
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        No data available for this extraction.
      </div>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <Table bordered hover className="mb-0">
          <thead className="bg-light">
            <tr>
              <th style={{ width: '60px' }}>#</th>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
              {!readOnly && <th style={{ width: '120px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => (
              <tr key={row.id} className={!row.is_valid ? 'table-danger' : ''}>
                <td className="text-center fw-bold">{row.row_number}</td>
                {columns.map(col => {
                  const value = row.current_data[col];
                  const isEditing = editingCell?.rowId === row.id && editingCell?.field === col;
                  const hasError = row.validation_errors?.[col];

                  return (
                    <td
                      key={col}
                      style={getCellStyle(row, col)}
                      className={hasError ? 'position-relative' : ''}
                    >
                      {isEditing ? (
                        <Form.Control
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
                          autoFocus
                        />
                      ) : (
                        <div
                          style={{ cursor: readOnly ? 'default' : 'pointer', minHeight: '38px' }}
                          onClick={() => startEdit(row, col, value)}
                          title={hasError || ''}
                        >
                          {value !== null && value !== undefined ? (
                            <span>{String(value)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                          {hasError && (
                            <span className="text-danger ms-1" title={hasError}>⚠️</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                {!readOnly && (
                  <td className="text-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleSaveRow(row)}
                      disabled={savingRow === row.id || !row.is_modified}
                    >
                      {savingRow === row.id ? (
                        <div className="spinner-border spinner-border-sm" />
                      ) : (
                        <FaSave />
                      )}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleRevertRow(row)}
                      disabled={!row.is_modified}
                    >
                      <FaUndo />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Revert Confirmation Modal */}
      <Modal show={showRevertModal} onHide={() => setShowRevertModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Revert Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to revert all changes to row {selectedRow?.row_number}?
          This will restore the original data and cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevertModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={confirmRevert}>
            Revert
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
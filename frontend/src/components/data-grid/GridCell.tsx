// frontend/src/components/data-grid/GridCell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaEdit, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface GridCellProps {
  value: any;
  field: string;
  rowId: number;
  isModified: boolean;
  isValid: boolean;
  validationError?: string;
  isEditing: boolean;
  onStartEdit: (rowId: number, field: string, value: any) => void;
  onSaveEdit: (rowId: number, field: string, value: any) => Promise<void>;
  onCancelEdit: () => void;
  readOnly?: boolean;
  className?: string;
}

export default function GridCell({
  value,
  field,
  rowId,
  isModified,
  isValid,
  validationError,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  readOnly = false,
  className = '',
}: GridCellProps) {
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value !== null && value !== undefined ? String(value) : '');
    }
  }, [isEditing, value]);

  const handleStartEdit = () => {
    if (readOnly) return;
    onStartEdit(rowId, field, value);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveEdit(rowId, field, editValue);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatDisplayValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (val instanceof Date) return val.toLocaleString();
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const getCellClassNames = (): string => {
    const classes = ['grid-cell', className];
    
    if (!isValid) {
      classes.push('grid-cell-invalid');
    } else if (isModified) {
      classes.push('grid-cell-modified');
    }
    
    if (hovered && !isEditing && !readOnly) {
      classes.push('grid-cell-hoverable');
    }
    
    return classes.join(' ');
  };

  const getCellStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    if (!isValid) {
      style.backgroundColor = '#f8d7da';
      style.borderLeft = '3px solid #dc3545';
    } else if (isModified) {
      style.backgroundColor = '#fff3cd';
      style.borderLeft = '3px solid #ffc107';
    }
    
    return style;
  };

  // Render editing state
  if (isEditing) {
    const isTextArea = typeof value === 'string' && value.length > 100;
    
    return (
      <div className="grid-cell-editing" style={{ position: 'relative' }}>
        {isTextArea ? (
          <Form.Control
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            as="textarea"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            size="sm"
            rows={3}
            style={{ resize: 'vertical' }}
            isInvalid={!!validationError}
            disabled={saving}
          />
        ) : (
          <Form.Control
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            size="sm"
            isInvalid={!!validationError}
            disabled={saving}
          />
        )}
        <div className="grid-cell-actions" style={{ 
          position: 'absolute', 
          right: '4px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          display: 'flex',
          gap: '4px',
          background: 'white',
          padding: '2px',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '2px 6px' }}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <FaCheck size={12} />
            )}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleCancel}
            disabled={saving}
            style={{ padding: '2px 6px' }}
          >
            <FaTimes size={12} />
          </button>
        </div>
        {validationError && (
          <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>
            {validationError}
          </div>
        )}
      </div>
    );
  }

  // Render display state
  const displayValue = formatDisplayValue(value);
  const hasError = !!validationError;

  const cellContent = (
    <div
      className={getCellClassNames()}
      style={getCellStyle()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleStartEdit}
      role={!readOnly ? 'button' : undefined}
      tabIndex={!readOnly ? 0 : undefined}
      onKeyDown={(e) => {
        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      style={{
        ...getCellStyle(),
        cursor: readOnly ? 'default' : 'pointer',
        padding: '0.5rem',
        minHeight: '38px',
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
    >
      {displayValue || (
        <span className="text-muted" style={{ fontStyle: 'italic' }}>
          —
        </span>
      )}
      
      {/* Edit icon on hover */}
      {hovered && !readOnly && !isEditing && (
        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6c757d',
            opacity: 0.6,
          }}
        >
          <FaEdit size={12} />
        </div>
      )}
      
      {/* Validation error indicator */}
      {hasError && (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${rowId}-${field}`}>
              {validationError}
            </Tooltip>
          }
        >
          <div
            style={{
              position: 'absolute',
              right: '4px',
              top: '4px',
              color: '#dc3545',
              cursor: 'help',
            }}
          >
            <FaExclamationTriangle size={12} />
          </div>
        </OverlayTrigger>
      )}
      
      {/* Modified indicator */}
      {isModified && !hasError && (
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '3px',
            height: '100%',
            backgroundColor: '#ffc107',
          }}
        />
      )}
    </div>
  );

  // Wrap with tooltip if there's a validation error
  if (hasError) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`tooltip-${rowId}-${field}`}>{validationError}</Tooltip>}
      >
        {cellContent}
      </OverlayTrigger>
    );
  }

  return cellContent;
}
// frontend/src/components/data-grid/hooks/useInlineEdit.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface EditState {
  rowId: number;
  field: string;
  originalValue: any;
}

export function useInlineEdit<T extends { id: number; [key: string]: any }>(
  items: T[],
  onSave: (rowId: number, field: string, value: any) => Promise<void>
) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState<{ rowId: number; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const startEdit = useCallback((rowId: number, field: string, currentValue: any) => {
    setEditing({
      rowId,
      field,
      originalValue: currentValue,
    });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;

    setSaving({ rowId: editing.rowId, field: editing.field });
    try {
      await onSave(editing.rowId, editing.field, editValue);
      setEditing(null);
      setEditValue('');
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setSaving(null);
    }
  }, [editing, editValue, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    editing,
    editValue,
    saving,
    inputRef,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditValue,
    handleKeyDown,
  };
}
// frontend/src/components/data-grid/hooks/useGridData.ts
import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api/client';

interface DataRow {
  id: number;
  row_number: number;
  original_data: Record<string, any>;
  current_data: Record<string, any>;
  is_modified: boolean;
  is_valid: boolean;
  validation_errors: Record<string, string>;
}

export function useGridData(sessionId: string | number) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modifiedCount, setModifiedCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/grid/rows/', {
        params: { dataset: sessionId, page_size: 10000 },
      });
      const rowsData = response.data.results || response.data;
      setRows(rowsData);

      // Extract columns from first row
      if (rowsData.length > 0 && rowsData[0].current_data) {
        setColumns(Object.keys(rowsData[0].current_data));
      }

      // Update counts
      setModifiedCount(rowsData.filter((r: DataRow) => r.is_modified).length);
      setInvalidCount(rowsData.filter((r: DataRow) => !r.is_valid).length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rows');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const saveRow = useCallback(async (row: DataRow) => {
    try {
      const response = await apiClient.patch(`/grid/rows/${row.id}/`, {
        current_data: row.current_data,
      });
      // Update local state with response
      setRows(prev => prev.map(r => r.id === row.id ? response.data : r));
      return { success: true };
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors) {
        return { success: false, errors };
      }
      return { success: false, error: err.response?.data?.error || 'Failed to save row' };
    }
  }, []);

  const revertRow = useCallback(async (row: DataRow) => {
    try {
      const response = await apiClient.post(`/grid/rows/${row.id}/revert/`);
      setRows(prev => prev.map(r => r.id === row.id ? response.data : r));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to revert row' };
    }
  }, []);

  const saveAll = useCallback(async () => {
    const modifiedRows = rows.filter(r => r.is_modified);
    const results = await Promise.all(modifiedRows.map(row => saveRow(row)));
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return { success: false, failures: failures.length };
    }
    await fetchRows(); // Refresh to get latest state
    return { success: true };
  }, [rows, saveRow, fetchRows]);

  const revertAll = useCallback(async () => {
    const modifiedRows = rows.filter(r => r.is_modified);
    await Promise.all(modifiedRows.map(row => revertRow(row)));
    await fetchRows(); // Refresh to get latest state
  }, [rows, revertRow, fetchRows]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return {
    rows,
    columns,
    loading,
    error,
    modifiedCount,
    invalidCount,
    fetchRows,
    saveRow,
    revertRow,
    saveAll,
    revertAll,
  };
}
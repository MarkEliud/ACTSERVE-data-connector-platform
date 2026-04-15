// frontend/src/lib/store/gridStore.ts
import { create } from 'zustand';
import { DataRow, DataSet } from '@/lib/api/grid';

interface GridState {
  dataset: DataSet | null;
  rows: DataRow[];
  columns: string[];
  loading: boolean;
  error: string | null;
  modifiedCount: number;
  invalidCount: number;
  setDataset: (dataset: DataSet | null) => void;
  setRows: (rows: DataRow[]) => void;
  setColumns: (columns: string[]) => void;
  updateRow: (rowId: number, data: Partial<DataRow>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGridStore = create<GridState>((set, get) => ({
  dataset: null,
  rows: [],
  columns: [],
  loading: false,
  error: null,
  modifiedCount: 0,
  invalidCount: 0,

  setDataset: (dataset) => set({ dataset }),
  
  setRows: (rows) => set({ 
    rows,
    modifiedCount: rows.filter(r => r.is_modified).length,
    invalidCount: rows.filter(r => !r.is_valid).length,
  }),
  
  setColumns: (columns) => set({ columns }),
  
  updateRow: (rowId, data) => {
    const rows = get().rows.map(row => 
      row.id === rowId ? { ...row, ...data } : row
    );
    set({
      rows,
      modifiedCount: rows.filter(r => r.is_modified).length,
      invalidCount: rows.filter(r => !r.is_valid).length,
    });
  },
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    dataset: null,
    rows: [],
    columns: [],
    loading: false,
    error: null,
    modifiedCount: 0,
    invalidCount: 0,
  }),
}));
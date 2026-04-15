// frontend/src/types/grid.ts
export interface DataSet {
  id: number;
  name: string;
  extraction_job: number;
  extraction_job_name: string;
  row_count: number;
  modified_count: number;
  invalid_count: number;
  column_count: number;
  columns: string[];
  created_at: string;
  updated_at: string;
}

export interface DataRow {
  id: number;
  dataset: number;
  row_number: number;
  original_data: Record<string, any>;
  current_data: Record<string, any>;
  is_modified: boolean;
  is_valid: boolean;
  validation_errors: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface DataGridState {
  dataset: DataSet | null;
  rows: DataRow[];
  columns: string[];
  currentPage: number;
  pageSize: number;
  totalRows: number;
  filters: DataGridFilters;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  selectedRows: number[];
  modifiedOnly: boolean;
  invalidOnly: boolean;
}

export interface DataGridFilters {
  search?: string;
  columnFilters?: Record<string, string>;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface DataGridUpdatePayload {
  row_id: number;
  field: string;
  value: any;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  code?: string;
}

export interface DataGridExportOptions {
  format: 'csv' | 'json' | 'excel';
  include_modified_only?: boolean;
  include_invalid?: boolean;
  columns?: string[];
  filename?: string;
}
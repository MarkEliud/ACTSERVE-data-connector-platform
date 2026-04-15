// frontend/src/types/extraction.ts
export interface ExtractionJob {
  id: number;
  name: string;
  description?: string;
  connection: number;
  connection_name: string;
  connection_details?: Connection;
  status: ExtractionStatus;
  table_name?: string;
  schema_name?: string;
  columns?: string[];
  query?: string;
  filters?: Record<string, any>;
  batch_size: number;
  total_rows: number;
  total_batches: number;
  completed_batches: number;
  progress_percentage: number;
  error_message?: string;
  created_by?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string | null;
  updated_at: string;
}

export type ExtractionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExtractionBatch {
  id: number;
  job: number;
  batch_number: number;
  status: BatchStatus;
  start_row: number;
  end_row: number;
  row_count: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string | null;
}

export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface ExtractionStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  running_jobs: number;
  total_rows_extracted: number;
  avg_extraction_time_ms: number;
  jobs_by_day: Array<{ date: string; count: number }>;
}

export interface ExtractionFilterParams {
  page?: number;
  page_size?: number;
  status?: ExtractionStatus;
  connection?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ExtractionCreateRequest {
  name: string;
  description?: string;
  connection: number;
  table_name?: string;
  schema_name?: string;
  columns?: string[];
  query?: string;
  filters?: Record<string, any>;
  batch_size?: number;
}
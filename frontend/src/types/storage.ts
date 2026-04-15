// frontend/src/types/storage.ts
export interface FileExport {
  id: number;
  extraction_job: number;
  job_name: string;
  file_format: 'json' | 'csv' | 'excel';
  file_name: string;
  file_path: string;
  file_size: number;
  is_public: boolean;
  can_access: boolean;
  download_count: number;
  created_by: number;
  created_at: string;
  expires_at?: string;
  download_url: string;
}

export interface ExportCreateRequest {
  job_id: number;
  file_format: 'json' | 'csv' | 'excel';
  include_modified_only?: boolean;
  include_invalid?: boolean;
  columns?: string[];
  is_public?: boolean;
  expires_in_days?: number;
}

export interface StorageStats {
  total_files: number;
  total_size: number;
  files_by_format: Record<string, number>;
  downloads_today: number;
  oldest_file: string;
  newest_file: string;
}

export interface StorageQuota {
  used_bytes: number;
  max_bytes: number;
  used_percentage: number;
  remaining_bytes: number;
}

export interface FilePreview {
  id: number;
  file_name: string;
  file_format: string;
  preview_data?: any;
  preview_rows?: number;
  total_rows?: number;
  columns?: string[];
}

export interface ShareLink {
  id: number;
  file_id: number;
  token: string;
  url: string;
  created_at: string;
  expires_at: string;
  max_downloads?: number;
  downloads_count: number;
  is_active: boolean;
}

export interface FileFilterParams {
  page?: number;
  page_size?: number;
  job_id?: number;
  file_format?: string;
  search?: string;
  is_public?: boolean;
  date_from?: string;
  date_to?: string;
}
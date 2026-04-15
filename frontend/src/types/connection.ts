// frontend/src/types/connection.ts
export interface Connection {
  id: number;
  name: string;
  description?: string;
  database_type: DatabaseType;
  database_type_display: string;
  host: string;
  port: number;
  database_name: string;
  user: string;
  password?: string;
  options?: ConnectionOptions;
  connection_timeout: number;
  max_connections: number;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'clickhouse';

export interface ConnectionOptions {
  ssl?: boolean;
  ssl_mode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  charset?: string;
  timezone?: string;
  [key: string]: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  response_time_ms?: number;
  server_version?: string;
  error?: string;
}

export interface ConnectionStats {
  id: number;
  name: string;
  total_extractions: number;
  last_extraction_at?: string;
  success_rate: number;
  avg_extraction_time_ms?: number;
}

export interface ConnectionFormData {
  name: string;
  description?: string;
  database_type: DatabaseType;
  host: string;
  port: number;
  database_name: string;
  user: string;
  password: string;
  connection_timeout: number;
  max_connections: number;
  is_active: boolean;
  options?: ConnectionOptions;
}
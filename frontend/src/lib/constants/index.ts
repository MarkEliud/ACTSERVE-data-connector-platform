// frontend/src/lib/constants/index.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export const DATABASE_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, icon: '🐘' },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306, icon: '🐬' },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017, icon: '🍃' },
  { value: 'clickhouse', label: 'ClickHouse', defaultPort: 8123, icon: '🏠' },
] as const;

export const EXTRACTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const EXTRACTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const EXTRACTION_STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'secondary',
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

export const BATCH_SIZES = {
  MIN: 100,
  DEFAULT: 1000,
  MAX: 100000,
};

export const FILE_FORMATS = [
  { value: 'csv', label: 'CSV', mimeType: 'text/csv' },
  { value: 'json', label: 'JSON', mimeType: 'application/json' },
] as const;

export const STORAGE_KEYS = {
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LANGUAGE: 'language',
} as const;
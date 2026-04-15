// frontend/src/lib/api/grid.ts
import apiClient from './client';

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

export interface DataSet {
  id: number;
  name: string;
  extraction_job: number;
  extraction_job_name: string;
  row_count: number;
  modified_count: number;
  invalid_count: number;
  created_at: string;
}

export const gridApi = {
  // Get datasets
  getDatasets: async (params?: {
    extraction_job?: number;
    page?: number;
    page_size?: number;
  }) => {
    const response = await apiClient.get('/data-grid/datasets/', { params });
    return response.data;
  },

  // Get dataset
  getDataset: async (id: number) => {
    const response = await apiClient.get(`/data-grid/datasets/${id}/`);
    return response.data;
  },

  // Get rows for dataset
  getRows: async (params: {
    dataset: number;
    page?: number;
    page_size?: number;
    modified_only?: boolean;
    invalid_only?: boolean;
    search?: string;
  }) => {
    const response = await apiClient.get('/data-grid/rows/', { params });
    return response.data;
  },

  // Update row
  updateRow: async (id: number, data: { current_data: Record<string, any> }) => {
    const response = await apiClient.patch(`/data-grid/rows/${id}/`, data);
    return response.data;
  },

  // Revert row
  revertRow: async (id: number) => {
    const response = await apiClient.post(`/data-grid/rows/${id}/revert/`);
    return response.data;
  },

  // Validate all rows
  validateAll: async (datasetId: number) => {
    const response = await apiClient.post(`/data-grid/datasets/${datasetId}/validate/`);
    return response.data;
  },
};
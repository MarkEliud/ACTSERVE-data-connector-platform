// frontend/src/lib/api/extraction.ts
import apiClient from './client';

export interface ExtractionJob {
  id: number;
  name: string;
  description?: string;
  connection: number;
  connection_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  table_name?: string;
  schema_name?: string;
  columns?: string[];
  query?: string;
  batch_size: number;
  total_rows: number;
  total_batches: number;
  progress_percentage: number;
  created_at: string;
  completed_at: string | null;
  error_message?: string;
}

export interface ExtractionBatch {
  id: number;
  job: number;
  batch_number: number;
  status: string;
  row_count: number;
  error_message?: string;
  created_at: string;
  completed_at: string | null;
}

export const extractionApi = {
  // Get extraction jobs
  getJobs: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    connection?: number;
  }) => {
    const response = await apiClient.get('/extraction/jobs/', { params });
    return response.data;
  },

  // Get single job
  getJob: async (id: number) => {
    const response = await apiClient.get(`/extraction/jobs/${id}/`);
    return response.data;
  },

  // Create extraction job
  createJob: async (data: Partial<ExtractionJob>) => {
    const response = await apiClient.post('/extraction/jobs/', data);
    return response.data;
  },

  // Update extraction job
  updateJob: async (id: number, data: Partial<ExtractionJob>) => {
    const response = await apiClient.put(`/extraction/jobs/${id}/`, data);
    return response.data;
  },

  // Delete extraction job
  deleteJob: async (id: number) => {
    const response = await apiClient.delete(`/extraction/jobs/${id}/`);
    return response.data;
  },

  // Start extraction
  startJob: async (id: number) => {
    const response = await apiClient.post(`/extraction/jobs/${id}/start/`);
    return response.data;
  },

  // Cancel extraction
  cancelJob: async (id: number) => {
    const response = await apiClient.post(`/extraction/jobs/${id}/cancel/`);
    return response.data;
  },

  // Get batches for job
  getBatches: async (jobId: number, params?: { page?: number; page_size?: number }) => {
    const response = await apiClient.get('/extraction/batches/', {
      params: { job: jobId, ...params },
    });
    return response.data;
  },
};
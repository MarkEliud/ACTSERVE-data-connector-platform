// frontend/src/lib/api/storage.ts
import apiClient from './client';

export interface FileExport {
  id: number;
  job_name: string;
  extraction_job: number;
  file_format: 'json' | 'csv';
  file_name: string;
  file_path: string;
  file_size: number;
  is_public: boolean;
  can_access: boolean;
  created_at: string;
  download_url: string;
}

export const storageApi = {
  // Get exports
  getExports: async (params?: {
    page?: number;
    page_size?: number;
    job_id?: number;
    file_format?: string;
  }) => {
    const response = await apiClient.get('/storage/exports/', { params });
    return response.data;
  },

  // Create export
  createExport: async (data: {
    job_id: number;
    file_format: 'json' | 'csv';
    include_modified_only?: boolean;
    include_invalid?: boolean;
  }) => {
    const response = await apiClient.post('/storage/exports/', data);
    return response.data;
  },

  // Delete export
  deleteExport: async (id: number) => {
    const response = await apiClient.delete(`/storage/exports/${id}/`);
    return response.data;
  },

  // Toggle public status
  togglePublic: async (id: number) => {
    const response = await apiClient.post(`/storage/exports/${id}/toggle_public/`);
    return response.data;
  },

  // Get download URL
  getDownloadUrl: async (id: number) => {
    const response = await apiClient.get(`/storage/exports/${id}/download/`);
    return response.data;
  },
};
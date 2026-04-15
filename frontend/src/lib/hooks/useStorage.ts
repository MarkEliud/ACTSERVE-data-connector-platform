// frontend/src/lib/hooks/useStorage.ts
import { useState, useCallback } from 'react';
import { storageApi, FileExport } from '@/lib/api/storage';
import { useAuth } from './useAuth';

export function useStorage() {
  const { isAuthenticated } = useAuth();
  
  const [files, setFiles] = useState<FileExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFiles = useCallback(async (params?: {
    page?: number;
    pageSize?: number;
    jobId?: number;
    format?: string;
  }) => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await storageApi.getExports({
        page: params?.page || currentPage,
        page_size: params?.pageSize || 20,
        job_id: params?.jobId,
        file_format: params?.format,
      });
      setFiles(response.results || response);
      setTotalCount(response.pagination?.count || 0);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage]);

  const createExport = useCallback(async (data: {
    job_id: number;
    file_format: 'json' | 'csv';
    include_modified_only?: boolean;
    include_invalid?: boolean;
  }) => {
    setError(null);
    try {
      const result = await storageApi.createExport(data);
      await fetchFiles();
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create export');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchFiles]);

  const deleteFile = useCallback(async (id: number) => {
    setError(null);
    try {
      await storageApi.deleteExport(id);
      await fetchFiles();
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete file');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchFiles]);

  const togglePublic = useCallback(async (id: number) => {
    setError(null);
    try {
      const result = await storageApi.togglePublic(id);
      await fetchFiles();
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update file access');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchFiles]);

  const downloadFile = useCallback(async (id: number) => {
    try {
      const { download_url } = await storageApi.getDownloadUrl(id);
      window.open(download_url, '_blank');
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download file');
      return { success: false, error: err.response?.data?.error };
    }
  }, []);

  return {
    files,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchFiles,
    createExport,
    deleteFile,
    togglePublic,
    downloadFile,
  };
}
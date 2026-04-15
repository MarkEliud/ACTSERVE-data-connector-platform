// frontend/src/lib/hooks/useConnections.ts
import { useState, useEffect, useCallback } from 'react';
import { connectionsApi, Connection } from '@/lib/api/connections';
import { useAuth } from './useAuth';

interface UseConnectionsOptions {
  autoFetch?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useConnections(options: UseConnectionsOptions = {}) {
  const { autoFetch = true, page = 1, pageSize = 20, search = '' } = options;
  const { isAuthenticated } = useAuth();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchConnections = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await connectionsApi.getConnections({
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
      });
      setConnections(response.results || response);
      setTotalCount(response.pagination?.count || 0);
      setTotalPages(response.pagination?.total_pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage, pageSize, search]);

  const createConnection = useCallback(async (data: Partial<Connection>) => {
    setError(null);
    try {
      const result = await connectionsApi.createConnection(data);
      await fetchConnections();
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create connection');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchConnections]);

  const updateConnection = useCallback(async (id: number, data: Partial<Connection>) => {
    setError(null);
    try {
      const result = await connectionsApi.updateConnection(id, data);
      await fetchConnections();
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update connection');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchConnections]);

  const deleteConnection = useCallback(async (id: number) => {
    setError(null);
    try {
      await connectionsApi.deleteConnection(id);
      await fetchConnections();
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete connection');
      return { success: false, error: err.response?.data?.error };
    }
  }, [fetchConnections]);

  const testConnection = useCallback(async (data: Partial<Connection>) => {
    setError(null);
    try {
      const result = await connectionsApi.testConnection(data);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error };
    }
  }, []);

  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      fetchConnections();
    }
  }, [autoFetch, isAuthenticated, fetchConnections]);

  return {
    connections,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  };
}
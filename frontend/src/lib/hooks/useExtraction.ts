// frontend/src/lib/hooks/useExtraction.ts
import { useState, useCallback } from 'react';
import { extractionApi, ExtractionJob } from '@/lib/api/extraction';
import { useAuth } from './useAuth';

interface UseExtractionOptions {
  autoFetch?: boolean;
  jobId?: number;
}

export function useExtraction(options: UseExtractionOptions = {}) {
  const { autoFetch = true, jobId } = options;
  const { isAuthenticated } = useAuth();
  
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!isAuthenticated || !jobId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await extractionApi.getJob(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load extraction job');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, jobId]);

  const createJob = useCallback(async (data: Partial<ExtractionJob>) => {
    setError(null);
    try {
      const result = await extractionApi.createJob(data);
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create extraction job');
      return { success: false, error: err.response?.data?.error };
    }
  }, []);

  const startJob = useCallback(async (id: number) => {
    setError(null);
    try {
      const result = await extractionApi.startJob(id);
      if (jobId === id) {
        await fetchJob();
      }
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start extraction');
      return { success: false, error: err.response?.data?.error };
    }
  }, [jobId, fetchJob]);

  const cancelJob = useCallback(async (id: number) => {
    setError(null);
    try {
      const result = await extractionApi.cancelJob(id);
      if (jobId === id) {
        await fetchJob();
      }
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel extraction');
      return { success: false, error: err.response?.data?.error };
    }
  }, [jobId, fetchJob]);

  useEffect(() => {
    if (autoFetch && isAuthenticated && jobId) {
      fetchJob();
    }
  }, [autoFetch, isAuthenticated, jobId, fetchJob]);

  return {
    job,
    loading,
    error,
    fetchJob,
    createJob,
    startJob,
    cancelJob,
  };
}
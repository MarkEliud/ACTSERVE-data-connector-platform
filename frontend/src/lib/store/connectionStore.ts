// frontend/src/lib/store/connectionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Connection } from '@/lib/api/connections';

interface ConnectionState {
  connections: Connection[];
  selectedConnection: Connection | null;
  loading: boolean;
  error: string | null;
  lastTested: Record<number, { success: boolean; timestamp: number; responseTime?: number }>;
  
  // Actions
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: number, connection: Partial<Connection>) => void;
  removeConnection: (id: number) => void;
  selectConnection: (connection: Connection | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTestResult: (id: number, success: boolean, responseTime?: number) => void;
  clearTestResults: () => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      selectedConnection: null,
      loading: false,
      error: null,
      lastTested: {},

      setConnections: (connections) => set({ connections }),
      
      addConnection: (connection) => {
        set((state) => ({
          connections: [...state.connections, connection],
        }));
      },
      
      updateConnection: (id, updatedData) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updatedData } : conn
          ),
        }));
      },
      
      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          lastTested: Object.fromEntries(
            Object.entries(state.lastTested).filter(([key]) => parseInt(key) !== id)
          ),
        }));
      },
      
      selectConnection: (connection) => set({ selectedConnection: connection }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setTestResult: (id, success, responseTime) => {
        set((state) => ({
          lastTested: {
            ...state.lastTested,
            [id]: { success, timestamp: Date.now(), responseTime },
          },
        }));
      },
      
      clearTestResults: () => set({ lastTested: {} }),
      
      reset: () => set({
        connections: [],
        selectedConnection: null,
        loading: false,
        error: null,
        lastTested: {},
      }),
    }),
    {
      name: 'connection-storage',
      partialize: (state) => ({
        lastTested: state.lastTested,
      }),
    }
  )
);

// Selectors
export const useActiveConnections = () => {
  const connections = useConnectionStore((state) => state.connections);
  return connections.filter((conn) => conn.is_active);
};

export const useConnectionsByType = (type: string) => {
  const connections = useConnectionStore((state) => state.connections);
  return connections.filter((conn) => conn.database_type === type);
};

export const useConnectionTestResult = (id: number) => {
  const lastTested = useConnectionStore((state) => state.lastTested);
  return lastTested[id];
};
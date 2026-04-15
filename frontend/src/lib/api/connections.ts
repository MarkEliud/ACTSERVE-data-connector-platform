// frontend/src/lib/api/connections.ts
import apiClient from './client';

export interface Connection {
  id: number;
  name: string;
  description?: string;
  database_type: string;
  database_type_display: string;
  host: string;
  port: number;
  database_name: string;
  user: string;
  password?: string;
  options?: Record<string, any>;
  connection_timeout: number;
  max_connections: number;
  is_active: boolean;
  is_public: boolean;
  created_by: number;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  can_edit?: boolean;
  can_delete?: boolean;
  can_toggle_public?: boolean;
}

export const connectionsApi = {
  // Get all connections with pagination
  getConnections: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
  }) => {
    const response = await apiClient.get('/connections/', { params });
    return response.data;
  },

  // Get single connection
  getConnection: async (id: number) => {
    const response = await apiClient.get(`/connections/${id}/`);
    return response.data;
  },
 
  // Create new connection
  createConnection: async (data: Partial<Connection>) => {
    const response = await apiClient.post('/connections/', data);
    return response.data;
  },

  // Update connection
  updateConnection: async (id: number, data: Partial<Connection>) => {
    const response = await apiClient.put(`/connections/${id}/`, data);
    return response.data;
  },

  // Delete connection
  deleteConnection: async (id: number) => {
    const response = await apiClient.delete(`/connections/${id}/`);
    return response.data;
  },

  // Test connection
  testConnection: async (data: Partial<Connection>) => {
    const response = await apiClient.post('/connections/test/', data);
    return response.data;
  },

  // Toggle public/private status
  togglePublic: async (id: number) => {
    const response = await apiClient.patch(`/connections/${id}/toggle_public/`);
    return response.data;
  },
};
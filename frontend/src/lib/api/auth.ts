// frontend/src/lib/api/auth.ts
import apiClient from './client';
import { TOKEN_KEY } from '@/lib/constants';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export const authApi = {
  // Login
  // Login
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Change from '/auth/login/' to '/token/'
    const response = await apiClient.post('/token/', { email, password });
    const { access, refresh } = response.data;
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem('refresh_token', refresh);
    
    // After getting token, fetch user info
    try {
      const userResponse = await apiClient.get('/accounts/users/me/');
      const user = userResponse.data;
      return { access, refresh, user };
    } catch {
      // If user endpoint doesn't exist, return basic user info
      return { 
        access, 
        refresh, 
        user: { 
          id: 0, 
          username: email.split('@')[0], 
          email: email,
          is_active: true,
          is_admin: false,
          created_at: new Date().toISOString()
        } 
      };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('refresh_token');
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },

  // Refresh token
  // Refresh token
  refreshToken: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token');
    // Change from '/auth/refresh/' to '/token/refresh/'
    const response = await apiClient.post('/token/refresh/', { refresh });
    const { access } = response.data;
    localStorage.setItem(TOKEN_KEY, access);
    return access;
  },

  // Register (if applicable)
  register: async (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};
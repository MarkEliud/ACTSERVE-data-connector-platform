// frontend/src/types/user.ts
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_admin: boolean;
  is_staff?: boolean;
  role: 'admin' | 'user' | 'viewer';
  permissions?: string[];
  last_login?: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  default_page_size: number;
  notifications_enabled: boolean;
  email_notifications: boolean;
}

export interface UserProfile {
  user: User;
  stats: {
    total_connections: number;
    total_extractions: number;
    total_exports: number;
    last_active: string;
  };
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  role?: 'admin' | 'user' | 'viewer';
}
// frontend/src/lib/constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  // Connection permissions
  VIEW_CONNECTIONS: 'view_connections',
  CREATE_CONNECTION: 'create_connection',
  EDIT_CONNECTION: 'edit_connection',
  DELETE_CONNECTION: 'delete_connection',
  TEST_CONNECTION: 'test_connection',
  
  // Extraction permissions
  VIEW_EXTRACTIONS: 'view_extractions',
  CREATE_EXTRACTION: 'create_extraction',
  EDIT_EXTRACTION: 'edit_extraction',
  DELETE_EXTRACTION: 'delete_extraction',
  START_EXTRACTION: 'start_extraction',
  CANCEL_EXTRACTION: 'cancel_extraction',
  
  // Data Grid permissions
  VIEW_DATA_GRID: 'view_data_grid',
  EDIT_DATA_GRID: 'edit_data_grid',
  EXPORT_DATA: 'export_data',
  
  // Storage permissions
  VIEW_FILES: 'view_files',
  DOWNLOAD_FILES: 'download_files',
  DELETE_FILES: 'delete_files',
  SHARE_FILES: 'share_files',
  
  // User management
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  
  // System permissions
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  user: [
    PERMISSIONS.VIEW_CONNECTIONS,
    PERMISSIONS.CREATE_CONNECTION,
    PERMISSIONS.EDIT_CONNECTION,
    PERMISSIONS.DELETE_CONNECTION,
    PERMISSIONS.TEST_CONNECTION,
    PERMISSIONS.VIEW_EXTRACTIONS,
    PERMISSIONS.CREATE_EXTRACTION,
    PERMISSIONS.EDIT_EXTRACTION,
    PERMISSIONS.DELETE_EXTRACTION,
    PERMISSIONS.START_EXTRACTION,
    PERMISSIONS.CANCEL_EXTRACTION,
    PERMISSIONS.VIEW_DATA_GRID,
    PERMISSIONS.EDIT_DATA_GRID,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.DOWNLOAD_FILES,
    PERMISSIONS.SHARE_FILES,
  ],
  viewer: [
    PERMISSIONS.VIEW_CONNECTIONS,
    PERMISSIONS.VIEW_EXTRACTIONS,
    PERMISSIONS.VIEW_DATA_GRID,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.DOWNLOAD_FILES,
  ],
};

export const hasPermission = (role: Role | undefined, permission: Permission): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

export const isAdmin = (role: Role | undefined): boolean => {
  return role === ROLES.ADMIN;
};

export const isViewer = (role: Role | undefined): boolean => {
  return role === ROLES.VIEWER;
};
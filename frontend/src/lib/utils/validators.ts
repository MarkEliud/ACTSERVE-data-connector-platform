// frontend/src/lib/utils/validators.ts
export const validators = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password strength validation
  validatePassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Database name validation
  isValidDatabaseName: (name: string): boolean => {
    const dbNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return dbNameRegex.test(name);
  },

  // Table name validation
  isValidTableName: (name: string): boolean => {
    const tableNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return tableNameRegex.test(name);
  },

  // SQL injection prevention - basic check
  hasSQLInjectionRisk: (query: string): boolean => {
    const dangerousPatterns = [
      /;\s*DROP\s+/i,
      /;\s*DELETE\s+/i,
      /;\s*TRUNCATE\s+/i,
      /;\s*UPDATE\s+/i,
      /;\s*INSERT\s+/i,
      /--/,
      /\/\*/,
    ];
    return dangerousPatterns.some(pattern => pattern.test(query));
  },

  // Port validation
  isValidPort: (port: number): boolean => {
    return port >= 1 && port <= 65535;
  },

  // Hostname validation
  isValidHostname: (hostname: string): boolean => {
    const hostnameRegex = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/;
    return hostnameRegex.test(hostname) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
  },

  // JSON validation
  isValidJSON: (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
};
// frontend/src/lib/utils/formatters.ts
export const formatters = {
  // Format date
  formatDate: (date: string | Date | null, format: 'short' | 'long' | 'relative' = 'short'): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (format === 'relative') {
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    }
    
    if (format === 'long') {
      return d.toLocaleString();
    }
    
    return d.toLocaleDateString();
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  // Format number with commas
  formatNumber: (num: number): string => {
    return num.toLocaleString();
  },

  // Format percentage
  formatPercent: (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  },

  // Format duration in seconds to readable string
  formatDuration: (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  },

  // Truncate text
  truncate: (text: string, length: number = 50, suffix: string = '...'): string => {
    if (text.length <= length) return text;
    return text.substring(0, length) + suffix;
  },

  // Format JSON for display
  formatJSON: (data: any, indent: number = 2): string => {
    try {
      return JSON.stringify(data, null, indent);
    } catch {
      return String(data);
    }
  },
};
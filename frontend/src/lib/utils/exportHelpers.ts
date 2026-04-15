// frontend/src/lib/utils/exportHelpers.ts
import { saveAs } from 'file-saver';

export interface ExportOptions {
  filename?: string;
  format: 'csv' | 'json';
  includeHeaders?: boolean;
  delimiter?: string;
}

export const exportHelpers = {
  // Export data to CSV
  exportToCSV: (data: any[], options: ExportOptions = { format: 'csv' }) => {
    const {
      filename = `export_${Date.now()}`,
      includeHeaders = true,
      delimiter = ',',
    } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Build CSV rows
    const rows: string[] = [];
    
    if (includeHeaders) {
      rows.push(headers.map(h => `"${h}"`).join(delimiter));
    }
    
    for (const item of data) {
      const row = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(delimiter);
      rows.push(row);
    }
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  },

  // Export data to JSON
  exportToJSON: (data: any[], options: ExportOptions = { format: 'json' }) => {
    const { filename = `export_${Date.now()}` } = options;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  },

  // Export data to Excel (using simple CSV with .xlsx extension)
  exportToExcel: (data: any[], options: ExportOptions = { format: 'csv' }) => {
    const { filename = `export_${Date.now()}` } = options;
    exportHelpers.exportToCSV(data, { ...options, filename: `${filename}.xlsx` });
  },

  // Download file from URL
  downloadFile: async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadName = filename || url.split('/').pop() || 'download';
      saveAs(blob, downloadName);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  },

  // Generate preview of data
  generatePreview: (data: any[], maxRows: number = 10): any[] => {
    return data.slice(0, maxRows);
  },
};
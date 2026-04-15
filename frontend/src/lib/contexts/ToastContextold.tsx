// frontend/src/lib/contexts/ToastContext.tsx
'use client';

import { createContext, useState, useCallback, useContext } from 'react';

interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, variant?: Toast['variant'], title?: string) => void;
  hideToast: (id: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: Toast['variant'] = 'info', title?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, variant, title }]);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title);
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'danger', title);
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title);
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title);
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        hideToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
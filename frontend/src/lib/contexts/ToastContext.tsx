'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/common/Toast';

interface ToastMessage {
  id: string;
  message: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastMessage['variant'], title?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, variant: ToastMessage['variant'] = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, variant, title }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          show={true}
          onClose={() => hideToast(toast.id)}
          message={toast.message}
          variant={toast.variant}
          title={toast.title}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
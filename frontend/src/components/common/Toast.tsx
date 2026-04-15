'use client';

import { Toast as BootstrapToast, ToastContainer } from 'react-bootstrap';
import { useEffect } from 'react';
import { PiWarningCircleThin } from "react-icons/pi";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

interface ToastProps {
  show: boolean;
  onClose: () => void;
  message: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
  delay?: number;
}

export default function Toast({
  show,
  onClose,
  message,
  variant = 'info',
  title,
  delay = 5000,
}: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, delay);
      return () => clearTimeout(timer);
    }
  }, [show, onClose, delay]);

  const getIcon = () => {
    switch (variant) {
      case 'success': return <FaCheckCircle size={20} />;
      case 'danger': return <FaExclamationCircle size={20} />;
      case 'warning': return <PiWarningCircleThin size={20} />;
      default: return <FaInfoCircle size={20} />;
    }
  };

  const getHeaderClass = () => {
    switch (variant) {
      case 'success': return '#46b754';
      case 'danger': return '#dc2626';
      case 'warning': return '#f89734';
      default: return '#244a4a';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (variant) {
      case 'success': return 'Success';
      case 'danger': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Information';
    }
  };

  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
      <BootstrapToast 
        show={show} 
        onClose={onClose} 
        delay={delay} 
        autohide
        className="fade-in"
        style={{ minWidth: '300px' }}
      >
        <BootstrapToast.Header 
          style={{ 
            backgroundColor: getHeaderClass(), 
            color: 'white',
            borderRadius: '8px 8px 0 0'
          }}
          className="border-0"
        >
          <div className="d-flex align-items-center gap-2">
            {getIcon()}
            <strong className="me-auto">{getTitle()}</strong>
          </div>
        </BootstrapToast.Header>
        <BootstrapToast.Body style={{ padding: '1rem' }}>
          {message}
        </BootstrapToast.Body>
      </BootstrapToast>
    </ToastContainer>
  );
}
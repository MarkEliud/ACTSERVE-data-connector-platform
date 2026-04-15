import { Modal as BootstrapModal, Button } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm?: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  loading?: boolean;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

export default function Modal({
  show,
  onHide,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  type = 'info',
}: ModalProps) {
  const getHeaderClass = () => {
    switch (type) {
      case 'danger': return '#dc2626';
      case 'warning': return '#f89734';
      case 'success': return '#46b754';
      default: return '#244a4a';
    }
  };

  return (
    <BootstrapModal show={show} onHide={onHide} centered className="fade-in">
      <BootstrapModal.Header 
        style={{ 
          backgroundColor: getHeaderClass(),
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}
        className="border-0"
      >
        <BootstrapModal.Title className="d-flex align-items-center gap-2">
          {type === 'warning' && <FaExclamationTriangle />}
          {title}
        </BootstrapModal.Title>
      </BootstrapModal.Header>
      <BootstrapModal.Body style={{ padding: '1.5rem' }}>
        {children}
      </BootstrapModal.Body>
      <BootstrapModal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {cancelText}
        </Button>
        {onConfirm && (
          <Button 
            variant={confirmVariant} 
            onClick={onConfirm} 
            disabled={loading}
            style={{
              backgroundColor: confirmVariant === 'primary' ? '#46b754' : undefined,
              borderColor: confirmVariant === 'primary' ? '#46b754' : undefined,
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : confirmText}
          </Button>
        )}
      </BootstrapModal.Footer>
    </BootstrapModal>
  );
}
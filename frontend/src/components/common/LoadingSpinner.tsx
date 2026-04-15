import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export default function LoadingSpinner({ message = 'Loading...', size = 'md', fullPage = false }: LoadingSpinnerProps) {
  const spinnerSize = size === 'sm' ? '1rem' : size === 'lg' ? '3rem' : '2rem';

  const content = (
    <div className="text-center fade-in">
      <Spinner 
        animation="border" 
        variant="primary" 
        style={{ width: spinnerSize, height: spinnerSize }} 
      />
      {message && <p className="mt-3 text-muted">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div 
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '60vh' }}
      >
        {content}
      </div>
    );
  }

  return content;
}
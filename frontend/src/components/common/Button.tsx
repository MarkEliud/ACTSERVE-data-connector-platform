// frontend/src/components/common/Button.tsx
import React from 'react';
import { Button as BootstrapButton, Spinner } from 'react-bootstrap';

interface ButtonProps extends React.ComponentProps<typeof BootstrapButton> {
  loading?: boolean;
  loadingText?: string;
}

export default function Button({ children, loading, loadingText, disabled, ...props }: ButtonProps) {
  return (
    <BootstrapButton disabled={disabled || loading} {...props}>
      {loading && <Spinner size="sm" animation="border" className="me-2" />}
      {loading && loadingText ? loadingText : children}
    </BootstrapButton>
  );
}
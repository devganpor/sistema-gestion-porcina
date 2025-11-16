import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Cargando...', 
  size = 'md' 
}) => {
  const sizeStyles = {
    sm: { width: '24px', height: '24px', borderWidth: '2px' },
    md: { width: '40px', height: '40px', borderWidth: '4px' },
    lg: { width: '60px', height: '60px', borderWidth: '6px' }
  };

  return (
    <div className="loading">
      <div 
        className="loading-spinner" 
        style={sizeStyles[size]}
      ></div>
      <p style={{ marginTop: '15px', color: '#6c757d' }}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;
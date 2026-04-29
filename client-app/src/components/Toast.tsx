import React, { useState, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      minWidth: '300px',
      maxWidth: '500px',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out',
      cursor: 'pointer'
    };

    const typeStyles = {
      success: { backgroundColor: '#d4edda', borderLeft: '4px solid #28a745', color: '#155724' },
      error: { backgroundColor: '#f8d7da', borderLeft: '4px solid #dc3545', color: '#721c24' },
      warning: { backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', color: '#856404' },
      info: { backgroundColor: '#d1ecf1', borderLeft: '4px solid #17a2b8', color: '#0c5460' }
    };

    return { ...baseStyles, ...typeStyles[toast.type] };
  };

  const getIcon = () => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[toast.type];
  };

  return (
    <div style={getToastStyles()} onClick={() => onClose(toast.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>{getIcon()}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {toast.title}
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(toast.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '0',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
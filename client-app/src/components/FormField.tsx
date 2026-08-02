import React from 'react';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  step?: string;
  min?: string;
  max?: string;
  icon?: string;
  autoComplete?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  options,
  rows,
  step,
  min,
  max,
  icon
}) => {
  const renderInput = () => {
    const baseProps = {
      className: `form-control ${error ? 'error' : ''}`,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
      },
      placeholder,
      required,
      disabled,
      autoComplete: 'off',
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '12px',
        paddingBottom: '12px',
        width: '100%',
        border: error ? '2px solid #f25961' : '1px solid #ebedf2',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.4',
        transition: 'all 0.3s ease',
        boxSizing: 'border-box' as const
      }
    };

    if (type === 'select' && options) {
      return (
        <select {...baseProps}>
          <option value="">Seleccionar...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          {...baseProps}
          rows={rows || 3}
          style={{ resize: 'vertical' as const, ...baseProps.style }}
        />
      );
    }

    return (
      <input
        {...baseProps}
        type={type}
        step={step}
        min={min}
        max={max}
      />
    );
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {icon && <i className={`fas ${icon}`} style={{ marginRight: '8px' }}></i>}
        {label}
        {required && <span style={{ color: '#f25961', marginLeft: '4px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {renderInput()}
      </div>
      {error && (
        <small style={{ color: '#f25961', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '4px' }}></i>
          {error}
        </small>
      )}
    </div>
  );
};

export default FormField;
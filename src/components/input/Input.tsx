import React from 'react';
import './Input.css';
import { IconX } from '@tabler/icons-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  color?: 'primary' | 'blue' | 'red' | 'purple';
  error?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  predicate?: (text: string) => boolean;
  predicateText?: string;
  isPassword?: boolean;
  value?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  color = 'primary',
  error,
  disabled = false,
  onValueChange,
  predicate = () => true,
  predicateText = 'Input does not satisfy the requirements',
  isPassword = false,
  value,
  className,
  ...props
}) => {
  const [errorText, setErrorText] = React.useState<string>(error || '');

  const isFileInput = props.type === 'file';

  // For file inputs we must not control `value` nor override the parent's `onChange`.
  if (isFileInput) {
    return (
      <div className={`input ${className || ''}`}>
        {label && <span className="input-label">{label}</span>}
        <input {...props} className={`input-inner ${color}`} disabled={disabled} />
        {errorText && (
          <span className="input-label">
            <IconX size={15} className="icon" />
            <span>{errorText}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`input ${className || ''}`}>
      {label && <span className="input-label">{label}</span>}
      <input
        type={isPassword ? 'password' : 'text'}
        {...props}
        className={`input-inner ${color}`}
        disabled={disabled}
        value={value}
        onChange={e => {
          const newValue = e.target.value;

          if (onValueChange) onValueChange(newValue);

          if (!predicate(newValue)) {
            setErrorText(predicateText);
          } else {
            setErrorText(error || '');
          }
        }}
      />
      {errorText && (
        <span className="input-label">
          <IconX size={15} className="icon" />
          <span>{errorText}</span>
        </span>
      )}
    </div>
  );
};

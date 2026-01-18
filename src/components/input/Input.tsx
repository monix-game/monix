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
  className,
  ...props
}) => {
  const [value, setValue] = React.useState<string>('');
  const [errorText, setErrorText] = React.useState<string>(error || '');

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
          setValue(newValue);

          if (onValueChange) onValueChange(newValue);

          if (!predicate(newValue)) {
            setErrorText(predicateText);
          } else {
            setErrorText(error || '');
          }
        }}
      ></input>
      {errorText && (
        <span className="input-label">
          <IconX size={15} className="icon" />
          <span>{errorText}</span>
        </span>
      )}
    </div>
  );
};

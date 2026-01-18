import React from 'react';
import './Select.css';

interface SelectProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({ options, value, onChange, disabled }) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="select"
      disabled={disabled}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

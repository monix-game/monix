import React from 'react';
import './Select.css';

interface SelectProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({ options, value, onChange }) => {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="select">
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

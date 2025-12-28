import React from 'react'
import './Select.css'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  options: SelectOption[]
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  options,
  className,
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random()}`

  return (
    <div className={`select-wrapper ${fullWidth ? 'full-width' : ''}`}>
      {label && <label htmlFor={selectId} className="select-label">{label}</label>}
      <select
        id={selectId}
        className={`select ${error ? 'select-error' : ''} ${className || ''}`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-error-message">{error}</span>}
      {helperText && !error && <span className="select-helper-text">{helperText}</span>}
    </div>
  )
}

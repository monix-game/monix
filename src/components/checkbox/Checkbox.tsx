import React from 'react'
import './Checkbox.css'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  id,
  className,
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random()}`

  return (
    <div className={`checkbox-wrapper ${error ? 'has-error' : ''}`}>
      <input
        id={checkboxId}
        type="checkbox"
        className={`checkbox ${className || ''}`}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className="checkbox-label">
          {label}
        </label>
      )}
      {error && <span className="checkbox-error-message">{error}</span>}
    </div>
  )
}

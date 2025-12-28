import React from 'react'
import './Textarea.css'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  className,
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random()}`

  return (
    <div className={`textarea-wrapper ${fullWidth ? 'full-width' : ''}`}>
      {label && <label htmlFor={textareaId} className="textarea-label">{label}</label>}
      <textarea
        id={textareaId}
        className={`textarea ${error ? 'textarea-error' : ''} ${className || ''}`}
        {...props}
      />
      {error && <span className="textarea-error-message">{error}</span>}
      {helperText && !error && <span className="textarea-helper-text">{helperText}</span>}
    </div>
  )
}

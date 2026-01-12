import React from 'react'
import './Input.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  disabled?: boolean;
  predicate?: (text: string) => boolean;
  errorText?: string;
  isPassword?: boolean;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  disabled = false,
  predicate = () => true,
  errorText = "Input does not satisfy the requirements",
  isPassword,
  className,
  ...props
}) => {
  return (
    <div
      className={`input ${className || ''}`}
    >
      {label && <span className="input-label">{label}</span>}
      <input type={isPassword ? "password" : "text"} {...props} className="input-inner" disabled={disabled} ></input>
      {error && <span className="input-label">{error}</span>}
    </div>
  )
}

import React from 'react'
import './Button.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="spinner"></span> : children}
    </button>
  )
}

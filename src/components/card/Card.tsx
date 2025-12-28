import React from 'react'
import './Card.css'

interface CardProps {
  children: React.ReactNode
  title?: string
  footer?: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  footer,
  className
}) => {
  return (
    <div className={`card ${className || ''}`}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-content">
        {children}
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}

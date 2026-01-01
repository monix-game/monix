import React from 'react'
import './Resource.css'

interface ResourceProps {
  icon: string,
  name: string,
  quantity: number,
  unit: string,
  value: number,
  iconWidth?: number
}

export const Resource: React.FC<ResourceProps> = ({
  icon,
  name,
  quantity,
  unit,
  value,
  iconWidth = 50
}) => {
  let isApproximate = false
  if (parseFloat(value.toFixed(2)) !== value) {
    isApproximate = true
  }

  return (
    <div className="resource">
      <img src={icon} alt={name} width={iconWidth} />
      <span className="resource-name">{name}</span>
      <div className="resource-amount">
        <span className="resource-quantity">{quantity}</span>
        <span className="resource-unit">{unit}</span>
      </div>
      <div className="resource-value">
        <small>VALUE</small>
        <span>{isApproximate ? `~${value.toFixed(2)}` : `${value.toFixed(2)}`}</span>
      </div>
    </div>
  )
}

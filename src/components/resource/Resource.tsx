import React from 'react'
import './Resource.css'
import type { ResourceInfo } from "../../resources";
import { getPrice, getQuantity } from '../../helpers/resource';

interface ResourceProps {
  info: ResourceInfo
}

export const Resource: React.FC<ResourceProps> = ({
  info,
  ...props
}) => {
  const quantity = getQuantity(info)!
  const value = getPrice(info)! * quantity

  return (
    <div className="resource" {...props}>
      <div className="resource-info">
        <img src={info.icon} alt={info.name} style={{ width: '30px' }} />
        <span className="resource-name">{info.name}</span>
      </div>
      <div className="resource-amount">
        <span className="resource-quantity">{quantity}</span>
        <span className="resource-unit">{info.unit}</span>
      </div>
      <div className="resource-value">
        <small>VALUE</small>
        <span>${value.toFixed(2)}</span>
      </div>
    </div>
  )
}

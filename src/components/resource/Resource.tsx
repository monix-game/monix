import React from 'react'
import './Resource.css'
import type { ResourceInfo } from "../../resources";
import { getPrice, getQuantity } from '../../helpers/resource';
import { EmojiText } from '../EmojiText';

interface ResourceProps {
  info: ResourceInfo
}

export const Resource: React.FC<ResourceProps> = ({
  info,
  ...props
}) => {
  const quantity = getQuantity(info)!
  const value = getPrice(info)! * quantity

  let unit = info.unit
  if (unit.endsWith('s') && quantity == 1) {
    unit = unit.slice(0, -1)
  }

  return (
    <div className="resource" {...props}>
      <div className="resource-info">
        <span className="resource-icon"><EmojiText>{info.icon}</EmojiText></span>
        <span className="resource-name">{info.name}</span>
      </div>
      <div className="resource-amount">
        <span className="resource-quantity">{quantity}</span>
        <span className="resource-unit">{unit}</span>
      </div>
      <div className="resource-value">
        <small>VALUE</small>
        <span>${value.toFixed(2)}</span>
      </div>
    </div>
  )
}

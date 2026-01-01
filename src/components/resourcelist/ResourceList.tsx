import React from 'react'
import './ResourceList.css'
import { resources } from '../../resources'
import { Resource } from '../resource/Resource'
import { getPrice, getQuantity } from '../../helpers/resource';

export const ResourceList: React.FC = () => {
  // Sort resources by value
  const resourcesCopy = [...resources];

  resourcesCopy.sort((a, b) => {
    const valueA = getPrice(a)! * getQuantity(a)!
    const valueB = getPrice(b)! * getQuantity(b)!
    return valueB - valueA
  })

  return (
    <div className="resource-list">
      {resourcesCopy.map((resource, index) => (
        <Resource key={index} info={resource} />
      ))}
    </div>
  )
}

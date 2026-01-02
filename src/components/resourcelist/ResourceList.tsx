import React, { useEffect } from 'react'
import './ResourceList.css'
import { resources } from '../../../server/common/resources'
import { Resource } from '../resource/Resource'
import { getQuantity } from '../../helpers/resource';
import { getPrices } from '../../helpers/market';

interface ResourceListProps {
  isStatic?: boolean;
}

export const ResourceList: React.FC<ResourceListProps> = ({
  isStatic = false
}) => {
  const [sortedResources, setSortedResources] = React.useState<typeof resources>(resources);
  const [resourceValues, setResourceValues] = React.useState<{ [key: string]: number }>({});

  useEffect(() => {
    const updateResource = async (noSort = false) => {
      const resourcesCopy = [...resources];

      const allPrices = await getPrices();

      // Calculate values for each resource
      const resourcesWithValues = await Promise.all(
        resourcesCopy.map(async (resource) => ({
          resource,
          value: allPrices[resource.id] * getQuantity(resource.id)!
        }))
      );

      // Sort by value descending
      resourcesWithValues.sort((a, b) => b.value - a.value);

      // Extract sorted resources
      if (!noSort) setSortedResources(resourcesWithValues.map(item => item.resource));

      // Update resource values state
      const valuesMap: { [key: string]: number } = {};
      resourcesWithValues.forEach(item => {
        valuesMap[item.resource.id] = item.value;
      });
      setResourceValues(valuesMap);
    };

    updateResource();

    const interval = setInterval(() => {
      updateResource(isStatic)
    }, 1000);
    return () => clearInterval(interval);
  }, [isStatic]);

  return (
    <div className="resource-list">
      {sortedResources.map((resource, index) => (
        <Resource key={index} info={resource} value={resourceValues[resource.id] || 0} />
      ))}
    </div>
  )
}

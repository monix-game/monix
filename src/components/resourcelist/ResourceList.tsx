import React, { useEffect } from 'react';
import './ResourceList.css';
import { resources, type ResourceInfo } from '../../../server/common/resources';
import { Resource } from '../resource/Resource';
import { getResourceQuantity } from '../../helpers/resource';
import { getPrices } from '../../helpers/market';

interface ResourceListProps {
  isStatic?: boolean;
}

export const ResourceList: React.FC<ResourceListProps> = ({ isStatic = false }) => {
  const [hydrated, setHydrated] = React.useState(false);
  const [sortedResources, setSortedResources] = React.useState<ResourceInfo[]>([]);
  const [resourceValues, setResourceValues] = React.useState<{ [key: string]: number }>({});

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    const updateResource = async (noSort = false) => {
      const resourcesCopy = [...resources];

      // Remove resources with zero quantity
      for (let i = resourcesCopy.length - 1; i >= 0; i--) {
        const qty = await getResourceQuantity(resourcesCopy[i].id);
        if (!qty || qty <= 0) {
          resourcesCopy.splice(i, 1);
        }
      }

      const allPrices = await getPrices();

      // Calculate values for each resource
      const resourcesWithValues = await Promise.all(
        resourcesCopy.map(async resource => ({
          resource,
          value: allPrices[resource.id] * ((await getResourceQuantity(resource.id)) || 0),
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

    const init = async () => {
      await updateResource();
      if (mounted) setHydrated(true);

      intervalId = window.setInterval(async () => {
        await updateResource(isStatic);
      }, 1000);
    };

    void init();

    return () => {
      mounted = false;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [isStatic]);

  return (
    <div className="resource-list">
      {sortedResources.map((resource, index) => (
        // eslint-disable-next-line react-x/no-array-index-key
        <Resource key={index} info={resource} value={resourceValues[resource.id] || 0} />
      ))}

      {!hydrated && <div className="no-resources">Loading...</div>}

      {hydrated && sortedResources.length === 0 && (
        <div className="no-resources">No resources available. Try buying or gathering some!</div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import './ResourceList.css';
import { type ResourceInfo } from '../../../server/common/resources';
import { Resource } from './resource/Resource';
import { Spinner } from '../spinner/Spinner';
import { Input } from '../input/Input';

interface ResourceListProps {
  setMarketModalResource: (resource: ResourceInfo) => void;
  setMarketModalOpen: (open: boolean) => void;
  resourceListHydrated?: boolean;
  sortedResources?: ResourceInfo[];
  resourcePrices?: { [key: string]: number };
}

export const ResourceList: React.FC<ResourceListProps> = ({
  setMarketModalResource,
  setMarketModalOpen,
  resourceListHydrated = false,
  sortedResources = [],
  resourcePrices = {},
}) => {
  const [resourceSearchTerm, setResourceSearchTerm] = useState('');
  const [filteredResources, setFilteredResources] = useState<ResourceInfo[]>(sortedResources);

  useEffect(() => {
    const filterResources = () => {
      const filtered = sortedResources.filter(resource =>
        resource.name.toLowerCase().includes(resourceSearchTerm.toLowerCase())
      );

      // Sort the filtered resources by the closest match to the search term
      filtered.sort((a, b) => {
        const aIndex = a.name.toLowerCase().indexOf(resourceSearchTerm.toLowerCase());
        const bIndex = b.name.toLowerCase().indexOf(resourceSearchTerm.toLowerCase());
        return aIndex - bIndex;
      });

      setFilteredResources(filtered);
    };
    filterResources();
  }, [resourceSearchTerm, sortedResources]);

  return (
    <div className="resource-container">
      <div className="resource-search-bar">
        <Input
          value={resourceSearchTerm}
          onValueChange={value => setResourceSearchTerm(value)}
          placeholder="Search resources..."
          className="resource-search-input"
        />
      </div>
      <div className="resource-list">
        {filteredResources.map((resource, index) => (
          <Resource
            // eslint-disable-next-line react-x/no-array-index-key
            key={index}
            info={resource}
            price={resourcePrices[resource.id] || 0}
            setMarketModalResource={setMarketModalResource}
            setMarketModalOpen={setMarketModalOpen}
          />
        ))}

        {!resourceListHydrated && (
          <div className="no-resources">
            <Spinner size={30}></Spinner>
          </div>
        )}
      </div>
    </div>
  );
};

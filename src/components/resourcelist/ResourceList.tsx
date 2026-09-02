import React, { useEffect, useState } from 'react';
import styles from './ResourceList.module.css';
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
  resourceChanges?: { [key: string]: number };
}

export const ResourceList: React.FC<ResourceListProps> = ({
  setMarketModalResource,
  setMarketModalOpen,
  resourceListHydrated = false,
  sortedResources = [],
  resourcePrices = {},
  resourceChanges = {},
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
    <div className={styles['resource-container']}>
      <div className={styles['resource-search-bar']}>
        <Input
          value={resourceSearchTerm}
          onValueChange={value => setResourceSearchTerm(value)}
          placeholder="Search resources..."
          className={styles['resource-search-input']}
        />
      </div>
      <div className={styles['resource-list']}>
        {filteredResources.map((resource, index) => (
          <Resource
            // eslint-disable-next-line react-x/no-array-index-key
            key={index}
            info={resource}
            price={resourcePrices[resource.id] || 0}
            changePct={resourceChanges[resource.id]}
            setMarketModalResource={setMarketModalResource}
            setMarketModalOpen={setMarketModalOpen}
          />
        ))}

        {!resourceListHydrated && (
          <div className={styles['no-resources']}>
            <Spinner size={30}></Spinner>
          </div>
        )}
      </div>
    </div>
  );
};

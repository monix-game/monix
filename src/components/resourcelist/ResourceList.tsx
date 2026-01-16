import React from 'react';
import './ResourceList.css';
import { type ResourceInfo } from '../../../server/common/resources';
import { Resource } from '../resource/Resource';
import { Spinner } from '../spinner/Spinner';

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
  return (
    <div className="resource-list">
      {sortedResources.map((resource, index) => (
        <Resource
          // eslint-disable-next-line react-x/no-array-index-key
          key={index}
          info={resource}
          price={resourcePrices[resource.id] || 0}
          setMarketModalResource={setMarketModalResource}
          setMarketModalOpen={setMarketModalOpen}
        />
      ))}

      {!resourceListHydrated && <div className="no-resources"><Spinner size={30}></Spinner></div>}

      {resourceListHydrated && sortedResources.length === 0 && (
        <div className="no-resources">No resources available. Try buying or gathering some!</div>
      )}
    </div>
  );
};

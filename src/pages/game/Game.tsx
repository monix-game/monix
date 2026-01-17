import './Game.css';
import { useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import {
  EmojiText,
  ResourceList,
  AnimatedBackground,
  ResourceGraph,
  Button,
  ResourceModal,
  PetsList,
  Settings,
} from '../../components';
import { IconUser } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { getResourceQuantity, getTotalResourceValue } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { getPrices } from '../../helpers/market';
import { smartFormatNumber } from '../../helpers/numbers';

export default function Game() {
  const [totalNetWorth, setTotalNetWorth] = useState<number>(0);
  const [resourcesTotal, setResourcesTotal] = useState<number>(0);
  const [aquariumTotal] = useState<number>(0);
  const [tab, rawSetTab] = useState<
    | 'money'
    | 'resources'
    | 'market'
    | 'fishing'
    | 'pets'
    | 'relics'
    | 'council'
    | 'leaderboard'
    | 'settings'
  >('money');
  const [user, setUser] = useState<IUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoleFormatted, setUserRoleFormatted] = useState<string | null>(null);
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');
  const [marketModalResource, setMarketModalResource] = useState<ResourceInfo | null>(null);
  const [marketModalOpen, setMarketModalOpen] = useState<boolean>(false);
  const [resourceListHydrated, setResourceListHydrated] = useState(false);
  const [sortedResources, setSortedResources] = useState<ResourceInfo[]>([]);
  const [resourcePrices, setResourcePrices] = useState<{ [key: string]: number }>({});
  const [resourceQuantities, setResourceQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    const updateResource = async () => {
      const resourcesCopy = [...resources];

      const fetchedPrices = await getPrices();

      // Get the quantities for all resources
      const quantitiesMap: { [key: string]: number } = {};
      await Promise.all(
        resourcesCopy.map(async resource => {
          const qty = await getResourceQuantity(resource.id);
          quantitiesMap[resource.id] = qty || 0;
        })
      );
      setResourceQuantities(quantitiesMap);

      // Calculate values for each resource
      const resourcesWithValues = resourcesCopy.map(resource => ({
        resource,
        value: fetchedPrices[resource.id] * (quantitiesMap[resource.id] || 0),
      }));

      // Sort by value descending
      resourcesWithValues.sort((a, b) => b.value - a.value);

      // Extract sorted resources
      setSortedResources(resourcesWithValues.map(item => item.resource));

      // Update resource values state
      const pricesMap: { [key: string]: number } = {};
      resourcesWithValues.forEach(item => {
        pricesMap[item.resource.id] = fetchedPrices[item.resource.id];
      });
      setResourcePrices(pricesMap);
    };

    const init = async () => {
      await updateResource();
      if (mounted) setResourceListHydrated(true);

      intervalId = window.setInterval(async () => {
        await updateResource();
      }, 2000);
    };

    void init();

    return () => {
      mounted = false;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`;
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
    rawSetTab(newTab);
  };

  const updateEverything = async () => {
    const totalResources = await getTotalResourceValue();
    const userData = await fetchUser();
    setUser(userData);
    setResourcesTotal(totalResources);
    setTotalNetWorth((userData?.money || 0) + totalResources);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateEverything();

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateFormattedUserRole = (role: string) => {
      let formatted = role.replace('_', ' ').trim();

      // Title case the formatted role
      formatted = formatted
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      setUserRoleFormatted(formatted);
    };

    void fetchUser().then(userData => {
      setUser(userData);

      const role = userData ? userData.role : 'user';

      setUserRole(role);
      updateFormattedUserRole(role);
    });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogoLight} alt="Monix Logo" className="app-logo app-logo-light" />
        <img src={monixLogoDark} alt="Monix Logo" className="app-logo app-logo-dark" />
        <h1 className="app-title">Monix</h1>
        <div className="nav-tabs">
          {(() => {
            const tabs = [
              { key: 'money', label: '💰 Money' },
              { key: 'resources', label: '🪙 Resources' },
              { key: 'market', label: '🏪 Market' },
              { key: 'fishing', label: '🎣 Fishing' },
              { key: 'pets', label: '🐶 Pets' },
              { key: 'relics', label: '🦴 Relics' },
              { key: 'council', label: '🏛️ Council' },
              { key: 'leaderboard', label: '🏆 Leaderboard' },
              { key: 'settings', label: '⚙️ Settings' },
            ] as const;

            const half = Math.ceil(tabs.length / 2);
            const row1 = tabs.slice(0, half);
            const row2 = tabs.slice(half);

            const renderTab = (t: { key: typeof tab; label: string }) => (
              <span
                key={t.key}
                className={tab === t.key ? 'active tab' : 'tab'}
                onClick={() => setTab(t.key)}
              >
                <EmojiText>{t.label}</EmojiText>
              </span>
            );

            return (
              <>
                <div className="nav-row">{row1.map(renderTab)}</div>
                <div className="nav-row">{row2.map(renderTab)}</div>
              </>
            );
          })()}
        </div>
        <div className="spacer" />
        <div className="user-info">
          <div className="username-info">
            <IconUser size={24} />
            <span className="username">{user ? user.username : 'User'}</span>
            {userRole !== null && userRole !== 'user' && (
              <span className={`badge ${userRole}`}>{userRoleFormatted}</span>
            )}
          </div>
          <div className="user-money">
            <EmojiText>💰</EmojiText>{' '}
            <span className="money-amount mono">{smartFormatNumber(user?.money || 0)}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'money' && (
          <div>
            <AnimatedBackground />
            <div className="money-tab-content">
              <h1 className="mono">
                <span>{smartFormatNumber(totalNetWorth)}</span>
              </h1>
              <div className="money-info">
                <span className="money-info-line">
                  <EmojiText>💰 Money:</EmojiText>{' '}
                  <span className="mono">{smartFormatNumber(user?.money || 0)}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>💎 Gems:</EmojiText>{' '}
                  <span className="mono">{smartFormatNumber(0)}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>📈 Resources:</EmojiText>{' '}
                  <span className="mono">{smartFormatNumber(resourcesTotal)}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>🎣 Aquarium:</EmojiText>{' '}
                  <span className="mono">{smartFormatNumber(aquariumTotal)}</span>
                </span>
              </div>
            </div>
          </div>
        )}
        {tab === 'resources' && (
          <div className="tab-content">
            <h2>Resources</h2>
            <ResourceList
              setMarketModalResource={setMarketModalResource}
              setMarketModalOpen={setMarketModalOpen}
              resourceListHydrated={resourceListHydrated}
              sortedResources={sortedResources}
              resourcePrices={resourcePrices}
            />
          </div>
        )}
        {tab === 'market' && (
          <div className="tab-content">
            <h2>Market</h2>
            <Button onClick={() => setTab('resources')}>Choose Resource</Button>
            <ResourceGraph
              resource={getResourceById(marketResourceDetails)!}
              onBuySellClick={() => {
                setMarketModalOpen(true);
                setMarketModalResource(getResourceById(marketResourceDetails)!);
              }}
            />
          </div>
        )}
        {tab === 'fishing' && (
          <div className="tab-content">
            <h2>Fishing Tab</h2>
            <p>Content for Fishing will go here.</p>
          </div>
        )}
        {tab === 'pets' && (
          <div className="tab-content">
            <h2>Pets</h2>
            <PetsList money={user?.money || 0} />
          </div>
        )}
        {tab === 'relics' && (
          <div className="tab-content">
            <h2>Relics Tab</h2>
            <p>Content for Relics will go here.</p>
          </div>
        )}
        {tab === 'council' && (
          <div className="tab-content">
            <h2>Council Tab</h2>
            <p>Content for Council will go here.</p>
          </div>
        )}
        {tab === 'leaderboard' && (
          <div className="tab-content">
            <h2>Leaderboard Tab</h2>
            <p>Content for Leaderboard will go here.</p>
          </div>
        )}
        {tab === 'settings' && (
          <div className="tab-content">
            <Settings user={user!} />
          </div>
        )}
      </main>

      {marketModalResource && (
        <ResourceModal
          resource={marketModalResource}
          quantity={resourceQuantities[marketModalResource.id] || 0}
          resourcePrice={resourcePrices[marketModalResource.id] || 0}
          money={user ? user.money || 0 : 0}
          isOpen={marketModalOpen}
          disableSeeMore={tab === 'market'}
          onClose={() => {
            setMarketModalOpen(false);
            setMarketModalResource(null);
          }}
          onSeeMore={() => {
            setTab('market');
            setMarketResourceDetails(marketModalResource.id);
            setMarketModalOpen(false);
          }}
          onBuySell={() => {
            // Refresh the resource's value and quantity
            void updateEverything();
            const fetchQuantity = async () => {
              const qty = await getResourceQuantity(marketModalResource.id);
              setResourceQuantities(prev => ({
                ...prev,
                [marketModalResource.id]: qty || 0,
              }));
            };
            void fetchQuantity();
          }}
        />
      )}
    </div>
  );
}

import './Game.css';
import { useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import {
  EmojiText,
  ResourceList,
  Checkbox,
  AnimatedBackground,
  Footer,
  ResourceGraph,
  Button,
  ResourceModal,
} from '../../components';
import { IconUser } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { currentTheme } from '../../helpers/theme';
import { getResourceQuantity, getTotalResourceValue } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { getPrices } from '../../helpers/market';

export default function Game() {
  const [moneyShort, setMoneyShort] = useState<string>('0.00');
  const [resourcesTotal, setResourcesTotal] = useState<number>(0);
  const [aquariumTotal] = useState<number>(0);
  const [petsTotal] = useState<number>(0);
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
  const [userRole, setUserRole] = useState<string>('guest');
  const [userRoleFormatted, setUserRoleFormatted] = useState<string>('Guest');
  const [resourceFilterStatic, setResourceFilterStatic] = useState<boolean>(false);
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');
  const [marketModalResource, setMarketModalResource] = useState<ResourceInfo | null>(null);
  const [marketModalOpen, setMarketModalOpen] = useState<boolean>(false);
  const [resourceListHydrated, setResourceListHydrated] = useState(false);
  const [sortedResources, setSortedResources] = useState<ResourceInfo[]>([]);
  const [resourceValues, setResourceValues] = useState<{ [key: string]: number }>({});
  const [resourcePrices, setResourcePrices] = useState<{ [key: string]: number }>({});
  const [resourceQuantities, setResourceQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    const updateResource = async (noSort = false) => {
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
      if (!noSort) setSortedResources(resourcesWithValues.map(item => item.resource));

      // Update resource values state
      const pricesMap: { [key: string]: number } = {};
      resourcesWithValues.forEach(item => {
        pricesMap[item.resource.id] = fetchedPrices[item.resource.id];
      });
      setResourcePrices(pricesMap);
      setResourceValues(
        resourcesWithValues.reduce(
          (acc, item) => {
            acc[item.resource.id] = item.value;
            return acc;
          },
          {} as { [key: string]: number }
        )
      );
    };

    const init = async () => {
      await updateResource();
      if (mounted) setResourceListHydrated(true);

      intervalId = window.setInterval(async () => {
        await updateResource(resourceFilterStatic);
      }, 2000);
    };

    void init();

    return () => {
      mounted = false;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [resourceFilterStatic]);

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`;
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
    rawSetTab(newTab);
  };

  const updateTotalResourcesValue = async () => {
    const totalValue = await getTotalResourceValue();
    setResourcesTotal(totalValue);
  };

  const updateUser = async () => {
    const userData = await fetchUser();
    setUser(userData);

    // Update money short display
    // Format money to two decimal places for under 100k
    // Use K for thousands, M for millions, B for billions, T for trillions, etc
    if (userData) {
      const money = userData.money || 0;
      let formatted = '';
      if (money < 100000) {
        formatted = money.toFixed(2);
      } else if (money < 1000000) {
        formatted = (money / 1000).toFixed(2) + 'K';
      } else if (money < 1000000000) {
        formatted = (money / 1000000).toFixed(2) + 'M';
      } else if (money < 1000000000000) {
        formatted = (money / 1000000000).toFixed(2) + 'B';
      } else {
        formatted = (money / 1000000000000).toFixed(2) + 'T';
      }
      setMoneyShort(formatted);
    } else {
      setMoneyShort('0.00');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateTotalResourcesValue();
    void updateUser();

    const interval = setInterval(async () => {
      await updateTotalResourcesValue();
      await updateUser();
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

      const role = userData
        ? userData.is_admin
          ? 'admin'
          : userData.is_game_mod
            ? 'game-mod'
            : userData.is_social_mod
              ? 'social-mod'
              : userData.is_helper
                ? 'helper'
                : 'user'
        : 'guest';

      setUserRole(role);

      updateFormattedUserRole(role);
    });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <img
          src={currentTheme() === 'dark' ? monixLogoDark : monixLogoLight}
          alt="Monix Logo"
          className="app-logo"
        />
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
          <IconUser size={24} />
          <span className="username">{user ? user.username : 'Guest'}</span>
          {userRole !== 'guest' && <span className={`badge ${userRole}`}>{userRoleFormatted}</span>}
        </div>
      </header>

      <main className="app-main">
        {tab === 'money' && (
          <div>
            <AnimatedBackground />
            <div className="money-tab-content">
              <h1 className="mono">
                <span>${moneyShort}</span>
              </h1>
              <div className="money-info">
                <span className="money-info-line">
                  <EmojiText>📈 Resources:</EmojiText>{' '}
                  <span className="mono">${resourcesTotal}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>🎣 Aquarium:</EmojiText> <span className="mono">${aquariumTotal}</span>
                </span>
                <span className="money-info-line">
                  <EmojiText>🐶 Pets:</EmojiText> <span className="mono">${petsTotal}</span>
                </span>
              </div>
            </div>
          </div>
        )}
        {tab === 'resources' && (
          <div className="tab-content">
            <h2>Resources</h2>
            <Checkbox
              label="Auto-sort"
              checked={!resourceFilterStatic}
              onClick={() => setResourceFilterStatic(!resourceFilterStatic)}
            />
            <ResourceList
              isStatic={resourceFilterStatic}
              setMarketModalResource={setMarketModalResource}
              setMarketModalOpen={setMarketModalOpen}
              resourceListHydrated={resourceListHydrated}
              sortedResources={sortedResources}
              resourceValues={resourceValues}
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
            <h2>Pets Tab</h2>
            <p>Content for Pets will go here.</p>
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
            <h2>Settings Tab</h2>
            <p>Content for Settings will go here.</p>
          </div>
        )}
      </main>

      <Footer fixed={tab !== 'resources'} />

      {marketModalResource && (
        <ResourceModal
          resource={marketModalResource}
          quantity={resourceQuantities[marketModalResource.id] || 0}
          resourcePrice={resourcePrices[marketModalResource.id] || 0}
          money={user ? user.money || 0 : 0}
          isOpen={marketModalOpen}
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
            void updateTotalResourcesValue();
            const fetchQuantity = async () => {
              const qty = await getResourceQuantity(marketModalResource.id);
              setResourceQuantities(prev => ({
                ...prev,
                [marketModalResource.id]: qty || 0,
              }));
              setResourceValues(prev => ({
                ...prev,
                [marketModalResource.id]:
                  (resourcePrices[marketModalResource.id] || 0) * (qty || 0),
              }));
            };
            void fetchQuantity();
          }}
        />
      )}
    </div>
  );
}

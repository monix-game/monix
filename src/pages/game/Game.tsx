import './Game.css';
import { useCallback, useEffect, useState } from 'react';
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
  Leaderboard,
  GemCard,
  Social,
  Modal,
} from '../../components';
import { IconUser } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { getResourceQuantity, getTotalResourceValue } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { getPrices } from '../../helpers/market';
import { formatRemainingTime, smartFormatNumber, titleCase } from '../../helpers/utils';
import { createPaymentSession } from '../../helpers/payments';
import type { IRoom } from '../../../server/common/models/room';
import { getAllRooms } from '../../helpers/social';
import { getCurrentPunishment, isUserBanned } from '../../../server/common/punishx/punishx';
import { getRemainingDuration, type IPunishment } from '../../../server/common/models/punishment';
import { submitAppeal } from '../../helpers/appeals';

export default function Game() {
  // Net worth states
  const [totalNetWorth, setTotalNetWorth] = useState<number>(0);
  const [resourcesTotal, setResourcesTotal] = useState<number>(0);
  const [aquariumTotal] = useState<number>(0);

  // Game states
  const [gameHydrated, setGameHydrated] = useState<boolean>(false);
  const [tab, setTab] = useState<
    | 'money'
    | 'resources'
    | 'market'
    | 'fishing'
    | 'pets'
    | 'relics'
    | 'council'
    | 'social'
    | 'cue'
    | 'leaderboard'
    | 'gems'
    | 'store'
    | 'settings'
    | 'jail'
    | 'appeals'
  >('money');
  const [banned, setBanned] = useState<boolean>(false);

  const setTabTo = useCallback(
    (newTab: typeof tab) => {
      if (!gameHydrated) return;

      document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
      setTab(newTab);
    },
    [gameHydrated, setTab]
  );

  // User states
  const [user, setUser] = useState<IUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPunishment, setCurrentPunishment] = useState<IPunishment | null>(null);

  // Market states
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');
  const [marketModalResource, setMarketModalResource] = useState<ResourceInfo | null>(null);
  const [marketModalOpen, setMarketModalOpen] = useState<boolean>(false);

  // Resource list states
  const [resourceListHydrated, setResourceListHydrated] = useState(false);
  const [sortedResources, setSortedResources] = useState<ResourceInfo[]>([]);
  const [resourcePrices, setResourcePrices] = useState<{ [key: string]: number }>({});
  const [resourceQuantities, setResourceQuantities] = useState<{ [key: string]: number }>({});

  // Social states
  const [socialRoom, setSocialRoom] = useState<string>('general');
  const [socialRooms, setSocialRooms] = useState<IRoom[]>([]);

  // Appeal states
  const [appealModalOpen, setAppealModalOpen] = useState<boolean>(false);
  const [appealModalContent, setAppealModalContent] = useState<string>('');

  const updateEverything = useCallback(async () => {
    const jailTabs = ['jail', 'settings', 'appeals'];

    const userData = await fetchUser();
    if (!userData) globalThis.location.href = '/auth/login';

    setUser(userData);
    setUserRole(userData ? userData.role : 'user');

    if (isUserBanned(userData!)) {
      setBanned(true);
      setCurrentPunishment(getCurrentPunishment(userData!));
      if (!jailTabs.includes(tab)) setTabTo('jail');
      return;
    } else if (banned) {
      setBanned(false);
      setTabTo('money');
    }

    const totalResources = await getTotalResourceValue();
    setResourcesTotal(totalResources);
    setTotalNetWorth((userData?.money || 0) + totalResources);

    const socialRooms = await getAllRooms();
    setSocialRooms(socialRooms);
  }, [tab, setTabTo, banned]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateEverything().then(() => setGameHydrated(true));

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateEverything]);

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    const updateResource = async () => {
      if (banned) return;

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

      intervalId = setInterval(async () => {
        await updateResource();
      }, 2000);
    };

    void init();

    return () => {
      mounted = false;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [banned]);

  const submitAppealClick = async () => {
    if (appealModalContent.trim().length === 0) {
      return;
    }

    const resp = await submitAppeal(currentPunishment!.uuid, appealModalContent.trim());
    if (resp) {
      setAppealModalOpen(false);
      setAppealModalContent('');
    }
  };

  return (
    <>
      <div className="app-container">
        <header className="app-header">
          <img src={monixLogoLight} alt="Monix Logo" className="app-logo app-logo-light" />
          <img src={monixLogoDark} alt="Monix Logo" className="app-logo app-logo-dark" />
          <h1 className="app-title">Monix</h1>
          <div className="nav-tabs">
            {(() => {
              const noOfRows = banned ? 1 : 2;

              const tabs = banned
                ? ([
                    { key: 'jail', label: '🚓 Jail' },
                    { key: 'appeals', label: '📝 Appeals' },
                    { key: 'settings', label: '⚙️ Settings' },
                  ] as const)
                : ([
                    { key: 'money', label: '💰 Money' },
                    { key: 'resources', label: '🪙 Resources' },
                    { key: 'market', label: '🏪 Market' },
                    { key: 'fishing', label: '🎣 Fishing' },
                    { key: 'pets', label: '🐶 Pets' },
                    { key: 'relics', label: '🦴 Relics' },
                    { key: 'council', label: '🏛️ Council' },
                    { key: 'social', label: '💬 Social' },
                    { key: 'cue', label: '🔴 Cue' },
                    { key: 'leaderboard', label: '🏆 Leaderboard' },
                    { key: 'gems', label: '💎 Gems' },
                    { key: 'store', label: '🏬 Store' },
                    { key: 'settings', label: '⚙️ Settings' },
                  ] as const);

              const half = Math.ceil(tabs.length / noOfRows);
              const rows = [];
              for (let i = 0; i < noOfRows; i++) {
                rows.push(tabs.slice(i * half, i * half + half));
              }

              const renderTab = (t: { key: typeof tab; label: string }, index: number) => (
                <span
                  key={t.key}
                  className={`tab ${tab === t.key ? 'active' : ''} ${!gameHydrated ? 'disabled' : ''}`}
                  onClick={() => setTabTo(t.key)}
                  role="tab"
                  tabIndex={index}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setTabTo(t.key);
                    }
                  }}
                >
                  <EmojiText>{t.label}</EmojiText>
                </span>
              );

              return (
                <>
                  {rows.map((row, rowIndex) => (
                    // eslint-disable-next-line react-x/no-array-index-key
                    <div key={rowIndex} className="nav-row">
                      {row.map((t, index) => renderTab(t, index))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
          <div className="spacer" />
          <div className="user-info">
            <div className="username-info">
              {user?.avatar_data_uri && (
                <img src={user.avatar_data_uri} alt="User Avatar" className="user-avatar" />
              )}
              {!user?.avatar_data_uri && <IconUser size={24} />}
              <span
                className={`username ${user?.role !== 'user' ? 'clickable' : ''}`}
                role="button"
                onClick={() => {
                  if (user?.role !== 'user') {
                    globalThis.location.href = '/staff';
                  }
                }}
                onKeyDown={e => {
                  if (user?.role !== 'user' && (e.key === 'Enter' || e.key === ' ')) {
                    globalThis.location.href = '/staff';
                  }
                }}
              >
                {user ? user.username : 'User'}
              </span>
              {userRole !== null && userRole !== 'user' && (
                <span className={`user-badge ${userRole}`}>{titleCase(userRole)}</span>
              )}
            </div>
            <div className="user-money">
              <div>
                <EmojiText>💰 </EmojiText>
                <span className="money-amount mono">{smartFormatNumber(user?.money || 0)}</span>
              </div>
              <div>
                <EmojiText>💎 </EmojiText>
                <span className="money-amount mono">
                  {smartFormatNumber(user?.gems || 0, false)}
                </span>
              </div>
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
                    <EmojiText>💰 Money: </EmojiText>
                    <span className="mono">{smartFormatNumber(user?.money || 0)}</span>
                  </span>
                  <span className="money-info-line">
                    <EmojiText>💎 Gems: </EmojiText>
                    <span className="mono">{smartFormatNumber(user?.gems || 0, false)}</span>
                  </span>
                  <span className="money-info-line">
                    <EmojiText>📈 Resources: </EmojiText>
                    <span className="mono">{smartFormatNumber(resourcesTotal)}</span>
                  </span>
                  <span className="money-info-line">
                    <EmojiText>🎣 Aquarium: </EmojiText>
                    <span className="mono">{smartFormatNumber(aquariumTotal)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          {tab === 'resources' && (
            <div className="tab-content">
              <div className="resource-list-header">
                <h2>Resources</h2>
                <span>
                  <b>Total Value:</b> {smartFormatNumber(resourcesTotal)}
                </span>
              </div>
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
              <Button onClick={() => setTabTo('resources')}>Choose Resource</Button>
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
          {tab === 'social' && (
            <div className="tab-content">
              <Social
                room={socialRooms.find(r => r.uuid === socialRoom)!}
                setRoom={room => setSocialRoom(room.uuid)}
                rooms={socialRooms}
                user={user!}
              />
            </div>
          )}
          {tab === 'cue' && (
            <div className="tab-content">
              <h2>Cue Tab</h2>
              <p>Content for Cue will go here.</p>
            </div>
          )}
          {tab === 'leaderboard' && (
            <div className="tab-content">
              <Leaderboard />
            </div>
          )}
          {tab === 'gems' && (
            <div className="tab-content">
              <h2>Gems Store</h2>
              <div className="gem-card-list">
                <GemCard
                  amount={100}
                  price="A$1.00"
                  onClickAsync={async () => {
                    const url = await createPaymentSession('gems_pack_100', user!.username);
                    if (url) {
                      globalThis.location.href = url;
                    }
                  }}
                />
                <GemCard
                  amount={500}
                  price="A$4.50"
                  onClickAsync={async () => {
                    const url = await createPaymentSession('gems_pack_500', user!.username);
                    if (url) {
                      globalThis.location.href = url;
                    }
                  }}
                />
                <GemCard
                  amount={1000}
                  price="A$8.50"
                  onClickAsync={async () => {
                    const url = await createPaymentSession('gems_pack_1000', user!.username);
                    if (url) {
                      globalThis.location.href = url;
                    }
                  }}
                />
              </div>
            </div>
          )}
          {tab === 'store' && (
            <div className="tab-content">
              <h2>Store Tab</h2>
              <p>Content for Store will go here.</p>
            </div>
          )}
          {tab === 'settings' && (
            <div className="tab-content">
              <Settings user={user!} />
            </div>
          )}
          {tab === 'jail' && (
            <div className="jail-tab">
              <div className="jail-card">
                <h2>
                  <EmojiText>🚓 You are in Jail 🚓</EmojiText>
                </h2>
                {currentPunishment ? (
                  <>
                    <span className="jail-subtitle">You have been banned from playing Monix.</span>
                    {currentPunishment?.duration !== -1 ? (
                      <div className="jail-duration">
                        <span>Remaining duration:</span>
                        <span className="jail-time mono">
                          {formatRemainingTime(getRemainingDuration(currentPunishment) / 1000)}
                        </span>
                      </div>
                    ) : (
                      <div className="jail-duration">
                        <span>This is a permanent ban.</span>
                      </div>
                    )}
                    <div className="jail-info">
                      <div className="jail-reason">
                        <h3>Reason:</h3>
                        <p>{currentPunishment.category.name}</p>
                      </div>
                      <div className="jail-comment">
                        <h3>Comment:</h3>
                        <p>{currentPunishment.reason}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>You have been banned from playing Monix.</p>
                )}
              </div>
            </div>
          )}
          {tab === 'appeals' && (
            <div className="appeal-tab">
              <div className="appeal-card">
                <h2>
                  <EmojiText>📋 Appeals</EmojiText>
                </h2>
                <p>If you believe this ban was a mistake, you can submit an appeal.</p>
                <Button onClick={() => setAppealModalOpen(true)}>Submit Appeal</Button>
              </div>
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
              setTabTo('market');
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
      <Modal isOpen={appealModalOpen} onClose={() => setAppealModalOpen(false)}>
        <div className="appeal-modal">
          <h2>Submit an Appeal</h2>
          <textarea
            value={appealModalContent}
            onChange={e => setAppealModalContent(e.target.value)}
            placeholder="Enter your appeal details here..."
            rows={6}
          />
          <div className="appeal-modal-actions">
            <Button secondary onClick={() => setAppealModalOpen(false)}>
              Cancel
            </Button>
            <Button onClickAsync={submitAppealClick}>Submit Appeal</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

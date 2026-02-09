import './Game.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Nameplate,
  Avatar,
  Checkbox,
} from '../../components';
import { IconMusic, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { buyCosmetic, equipCosmetic, fetchUser, unequipCosmetic } from '../../helpers/auth';
import { getResourceQuantity, getTotalResourceValue } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { getPrices } from '../../helpers/market';
import {
  formatRemainingTime,
  getRarityEmoji,
  smartFormatNumber,
  titleCase,
} from '../../helpers/utils';
import { createPaymentSession } from '../../helpers/payments';
import type { IRoom } from '../../../server/common/models/room';
import { getAllRooms } from '../../helpers/social';
import { getCurrentPunishment, isUserBanned } from '../../../server/common/punishx/punishx';
import { getRemainingDuration, type IPunishment } from '../../../server/common/models/punishment';
import { getMyAppeals, submitAppeal } from '../../helpers/appeals';
import { useMusic } from '../../providers/music';
import { tracks } from '../../helpers/tracks';
import { loadSettings } from '../../helpers/settings';
import type { IAppeal } from '../../../server/common/models/appeal';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { fishTypes } from '../../../server/common/fishing/fishTypes';
import { fishModifiers } from '../../../server/common/fishing/fishModifiers';
import { getFishValue, type FishingResult } from '../../../server/common/fishing/fishing';
import { buyBait, buyRod, equipBait, equipRod, goFishing, sellFish } from '../../helpers/fishing';
import { fishingBaits } from '../../../server/common/fishing/fishingBait';
import { fishingRods } from '../../../server/common/fishing/fishingRods';
import type { IFish } from '../../../server/common/models/fish';

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
    | 'aquarium'
    | 'pets'
    | 'relics'
    | 'council'
    | 'social'
    | 'games'
    | 'radio'
    | 'leaderboard'
    | 'gems'
    | 'store'
    | 'cosmetics'
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
  const [myAppeals, setMyAppeals] = useState<IAppeal[]>([]);

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

  // Shop states
  const [hideBoughtCosmetics, setHideBoughtCosmetics] = useState<boolean>(true);

  // Fishing states
  const [isShowingFishingResults, setIsShowingFishingResults] = useState<boolean>(false);
  const [lastCatch, setLastCatch] = useState<{
    fishingResult: FishingResult;
    fishCaught: IFish;
    addedToAquarium: boolean;
    soldFor: number;
  } | null>(null);
  const [isRodsModalOpen, setIsRodsModalOpen] = useState<boolean>(false);
  const [isBaitModalOpen, setIsBaitModalOpen] = useState<boolean>(false);
  const [openRodSections, setOpenRodSections] = useState<Record<string, boolean>>({});
  const [openBaitSections, setOpenBaitSections] = useState<Record<string, boolean>>({});
  const [baitQuantities, setBaitQuantities] = useState<Record<string, number>>({});

  const toggleRodSection = useCallback((sectionId: string) => {
    setOpenRodSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const toggleBaitSection = useCallback((sectionId: string) => {
    setOpenBaitSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const setBaitQuantity = useCallback((baitId: string, quantity: number) => {
    const nextQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;

    setBaitQuantities(prev => ({
      ...prev,
      [baitId]: nextQuantity,
    }));
  }, []);

  const rodSections = useMemo(() => {
    const buyableRods = fishingRods.filter(rod => rod.buyable);

    return [
      {
        id: 'starter',
        title: 'Starter',
        subtitle: `Up to ${smartFormatNumber(10000)}`,
        rods: buyableRods.filter(rod => rod.price <= 10000),
      },
      {
        id: 'skilled',
        title: 'Skilled',
        subtitle: `${smartFormatNumber(25000)} - ${smartFormatNumber(150000)}`,
        rods: buyableRods.filter(rod => rod.price >= 25000 && rod.price <= 150000),
      },
      {
        id: 'elite',
        title: 'Elite',
        subtitle: `${smartFormatNumber(400000)} - ${smartFormatNumber(1000000)}`,
        rods: buyableRods.filter(rod => rod.price >= 400000 && rod.price <= 1000000),
      },
      {
        id: 'mythic',
        title: 'Mythic',
        subtitle: `${smartFormatNumber(5000000)}+`,
        rods: buyableRods.filter(rod => rod.price >= 5000000),
      },
    ].filter(section => section.rods.length > 0);
  }, []);

  const baitSections = useMemo(() => {
    return [
      {
        id: 'basic',
        title: 'Basic',
        subtitle: `Up to ${smartFormatNumber(100)}`,
        baits: fishingBaits.filter(bait => bait.price <= 100),
      },
      {
        id: 'advanced',
        title: 'Advanced',
        subtitle: `${smartFormatNumber(125)}+`,
        baits: fishingBaits.filter(bait => bait.price >= 125),
      },
    ].filter(section => section.baits.length > 0);
  }, []);

  // Aquarium states
  const [isFishSellModalOpen, setIsFishSellModalOpen] = useState<boolean>(false);
  const [aquariumFishToSell, setAquariumFishToSell] = useState<string | null>(null);

  // Radio
  const {
    enqueue,
    pause,
    resume,
    currentTrack,
    isPlaying,
    queue,
    currentIndex,
    playNext,
    setVolume,
  } = useMusic();

  const getRandomTrack = useCallback(() => tracks[Math.floor(Math.random() * tracks.length)], []);

  const ensureQueueSeeded = useCallback(() => {
    if (queue.length === 0) {
      enqueue(getRandomTrack());
      return true;
    }
    return false;
  }, [enqueue, getRandomTrack, queue.length]);

  const handlePlay = useCallback(() => {
    const added = ensureQueueSeeded();
    // If we just added and autoplay failed, resume will try again on user gesture
    if (!isPlaying || added) {
      playNext();
      resume();
    }
  }, [ensureQueueSeeded, isPlaying, playNext, resume]);

  const handlePause = useCallback(() => {
    if (isPlaying) pause();
  }, [isPlaying, pause]);

  useEffect(() => {
    if (tab !== 'radio') return;
    const desiredLength = Math.max(currentIndex + 2, 3);
    if (queue.length < desiredLength) {
      const toAdd = desiredLength - queue.length;
      const newTracks = Array.from({ length: toAdd }, () => getRandomTrack());
      enqueue(newTracks);
    }
  }, [tab, queue.length, currentIndex, enqueue, getRandomTrack]);

  const updateEverything = useCallback(async () => {
    const jailTabs = ['jail', 'settings', 'appeals'];

    const userData = await fetchUser();
    if (!userData) globalThis.location.href = '/auth/login';

    setUser(userData);
    setUserRole(userData ? userData.role : 'user');

    const myAppeals = await getMyAppeals();
    setMyAppeals(myAppeals);

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

    // Set radio volume based on settings
    const settings = loadSettings();
    setVolume(settings.musicVolume / 100);

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateEverything, setVolume]);

  const equippedNameplateStyle = user?.equipped_cosmetics?.nameplate
    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.nameplate)?.nameplateStyle
    : null;

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    const updateResource = async () => {
      if (banned) return;

      const resourcesCopy = [...resources];

      const fetchedPrices = await getPrices();

      // Get the quantities for all resources
      const quantitiesMap: { [key: string]: number } = {};
      for (const resource of resourcesCopy) {
        const qty = await getResourceQuantity(resource.id);
        quantitiesMap[resource.id] = qty || 0;
      }

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
      }, 5000);
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
                    { key: 'aquarium', label: '🐠 Aquarium' },
                    { key: 'pets', label: '🐶 Pets' },
                    { key: 'relics', label: '🦴 Relics' },
                    { key: 'council', label: '🏛️ Council' },
                    { key: 'social', label: '💬 Social' },
                    { key: 'games', label: '🎮 Games' },
                    { key: 'radio', label: '📻 Radio' },
                    { key: 'leaderboard', label: '🏆 Leaderboard' },
                    { key: 'gems', label: '💎 Gems' },
                    { key: 'store', label: '🛒 Store' },
                    { key: 'cosmetics', label: '🎨 Cosmetics' },
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
              <Avatar
                src={user?.avatar_data_uri}
                size={24}
                styleKey={
                  user?.equipped_cosmetics?.frame
                    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.frame)?.frameStyle
                    : undefined
                }
                className="user-avatar"
              />
              <Nameplate
                text={user ? user.username : 'User'}
                styleKey={equippedNameplateStyle}
                className={`username ${user?.role !== 'user' ? 'clickable' : ''}`.trim()}
                role={user?.role !== 'user' ? 'button' : undefined}
                onClick={() => {
                  if (user?.role !== 'user') {
                    globalThis.location.href = '/staff';
                  }
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
                  if (user?.role !== 'user' && (e.key === 'Enter' || e.key === ' ')) {
                    globalThis.location.href = '/staff';
                  }
                }}
              />
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
                  {smartFormatNumber(user?.gems || 0, false, true)}
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
                    <span className="mono">{smartFormatNumber(user?.gems || 0, false, true)}</span>
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
            <div className="tab-content fishing-tab">
              <h2>Fishing</h2>
              <div className="fishing-container">
                <div className="fishing-hgrid">
                  <div className="fishing-left">
                    <div className="fishing-card">
                      <h2>Go Fishing!</h2>
                      <Button
                        onClickAsync={async () => {
                          const result = await goFishing();

                          if (result) {
                            setIsShowingFishingResults(true);
                            setLastCatch(result);
                            await updateEverything();
                          }
                        }}
                      >
                        Cast Line
                      </Button>
                      {isShowingFishingResults && lastCatch && (
                        <div className="fishing-results">
                          <h3>
                            You Caught{' '}
                            {['a', 'e', 'i', 'o', 'u'].includes(
                              fishTypes
                                .find(f => f.id === lastCatch.fishCaught.type)
                                ?.name[0].toLowerCase() || ''
                            )
                              ? 'an'
                              : 'a'}{' '}
                            <EmojiText>
                              {fishTypes.find(f => f.id === lastCatch.fishCaught.type)?.icon}
                            </EmojiText>{' '}
                            {fishTypes.find(f => f.id === lastCatch.fishCaught.type)?.name}
                          </h3>
                          <p className="fishing-result-weight">
                            Weight:{' '}
                            {lastCatch.fishCaught.weight >= 1000 ? (
                              <span className="mono">
                                {smartFormatNumber(lastCatch.fishCaught.weight / 1000, false)}{' '}
                                tonnes
                              </span>
                            ) : (
                              <span className="mono">
                                {smartFormatNumber(lastCatch.fishCaught.weight, false)} kg
                              </span>
                            )}
                          </p>
                          <p className="fishing-result-value">
                            Value:{' '}
                            <span className="mono">
                              {smartFormatNumber(getFishValue(lastCatch.fishCaught))}
                            </span>
                          </p>

                          {lastCatch.addedToAquarium ? (
                            <p className="fishing-result-aquarium">Added to Aquarium</p>
                          ) : (
                            <p className="fishing-result-aquarium">
                              Automatically sold because your Aquarium is full!
                            </p>
                          )}

                          <Button
                            secondary
                            onClick={() => {
                              setIsShowingFishingResults(false);
                              setLastCatch(null);
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="fishing-right">
                    <div className="fishing-vgrid">
                      <div className="fishing-top">
                        <div className="fishing-card">
                          <div className="fishing-card-header">
                            <h2>
                              <EmojiText>🎣</EmojiText> Rods
                            </h2>
                            <Button onClick={() => setIsRodsModalOpen(true)}>Buy Rods</Button>
                          </div>
                          <div className="fishing-grid">
                            {(user?.fishing?.rods_owned || []).length === 0 && (
                              <p>You don't own any rods yet.</p>
                            )}
                            {(user?.fishing?.rods_owned || [])
                              .sort((a, b) => {
                                const rodA = fishingRods.find(r => r.id === a);
                                const rodB = fishingRods.find(r => r.id === b);
                                if (!rodA || !rodB) return 0;
                                return rodB.multiplier - rodA.multiplier;
                              })
                              .map(rodId => {
                                const rodInfo = fishingRods.find(r => r.id === rodId);

                                if (!rodInfo) return null;

                                const isEquipped = user?.fishing?.equipped_rod === rodId;

                                return (
                                  <div
                                    key={rodId}
                                    className={`fishing-grid-item ${isEquipped ? 'equipped' : ''}`}
                                  >
                                    <h3>{rodInfo.name}</h3>
                                    <span className="rod-multiplier">
                                      {rodInfo.multiplier}x Multiplier
                                    </span>
                                    {!isEquipped && (
                                      <Button
                                        onClickAsync={async () => {
                                          await equipRod(rodId);
                                          await updateEverything();
                                        }}
                                      >
                                        Equip
                                      </Button>
                                    )}
                                    {isEquipped && <Button disabled>Equipped</Button>}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                      <div className="fishing-bottom">
                        <div className="fishing-card">
                          <span className="fishing-card-header">
                            <h2>
                              <EmojiText>🪱</EmojiText> Bait
                            </h2>
                            <Button onClick={() => setIsBaitModalOpen(true)}>Buy Bait</Button>
                          </span>

                          <div className="fishing-grid">
                            {(user?.fishing?.bait_owned || []).length === 0 && (
                              <p>You don't own any bait yet.</p>
                            )}
                            {fishingBaits
                              .filter(b => {
                                const quantity = user?.fishing?.bait_owned?.[b.id] || 0;
                                return quantity > 0;
                              })
                              .sort((a, b) => {
                                const quantityA = user?.fishing?.bait_owned?.[a.id] || 0;
                                const quantityB = user?.fishing?.bait_owned?.[b.id] || 0;
                                return quantityB - quantityA;
                              })
                              .map(bait => {
                                const quantity = user?.fishing?.bait_owned?.[bait.id] || 0;
                                const isEquipped = user?.fishing?.equipped_bait === bait.id;
                                return (
                                  <div
                                    key={bait.id}
                                    className={`fishing-grid-item ${isEquipped ? 'equipped' : ''}`}
                                  >
                                    <h3>{bait.name}</h3>
                                    <div className="bait-pills">
                                      {bait.fish_types_boosted.map(typeId => {
                                        const typeInfo = fishTypes.find(t => t.id === typeId);
                                        if (!typeInfo) return null;
                                        return (
                                          <span key={typeId} className="bait-pill">
                                            {typeInfo.icon} {typeInfo.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <span className="bait-quantity">x{quantity}</span>
                                    {!isEquipped && (
                                      <Button
                                        onClickAsync={async () => {
                                          await equipBait(bait.id);
                                          await updateEverything();
                                        }}
                                      >
                                        Equip
                                      </Button>
                                    )}
                                    {isEquipped && <Button disabled>Equipped</Button>}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Modal isOpen={isRodsModalOpen} onClose={() => setIsRodsModalOpen(false)} width={700}>
                <div className="fishing-modal">
                  <h2>
                    <EmojiText>🎣</EmojiText> Rods Shop
                  </h2>
                  {rodSections.map(section => (
                    <div key={section.id} className="fishing-modal-section">
                      <div className="fishing-modal-section-header">
                        <h3>{section.title}</h3>
                        <div className="fishing-modal-section-meta">
                          <span className="fishing-modal-section-subtitle">{section.subtitle}</span>
                          <button
                            className="fishing-modal-section-toggle"
                            type="button"
                            aria-expanded={!!openRodSections[section.id]}
                            onClick={() => toggleRodSection(section.id)}
                          >
                            {openRodSections[section.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                      {openRodSections[section.id] && (
                        <div className="fishing-modal-grid">
                          {section.rods.map(rod => (
                            <div key={rod.id} className="fishing-modal-card">
                              <h3>{rod.name}</h3>
                              <p>
                                Price: <span className="mono">{smartFormatNumber(rod.price)}</span>
                              </p>
                              <span>{rod.multiplier}x Multiplier</span>

                              <Button
                                onClickAsync={async () => {
                                  await buyRod(rod.id);
                                  await updateEverything();
                                }}
                              >
                                Buy
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Modal>

              <Modal isOpen={isBaitModalOpen} onClose={() => setIsBaitModalOpen(false)} width={700}>
                <div className="fishing-modal">
                  <h2>
                    <EmojiText>🪱</EmojiText> Bait Shop
                  </h2>
                  {baitSections.map(section => (
                    <div key={section.id} className="fishing-modal-section">
                      <div className="fishing-modal-section-header">
                        <h3>{section.title}</h3>
                        <div className="fishing-modal-section-meta">
                          <span className="fishing-modal-section-subtitle">{section.subtitle}</span>
                          <button
                            className="fishing-modal-section-toggle"
                            type="button"
                            aria-expanded={!!openBaitSections[section.id]}
                            onClick={() => toggleBaitSection(section.id)}
                          >
                            {openBaitSections[section.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                      {openBaitSections[section.id] && (
                        <div className="fishing-modal-grid">
                          {section.baits.map(bait => (
                            <div key={bait.id} className="fishing-modal-card">
                              <h3>{bait.name}</h3>
                              <p>
                                Price: <span className="mono">{smartFormatNumber(bait.price)}</span>
                              </p>
                              <div className="bait-quantity-control">
                                <button
                                  type="button"
                                  className="bait-quantity-button"
                                  onClick={() =>
                                    setBaitQuantity(bait.id, (baitQuantities[bait.id] || 1) - 1)
                                  }
                                >
                                  -
                                </button>
                                <input
                                  className="bait-quantity-input"
                                  type="number"
                                  min={1}
                                  value={baitQuantities[bait.id] || 1}
                                  onChange={event =>
                                    setBaitQuantity(bait.id, Number(event.target.value))
                                  }
                                />
                                <button
                                  type="button"
                                  className="bait-quantity-button"
                                  onClick={() =>
                                    setBaitQuantity(bait.id, (baitQuantities[bait.id] || 1) + 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <Button
                                onClickAsync={async () => {
                                  await buyBait(bait.id, baitQuantities[bait.id] || 1);
                                  await updateEverything();
                                }}
                              >
                                Buy
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Modal>
            </div>
          )}
          {tab === 'aquarium' && (
            <div className="tab-content">
              <h2>Aquarium</h2>
              <div className="aquarium-info">
                {(() => {
                  const fishLength = user?.fishing?.aquarium.fish.length ?? 0;
                  const capacity = user?.fishing?.aquarium.capacity ?? 0;

                  if (fishLength === 0) {
                    return 'Your aquarium is empty. Catch some fish to display them here!';
                  }

                  if (fishLength !== capacity) {
                    return (
                      <>
                        You are using <span className="aquarium-data">{fishLength}</span> out of{' '}
                        <span className="aquarium-data">{capacity}</span> capacity in your aquarium.
                      </>
                    );
                  }

                  return (
                    <>
                      Your aquarium is at full capacity! Try upgrading your aquarium to fit more
                      fish.{' '}
                      <span className="aquarium-data">
                        {fishLength}/{capacity}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="aquarium-grid">
                {user?.fishing?.aquarium.fish.map(fish => (
                  <div key={fish.uuid} className="aquarium-fish-card">
                    <h3>
                      <EmojiText>{fishTypes.find(ft => ft.id === fish.type)?.icon}</EmojiText>{' '}
                      {fishTypes.find(ft => ft.id === fish.type)?.name}
                    </h3>
                    <span className="aquarium-fish-weight">
                      {fish.weight >= 1000 ? (
                        <span className="mono">
                          {smartFormatNumber(fish.weight / 1000, false)} tonnes
                        </span>
                      ) : (
                        <span className="mono">{smartFormatNumber(fish.weight, false)} kg</span>
                      )}
                    </span>
                    <div className="aquarium-fish-modifiers">
                      {fish.modifiers?.map(mod => (
                        <span
                          key={fishModifiers.find(fm => fm.id === mod)?.id}
                          className="aquarium-fish-modifier"
                        >
                          {fishModifiers.find(fm => fm.id === mod)?.name}
                        </span>
                      ))}
                    </div>
                    <span>
                      VALUE:{' '}
                      <span className="aquarium-fish-value mono">
                        {smartFormatNumber(getFishValue(fish))}
                      </span>
                    </span>
                    <Button
                      className="aquarium-fish-sell-button"
                      onClick={() => {
                        setAquariumFishToSell(fish.uuid);
                        setIsFishSellModalOpen(true);
                      }}
                    >
                      Sell
                    </Button>
                  </div>
                ))}
              </div>

              <Modal isOpen={isFishSellModalOpen} onClose={() => setIsFishSellModalOpen(false)}>
                <div className="fish-sell-modal">
                  <h2>Sell Fish</h2>
                  <p>
                    Are you sure you want to sell this fish for{' '}
                    <span className="mono">
                      {smartFormatNumber(
                        user?.fishing?.aquarium.fish.find(f => f.uuid === aquariumFishToSell)
                          ? getFishValue(
                              user.fishing.aquarium.fish.find(f => f.uuid === aquariumFishToSell)!
                            )
                          : 0
                      )}
                    </span>
                    ?
                  </p>
                  <div className="fish-sell-modal-buttons">
                    <Button onClick={() => setIsFishSellModalOpen(false)} secondary>
                      Cancel
                    </Button>
                    <Button
                      onClickAsync={async () => {
                        await sellFish(aquariumFishToSell!);
                        setIsFishSellModalOpen(false);
                        setAquariumFishToSell(null);
                        await updateEverything();
                      }}
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              </Modal>
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
          {tab === 'games' && (
            <div className="tab-content">
              <h2>
                <EmojiText>🎮 Game Hub</EmojiText>
              </h2>
              <p>Play an assortment of fun, original games here on Monix.</p>
              <div className="games-container">
                <div className="game-card">
                  <h3>
                    <EmojiText>🔴 Que</EmojiText>
                  </h3>
                  <p>Play a game of Que, the fast-paced strategy board game.</p>
                  <Button className="game-button">Play Que</Button>
                </div>
                <div className="game-card">
                  <h3>
                    <EmojiText>🔠 WordGrid</EmojiText>
                  </h3>
                  <p>Beat the daily puzzle in this exciting game of vocabulary and word skills.</p>
                  <Button
                    className="game-button"
                    onClick={() => {
                      globalThis.open('https://wordgrid.proplayer919.dev', '_blank');
                    }}
                  >
                    Play WordGrid
                  </Button>
                </div>
              </div>
            </div>
          )}
          {tab === 'radio' && (
            <div className="tab-content">
              <h2>Monix Radio</h2>
              <div className="now-playing-card">
                {currentTrack && (
                  <img
                    src={currentTrack?.coverSrc || undefined}
                    alt="Current Track Artwork"
                    className="song-cover"
                  />
                )}
                {!currentTrack && (
                  <div className="song-cover placeholder-cover">
                    <IconMusic size={64} />
                  </div>
                )}
                <div className="song-info">
                  {currentTrack && (
                    <>
                      <span className="song-subtitle">Now Playing</span>
                      <span className="song-name">{currentTrack?.title || 'Nothing'}</span>
                      <span className="song-artist">
                        by <span>{currentTrack?.artist || 'Nobody'}</span>
                      </span>
                    </>
                  )}
                  {!currentTrack && <span className="song-subtitle">Nothing is playing</span>}
                </div>
                <div className="spacer"></div>
                <div className="song-controls">
                  {!isPlaying ? (
                    <button
                      className="song-control"
                      aria-label="Play"
                      onClick={handlePlay}
                      disabled={isPlaying}
                    >
                      <IconPlayerPlay size={20} />
                    </button>
                  ) : (
                    <button
                      className="song-control"
                      aria-label="Pause"
                      onClick={handlePause}
                      disabled={!isPlaying}
                    >
                      <IconPlayerPause size={20} />
                    </button>
                  )}
                </div>
              </div>
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
              <h2>Cosmetic Store</h2>
              <Checkbox
                label="Hide already bought cosmetics"
                checked={hideBoughtCosmetics}
                onClick={setHideBoughtCosmetics}
              />
              <div className="cosmetics-grid">
                {cosmetics.filter(
                  c =>
                    c.buyable && (!hideBoughtCosmetics || !user?.cosmetics_unlocked?.includes(c.id))
                ).length === 0 && (
                  <p className="no-cosmetics-message">
                    No cosmetics are available for purchase at this time. Please check back later or
                    remove filters.
                  </p>
                )}
                {cosmetics
                  .filter(
                    c =>
                      c.buyable &&
                      (!hideBoughtCosmetics || !user?.cosmetics_unlocked?.includes(c.id))
                  )
                  .map(cosmetic => (
                    <div key={cosmetic.id} className="cosmetic-card">
                      <h2 className="cosmetic-name">{cosmetic.name}</h2>
                      <span className="cosmetic-rarity">
                        <EmojiText>{getRarityEmoji(cosmetic.rarity)}</EmojiText>{' '}
                        {titleCase(cosmetic.rarity)}
                      </span>
                      <div className="cosmetic-preview">
                        {cosmetic.type === 'nameplate' && (
                          <Nameplate
                            text="Monix User"
                            styleKey={cosmetic.nameplateStyle}
                            className="nameplate-preview"
                          />
                        )}
                        {cosmetic.type === 'tag' && (
                          <span
                            className={`user-tag user-tag-large tag-colour-${cosmetic.tagColour}`}
                          >
                            <EmojiText>{cosmetic.tagIcon}</EmojiText> {cosmetic.tagName}
                          </span>
                        )}
                        {cosmetic.type === 'frame' && (
                          <Avatar
                            src={user?.avatar_data_uri}
                            size={24}
                            styleKey={cosmetic.frameStyle}
                            className="avatar-preview"
                          />
                        )}
                      </div>
                      <div className="spacer"></div>
                      <Button
                        className="cosmetic-action"
                        disabled={
                          user?.cosmetics_unlocked?.includes(cosmetic.id) ||
                          ((user?.gems || 0) < (cosmetic.price || 0) && user?.gems !== -1)
                        }
                        onClickAsync={async () => {
                          await buyCosmetic(cosmetic.id);
                          await updateEverything();
                        }}
                      >
                        {user?.cosmetics_unlocked?.includes(cosmetic.id) && 'Purchased'}
                        {!user?.cosmetics_unlocked?.includes(cosmetic.id) &&
                          `Buy for ${smartFormatNumber(cosmetic.price || 0, false, true)} Gems`}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {tab === 'cosmetics' && (
            <div className="tab-content">
              <h2>Cosmetics</h2>
              <div className="cosmetics-grid">
                {(!user?.cosmetics_unlocked || user?.cosmetics_unlocked.length === 0) && (
                  <p>
                    You have not unlocked any cosmetics yet. Try earning some gems to unlock
                    cosmetics!
                  </p>
                )}
                {(user?.cosmetics_unlocked ?? [])
                  .map(cosmeticId => cosmetics.find(c => c.id === cosmeticId))
                  .filter((cosmetic): cosmetic is NonNullable<typeof cosmetic> => Boolean(cosmetic))
                  .sort((a, b) => {
                    const equippedA = user?.equipped_cosmetics?.[a.type] === a.id;
                    const equippedB = user?.equipped_cosmetics?.[b.type] === b.id;

                    if (equippedA && !equippedB) return -1;
                    if (!equippedA && equippedB) return 1;

                    return 0;
                  })
                  .map(cosmetic => (
                    <div
                      key={cosmetic.id}
                      className={`cosmetic-card ${user?.equipped_cosmetics?.[cosmetic.type] === cosmetic.id ? 'equipped' : ''}`}
                    >
                      <h2 className="cosmetic-name">{cosmetic.name}</h2>
                      <span className="cosmetic-rarity">
                        <EmojiText>{getRarityEmoji(cosmetic.rarity)}</EmojiText>{' '}
                        {titleCase(cosmetic.rarity)}
                      </span>
                      <div className="cosmetic-preview">
                        {cosmetic.type === 'nameplate' && (
                          <Nameplate
                            text="Monix User"
                            styleKey={cosmetic.nameplateStyle}
                            className="nameplate-preview"
                          />
                        )}
                        {cosmetic.type === 'tag' && (
                          <span
                            className={`user-tag user-tag-large tag-colour-${cosmetic.tagColour}`}
                          >
                            <EmojiText>{cosmetic.tagIcon}</EmojiText> {cosmetic.tagName}
                          </span>
                        )}
                        {cosmetic.type === 'frame' && (
                          <Avatar
                            src={user?.avatar_data_uri}
                            size={24}
                            styleKey={cosmetic.frameStyle}
                            className="avatar-preview"
                          />
                        )}
                      </div>
                      <div className="spacer"></div>
                      <Button
                        className="cosmetic-action"
                        onClickAsync={async () => {
                          if (user?.equipped_cosmetics?.[cosmetic.type] === cosmetic.id) {
                            await unequipCosmetic(cosmetic.type);
                          } else {
                            await equipCosmetic(cosmetic.id);
                          }
                          await updateEverything();
                        }}
                      >
                        {user?.equipped_cosmetics?.[cosmetic.type] === cosmetic.id
                          ? 'Unequip'
                          : 'Equip'}
                      </Button>
                    </div>
                  ))}
              </div>
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
                {myAppeals.filter(a => {
                  const punishment = getCurrentPunishment(user!);
                  return a.punishment_uuid === punishment?.uuid;
                }).length === 0 ? (
                  <>
                    <p>If you believe this ban was a mistake, you can submit an appeal.</p>
                    <Button onClick={() => setAppealModalOpen(true)}>Submit Appeal</Button>
                  </>
                ) : (
                  <p>
                    You have already submitted an appeal for this punishment. You cannot submit
                    another one.
                  </p>
                )}
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

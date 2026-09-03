import styles from './Game.module.css';
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import {
  EmojiText,
  ResourceList,
  AnimatedBackground,
  ResourceGraph,
  Button,
  BuySellPanel,
  PetsList,
  Settings,
  Leaderboard,
  GemCard,
  Social,
  DebugOverlay,
  Modal,
  Nameplate,
  Avatar,
  NewsTicker,
  Checkbox,
  Select,
  PaymentModal,
  NotificationToasts,
} from '../../components';
import { IconMusic, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import {
  buyCosmetic,
  buyUpgrade,
  completeTutorial,
  equipCosmetic,
  resetTutorial,
  unequipCosmetic,
} from '../../helpers/auth';
import { claimDailyReward, type DailyRewardClaimResult } from '../../helpers/rewards';
import { getResourceQuantity } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import {
  formatRemainingMilliseconds,
  formatRemainingTime,
  smartFormatNumber,
  titleCase,
} from '../../../server/common/math';
import { createPaymentSession } from '../../helpers/payments';
import type { IRoom } from '../../../server/common/models/room';
import { getCurrentPunishment, isUserBanned } from '../../../server/common/punishx/punishx';
import { getRemainingDuration, type IPunishment } from '../../../server/common/models/punishment';
import { getMyAppeals, submitAppeal } from '../../helpers/appeals';
import { useMusic } from '../../providers/music';
import { tracks } from '../../helpers/tracks';
import { loadSettings, type IClientSettings } from '../../helpers/settings';
import type { IAppeal } from '../../../server/common/models/appeal';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import type { Cosmetic } from '../../../server/common/cosmetics/cosmetic';
import { fishTypes } from '../../../server/common/fishing/fishTypes';
import { fishModifiers } from '../../../server/common/fishing/fishModifiers';
import {
  getAquariumUpgradeCost,
  getCurrentFishingEvent,
  getFishValue,
  type FishingResult,
} from '../../../server/common/fishing/fishing';
import {
  getSailorFleetRatePerSec,
  getSailorHireCost,
  getSailorLevelUpCost,
  SAILOR_MAX_LEVEL,
} from '../../../server/common/fishing/sailors';
import {
  buyBait,
  buyRod,
  equipBait,
  equipRod,
  getEventPreview,
  goFishing,
  hireSailor,
  collectSailorEarnings,
  levelUpSailor,
  sellAllFish,
  sellFish,
  sellRod,
  unequipBait,
  unlockEventPreview,
  upgradeAquarium,
  type EventPreviewResult,
} from '../../helpers/fishing';
import { fishingBaits } from '../../../server/common/fishing/fishingBait';
import { fishingRods } from '../../../server/common/fishing/fishingRods';
import type { IFish } from '../../../server/common/models/fish';
import { DAILY_REWARDS } from '../../../server/common/rewards/dailyRewards';
import { rarityEmojis } from '../../../server/common/rarities';
import {
  DEFAULT_GLOBAL_SETTINGS,
  type IGlobalSettings,
} from '../../../server/common/models/globalSettings';
import {
  isUpgradeActive,
  MAGIC_JELLYBEAN_UPGRADE_ID,
  UPGRADES,
  PERMANENT_UPGRADES,
  permanentUpgradeCost,
} from '../../../server/common/upgrades';
import { ACHIEVEMENTS } from '../../../server/common/achievements';
import { buyPermanentUpgrade, prestige } from '../../helpers/progression';
import { useSocket } from '../../providers/socket';
import { useChatNotifications } from '../../hooks/useChatNotifications';

const getRodTierInfo = (price: number) => {
  if (price <= 10000) return { emoji: '🟢', title: 'Starter' };
  if (price <= 150000) return { emoji: '🔷', title: 'Skilled' };
  if (price <= 1000000) return { emoji: '🟣', title: 'Elite' };
  if (price <= 500000000) return { emoji: '🌌', title: 'Mythic' };
  if (price <= 10000000000) return { emoji: '🌠', title: 'Cosmic' };
  if (price <= 25000000000) return { emoji: '🕳️', title: 'Singularity' };
  return { emoji: '✨', title: 'Genesis' };
};

export default function Game() {
  const debugOverlayPositions = ['topleft', 'topright', 'bottomleft', 'bottomright'] as const;
  type DebugOverlayPosition = (typeof debugOverlayPositions)[number];

  // Net worth states
  const [totalNetWorth, setTotalNetWorth] = useState<number>(0);
  const [resourcesTotal, setResourcesTotal] = useState<number>(0);
  const [aquariumTotal, setAquariumTotal] = useState<number>(0);

  // Game states
  const [gameHydrated, setGameHydrated] = useState<boolean>(false);
  const [tab, setTab] = useState<
    | 'money'
    | 'resources'
    | 'fishing'
    | 'pets'
    | 'social'
    | 'radio'
    | 'upgrades'
    | 'achievements'
    | 'leaderboard'
    | 'store'
    | 'cosmetics'
    | 'stats'
    | 'settings'
    | 'jail'
    | 'appeals'
  >('money');
  const [fishingSubview, setFishingSubview] = useState<'fishing' | 'aquarium' | 'sailors'>(
    'fishing'
  );
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
  const [eventNow, setEventNow] = useState(() => Date.now());
  const [fishingNow, setFishingNow] = useState(() => Date.now());
  const [debugOverlayEnabled, setDebugOverlayEnabled] = useState(
    () => loadSettings().debugOverlay ?? false
  );
  const [debugOverlayPosition, setDebugOverlayPosition] = useState<DebugOverlayPosition>(
    () => loadSettings().debugOverlayPosition ?? 'topleft'
  );
  const [dailyRewardResult, setDailyRewardResult] = useState<DailyRewardClaimResult | null>(null);
  const [isDailyRewardModalOpen, setIsDailyRewardModalOpen] = useState<boolean>(false);
  const dailyRewardClaimedRef = useRef(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialProgress, setTutorialProgress] = useState({
    boughtResource: false,
    caughtFish: false,
    visitedAquarium: false,
    visitedPets: false,
  });
  const [globalSettings, setGlobalSettings] = useState<IGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const { connected, subscribe, request } = useSocket();
  type TutorialStep = {
    title: string;
    body: string;
    tab?: typeof tab;
    task?: string;
  };

  // Market states
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');

  const currentFishingEvent = useMemo(() => getCurrentFishingEvent(eventNow), [eventNow]);
  const tutorialSteps = useMemo<TutorialStep[]>(
    () => [
      {
        title: 'Welcome to Monix',
        body: 'Build your fortune by fishing, trading resources, and upgrading your collection.',
        tab: 'money',
      },
      {
        title: 'Start With Some Cash',
        body: 'Your balance is your toolkit. You will spend a little of it to build your first holding.',
        tab: 'money',
        task: 'Look over your starting balance.',
      },
      {
        title: 'Buy Your First Holding',
        body: 'Open Resources, choose a market, and buy at least one unit. Holdings add to your net worth.',
        tab: 'resources',
        task: 'Buy at least one resource.',
      },
      {
        title: 'Go Fishing',
        body: 'Catch fish to fill your aquarium. Modifiers can boost value, so check each catch.',
        tab: 'fishing',
        task: 'Catch a fish.',
      },
      {
        title: 'Review Your Aquarium',
        body: 'The aquarium stores your fish. Sell or upgrade capacity when you need space.',
        tab: 'fishing',
        task: 'Open the Aquarium view.',
      },
      {
        title: 'Meet Your Pets',
        body: 'Visit the Pets tab to adopt companions and expand your collection.',
        tab: 'pets',
        task: 'Visit the Pets tab.',
      },
    ],
    []
  );
  const currentTutorialStep = tutorialSteps[tutorialStep];
  const isLastTutorialStep = tutorialStep >= tutorialSteps.length - 1;
  const featureFlags = globalSettings.features;
  const resourceMarketDisabled = !featureFlags.resourcesMarket;
  const fishingDisabled = !featureFlags.fishingAquarium;
  const petsDisabled = !featureFlags.pets;
  const socialDisabled = !featureFlags.social;
  const gemPurchasesDisabled = !featureFlags.gemPurchases;
  const cosmeticPurchasesDisabled = !featureFlags.cosmeticPurchases;
  const fishingCooldownMs = isUpgradeActive(user?.upgrades, MAGIC_JELLYBEAN_UPGRADE_ID, fishingNow)
    ? 2500
    : 5000;
  const isTutorialStepComplete = useMemo(() => {
    if (!currentTutorialStep) return true;

    switch (tutorialStep) {
      case 1:
        return tab === 'money';
      case 2:
        return tab === 'resources' && tutorialProgress.boughtResource;
      case 3: {
        return tab === 'fishing' && tutorialProgress.caughtFish;
      }
      case 4:
        return tab === 'fishing' && tutorialProgress.visitedAquarium;
      case 5:
        return tab === 'pets' && tutorialProgress.visitedPets;
      default:
        return true;
    }
  }, [
    currentTutorialStep,
    tutorialStep,
    tab,
    tutorialProgress.boughtResource,
    tutorialProgress.caughtFish,
    tutorialProgress.visitedAquarium,
    tutorialProgress.visitedPets,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEventNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('settings', data => {
      const snapshot = data as { settings: IGlobalSettings };
      if (snapshot.settings) {
        setGlobalSettings(snapshot.settings);
      }
    });
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    const handleSettingsChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          key?: keyof IClientSettings;
          value?: IClientSettings[keyof IClientSettings];
        }>
      ).detail;

      if (detail?.key === 'debugOverlay') {
        setDebugOverlayEnabled(Boolean(detail.value));
      }
      if (detail?.key === 'debugOverlayPosition') {
        const nextValue = String(detail.value) as DebugOverlayPosition;
        setDebugOverlayPosition(debugOverlayPositions.includes(nextValue) ? nextValue : 'topleft');
      }
    };

    globalThis.addEventListener('settings-changed', handleSettingsChanged);

    return () => {
      globalThis.removeEventListener('settings-changed', handleSettingsChanged);
    };
  });

  useEffect(() => {
    if (tab !== 'fishing') return;

    let rafId: number | undefined;

    const start = () => {
      let lastTick = 0;

      const tick = (time: number) => {
        if (document.hidden) {
          rafId = undefined;
          return;
        }

        if (time - lastTick >= 100) {
          setFishingNow(Date.now());
          lastTick = time;
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId !== undefined) {
          cancelAnimationFrame(rafId);
          rafId = undefined;
        }
        return;
      }

      setFishingNow(Date.now());
      start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setFishingNow(Date.now());
    };
  }, [tab]);

  // Resource list states
  const [resourceListHydrated, setResourceListHydrated] = useState(false);
  const [sortedResources, setSortedResources] = useState<ResourceInfo[]>([]);
  const [resourcePrices, setResourcePrices] = useState<{ [key: string]: number }>({});
  const [resourceChanges, setResourceChanges] = useState<{ [key: string]: number }>({});
  const [resourceQuantities, setResourceQuantities] = useState<{ [key: string]: number }>({});

  // Social states
  const [socialRoom, setSocialRoom] = useState<string>('general');
  const [socialRooms, setSocialRooms] = useState<IRoom[]>([]);
  const deepLinkHandledRef = useRef(false);

  // Handle ?tab=social&room=<uuid> deep links (from push notifications).
  useEffect(() => {
    if (!gameHydrated || socialDisabled || deepLinkHandledRef.current) return;

    const params = new URLSearchParams(globalThis.location.search);
    if (params.get('tab') === 'social') {
      const targetRoom = params.get('room');
      startTransition(() => {
        if (targetRoom && socialRooms.some(r => r.uuid === targetRoom)) {
          setSocialRoom(targetRoom);
        } else if (!targetRoom && socialRooms.length > 0) {
          setSocialRoom(socialRooms[0].uuid);
        }
        setTabTo('social');
      });
      deepLinkHandledRef.current = true;

      const url = new URL(globalThis.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('room');
      globalThis.history.replaceState(null, '', url.toString());
    }
  }, [gameHydrated, socialDisabled, socialRooms, setTabTo]);

  const notificationsEnabled = (user?.settings?.notifications_enabled ?? false) && !socialDisabled;

  const isRoomActive = useCallback(
    (roomUuid: string) => tab === 'social' && socialRoom === roomUuid,
    [tab, socialRoom]
  );
  const { totalUnread, unreadByRoom, toasts, dismissToast, clearRoom, clearAll } =
    useChatNotifications({
      userUuid: user?.uuid ?? null,
      enabled: notificationsEnabled,
      isRoomActive,
    });

  // Mark a room as read when it becomes the active social room.
  useEffect(() => {
    if (tab === 'social') {
      clearRoom(socialRoom);
    }
  }, [tab, socialRoom, clearRoom]);

  // Opening the social tab marks all rooms read.
  useEffect(() => {
    if (tab === 'social') {
      clearAll();
    }
  }, [tab, clearAll]);

  // Appeal states
  const [appealModalOpen, setAppealModalOpen] = useState<boolean>(false);
  const [appealModalContent, setAppealModalContent] = useState<string>('');

  // Shop states
  const [hideBoughtCosmetics, setHideBoughtCosmetics] = useState<boolean>(true);
  const [storeView, setStoreView] = useState<'cosmetics' | 'gems'>('cosmetics');

  // Fishing states
  const [isShowingFishingResults, setIsShowingFishingResults] = useState<boolean>(false);
  const [lastCatch, setLastCatch] = useState<{
    fishingResult: FishingResult;
    fishCaught: IFish;
    success: boolean;
  } | null>(null);
  const [wasLastCatchAutoSold, setWasLastCatchAutoSold] = useState<boolean>(false);
  const [autoSellEnabled, setAutoSellEnabled] = useState<boolean>(false);
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
  const [isFishSellAllModalOpen, setIsFishSellAllModalOpen] = useState<boolean>(false);
  const [aquariumFishToSell, setAquariumFishToSell] = useState<string | null>(null);
  const [eventPreview, setEventPreview] = useState<EventPreviewResult | null>(null);
  const [isEventPreviewModalOpen, setIsEventPreviewModalOpen] = useState<boolean>(false);
  const [aquariumSort, setAquariumSort] = useState<'value-desc' | 'value-asc'>('value-desc');
  const [aquariumModifierFilter, setAquariumModifierFilter] = useState<'all' | 'with' | 'without'>(
    'all'
  );

  const aquariumFishView = useMemo(() => {
    const aquariumFish = user?.fishing?.aquarium.fish ?? [];

    const filteredFish = aquariumFish.filter(fish => {
      const modifierCount = fish.modifiers?.length ?? 0;
      if (aquariumModifierFilter === 'with') return modifierCount > 0;
      if (aquariumModifierFilter === 'without') return modifierCount === 0;
      return true;
    });

    const fishWithValue = filteredFish.map(fish => ({
      fish,
      value: getFishValue(fish),
    }));

    const sortMultiplier = aquariumSort === 'value-desc' ? -1 : 1;
    fishWithValue.sort((a, b) => {
      const valueDelta = a.value - b.value;
      if (valueDelta !== 0) return valueDelta * sortMultiplier;
      return (b.fish.caught_at || 0) - (a.fish.caught_at || 0);
    });

    return fishWithValue.map(item => item.fish);
  }, [user?.fishing?.aquarium.fish, aquariumModifierFilter, aquariumSort]);

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

  const applyUserData = useCallback(
    (userData: IUser) => {
      const jailTabs = ['jail', 'settings', 'appeals'];

      setUser(userData);
      setUserRole(userData ? userData.role : 'user');

      if (isUserBanned(userData)) {
        setBanned(true);
        setCurrentPunishment(getCurrentPunishment(userData));
        if (!jailTabs.includes(tab)) setTabTo('jail');
        return;
      } else if (banned) {
        setBanned(false);
        setTabTo('money');
      }

      const aquariumValue = (userData.fishing?.aquarium?.fish ?? []).reduce(
        (total, fish) => total + getFishValue(fish),
        0
      );
      setAquariumTotal(aquariumValue);
      setTotalNetWorth((userData.money || 0) + resourcesTotal + aquariumValue);
    },
    [banned, tab, setTabTo, resourcesTotal]
  );

  const updateEverything = useCallback(async () => {
    try {
      const userResp = (await request('user:get', {}, 'user_snapshot')) as {
        data?: { user?: IUser };
      };
      const userData = userResp?.data?.user;
      if (!userData) {
        globalThis.location.href = '/auth/login';
        return;
      }
      applyUserData(userData);
      // Enable the tabs as soon as the user snapshot is applied, without
      // waiting for the slower, optional secondary fetches below.
      setGameHydrated(true);

      try {
        const roomsResp = (await request('socialRooms:get', {}, 'socialRooms_snapshot')) as {
          data?: { rooms?: unknown[] };
        };
        const rooms = roomsResp?.data?.rooms;
        if (Array.isArray(rooms)) {
          setSocialRooms(rooms as IRoom[]);
        }
      } catch {
        // Rooms are optional; ignore failures.
      }
    } catch {
      // Socket not available; ignore.
    }
  }, [applyUserData, request]);

  // Live user + rooms via the authenticated socket (replaces 1s HTTP polling).
  useEffect(() => {
    const unsubUser = subscribe('user:me', data => {
      const snapshot = data as { user?: IUser };
      if (snapshot?.user) {
        void applyUserData(snapshot.user);
      }
    });
    const unsubRooms = subscribe('socialRooms', data => {
      const snapshot = data as { rooms?: unknown[] };
      if (Array.isArray(snapshot?.rooms)) {
        setSocialRooms(snapshot.rooms as typeof socialRooms);
      }
    });
    return () => {
      unsubUser();
      unsubRooms();
    };
  }, [subscribe, applyUserData, socialRooms]);

  // Appeals only change rarely; refresh on mount and whenever the jail tab is opened.
  useEffect(() => {
    let mounted = true;
    const loadAppeals = async () => {
      const appeals = await getMyAppeals();
      if (mounted) setMyAppeals(appeals);
    };
    void loadAppeals();
    if (tab !== 'jail') return;
    return () => {
      mounted = false;
    };
  }, [tab]);

  const startTutorial = useCallback(async () => {
    setTutorialStep(0);
    setIsTutorialOpen(true);
    setTutorialProgress({
      boughtResource: false,
      caughtFish: false,
      visitedAquarium: false,
      visitedPets: false,
    });

    if (user?.completed_tutorial) {
      setUser({ ...user, completed_tutorial: false });
    }

    await resetTutorial();
  }, [user]);

  const handleTutorialComplete = useCallback(async () => {
    setIsTutorialOpen(false);
    setTutorialStep(0);

    if (user && !user.completed_tutorial) {
      setUser({ ...user, completed_tutorial: true });
    }

    await completeTutorial();
    await updateEverything();
  }, [updateEverything, user]);

  useEffect(() => {
    if (!connected) return;
    startTransition(() => {
      void updateEverything().then(() => setGameHydrated(true));
    });

    // Set radio volume based on settings
    const settings = loadSettings();
    setVolume(settings.musicVolume / 100);
  }, [updateEverything, setVolume, connected]);

  useEffect(() => {
    if (!gameHydrated || !user || dailyRewardClaimedRef.current) return;
    dailyRewardClaimedRef.current = true;

    void claimDailyReward().then(result => {
      if (!result || !result.claimed || !result.reward) return;
      setDailyRewardResult(result);
      setIsDailyRewardModalOpen(true);
    });
  }, [gameHydrated, user]);

  useEffect(() => {
    if (!user || user.completed_tutorial || isTutorialOpen || banned) return;

    startTransition(() => setIsTutorialOpen(true));
  }, [user, isTutorialOpen, banned]);

  useEffect(() => {
    if (!isTutorialOpen || !currentTutorialStep?.tab) return;
    const targetTab = currentTutorialStep.tab;

    startTransition(() => setTabTo(targetTab));
  }, [currentTutorialStep, isTutorialOpen, setTabTo]);

  useEffect(() => {
    if (!isTutorialOpen) return;

    startTransition(() => {
      if (tab === 'fishing' && fishingSubview === 'aquarium') {
        setTutorialProgress(prev => ({
          ...prev,
          visitedAquarium: true,
        }));
      }

      if (tab === 'pets') {
        setTutorialProgress(prev => ({
          ...prev,
          visitedPets: true,
        }));
      }
    });
  }, [isTutorialOpen, tab, fishingSubview]);

  const equippedNameplateStyle = user?.equipped_cosmetics?.nameplate
    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.nameplate)?.nameplateStyle
    : null;
  const hasActiveMagicJellybean =
    Boolean(user?.upgrades?.magic_jellybean?.expires_at) &&
    (user?.upgrades?.magic_jellybean?.expires_at || 0) > fishingNow;
  const effectiveNameplateStyle = hasActiveMagicJellybean ? 'rainbow' : equippedNameplateStyle;
  const equippedTagCosmetic = user?.equipped_cosmetics?.tag
    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.tag)
    : null;

  const recomputeResources = useCallback(
    async (prices: { [key: string]: number }) => {
      if (banned || resourceMarketDisabled) return;
      const resourcesCopy = [...resources];

      const quantitiesMap: { [key: string]: number } = {};
      for (const resource of resourcesCopy) {
        const qty = await getResourceQuantity(resource.id);
        quantitiesMap[resource.id] = qty || 0;
      }
      setResourceQuantities(quantitiesMap);

      const resourcesWithValues = resourcesCopy.map(resource => ({
        resource,
        value: prices[resource.id] * (quantitiesMap[resource.id] || 0),
      }));

      resourcesWithValues.sort((a, b) => b.value - a.value);
      setSortedResources(resourcesWithValues.map(item => item.resource));

      const pricesMap: { [key: string]: number } = {};
      resourcesWithValues.forEach(item => {
        pricesMap[item.resource.id] = prices[item.resource.id];
      });
      setResourcePrices(pricesMap);

      const totalValue = resourcesWithValues.reduce((sum, item) => sum + item.value, 0);
      setResourcesTotal(totalValue);
      const aquariumValue = (user?.fishing?.aquarium?.fish ?? []).reduce(
        (total, fish) => total + getFishValue(fish),
        0
      );
      setTotalNetWorth((user?.money || 0) + totalValue + aquariumValue);
    },
    [banned, resourceMarketDisabled, user]
  );

  useEffect(() => {
    if (resourceMarketDisabled) {
      queueMicrotask(() => {
        setResourceListHydrated(true);
        setSortedResources([]);
        setResourcePrices({});
        setResourceQuantities({});
      });
      return;
    }

    const unsubscribe = subscribe('resources:prices', data => {
      void recomputeResources(data as { [key: string]: number }).then(() =>
        setResourceListHydrated(true)
      );
    });

    return unsubscribe;
  }, [resourceMarketDisabled, recomputeResources, subscribe]);

  useEffect(() => {
    if (resourceMarketDisabled) return;

    const unsubscribe = subscribe('resources:changes', data => {
      setResourceChanges(data as { [key: string]: number });
    });

    return unsubscribe;
  }, [resourceMarketDisabled, subscribe]);

  useEffect(() => {
    if (tab !== 'fishing' || fishingSubview !== 'aquarium') return;

    let cancelled = false;
    void getEventPreview().then(res => {
      if (!cancelled && res) {
        setEventPreview(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tab, fishingSubview]);

  useEffect(() => {
    if (!resourceMarketDisabled) return;
    queueMicrotask(() => {
      setMarketResourceDetails('gold');
    });
  }, [resourceMarketDisabled]);

  useEffect(() => {
    if (!fishingDisabled) return;
    queueMicrotask(() => {
      setIsRodsModalOpen(false);
      setIsBaitModalOpen(false);
      setIsFishSellModalOpen(false);
      setIsFishSellAllModalOpen(false);
      setAquariumFishToSell(null);
    });
  }, [fishingDisabled]);

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

  const isFeatureTabDisabled = (key: typeof tab) => {
    if (key === 'resources') return resourceMarketDisabled;
    if (key === 'fishing') return fishingDisabled;
    if (key === 'pets') return petsDisabled;
    if (key === 'social') return socialDisabled;
    return false;
  };

  const renderFeatureDisabled = (title: string) => (
    <div className={`tab-content ${styles['feature-disabled']}`}>
      <h2>{title}</h2>
      <p>This feature has been disabled by staff.</p>
    </div>
  );

  const renderCosmeticPreview = (cosmetic: Cosmetic) => {
    if (cosmetic.type === 'nameplate') {
      return (
        <Nameplate
          text="Monix User"
          styleKey={cosmetic.nameplateStyle}
          className={styles['nameplate-preview']}
        />
      );
    }
    if (cosmetic.type === 'tag') {
      return (
        <span className={`user-tag user-tag-large tag-colour-${cosmetic.tagColour}`}>
          <EmojiText>{cosmetic.tagIcon}</EmojiText> {cosmetic.tagName}
        </span>
      );
    }
    return null;
  };

  const renderCosmeticShopCard = (cosmetic: Cosmetic) => {
    const owned = user?.cosmetics_unlocked?.includes(cosmetic.id) ?? false;
    const insufficientGems = (user?.gems || 0) < (cosmetic.price || 0) && user?.gems !== -1;
    return (
      <div
        key={cosmetic.id}
        className={`${styles['cosmetic-card']} ${owned ? styles['cosmetic-owned'] : ''}`}
      >
        <div className={styles['cosmetic-card-top']}>
          {owned && (
            <span className={styles['cosmetic-owned-badge']}>
              <EmojiText>✓</EmojiText> Owned
            </span>
          )}
        </div>
        <h2 className={styles['cosmetic-name']}>{cosmetic.name}</h2>
        <span className={styles['cosmetic-rarity']}>
          <EmojiText>{rarityEmojis[cosmetic.rarity]}</EmojiText> {titleCase(cosmetic.rarity)}
        </span>
        <div className={styles['cosmetic-preview']}>{renderCosmeticPreview(cosmetic)}</div>
        <div className="spacer"></div>
        <div className={styles['cosmetic-buy-row']}>
          <span className={styles['cosmetic-price']} title={`${cosmetic.price || 0} Gems`}>
            <EmojiText>💎</EmojiText> {smartFormatNumber(cosmetic.price || 0, false, false, false)}
          </span>
          <Button
            className={styles['cosmetic-action']}
            disabled={owned || insufficientGems}
            onClick={() => {
              if (owned) return;
              setPaymentModalUpgradeId(null);
              setPaymentModalRodId(null);
              setPaymentModalBaitId(null);
              setPaymentModalAquarium(false);
              setPaymentModalSellRodId(null);
              setPaymentModalEventPreview(false);
              setPaymentModalCosmeticId(cosmetic.id);
              setIsPaymentModalOpen(true);
            }}
          >
            {owned ? 'Purchased' : 'Buy'}
          </Button>
        </div>
      </div>
    );
  };

  const renderCosmeticOwnedCard = (cosmetic: Cosmetic) => {
    const equipped = user?.equipped_cosmetics?.[cosmetic.type] === cosmetic.id;
    return (
      <div key={cosmetic.id} className={`${styles['cosmetic-card']} ${equipped ? 'equipped' : ''}`}>
        <h2 className={styles['cosmetic-name']}>{cosmetic.name}</h2>
        <span className={styles['cosmetic-rarity']}>
          <EmojiText>{rarityEmojis[cosmetic.rarity]}</EmojiText> {titleCase(cosmetic.rarity)}
        </span>
        <div className={styles['cosmetic-preview']}>{renderCosmeticPreview(cosmetic)}</div>
        <div className="spacer"></div>
        <Button
          className={styles['cosmetic-action']}
          onClickAsync={async () => {
            if (equipped) {
              await unequipCosmetic(cosmetic.type);
            } else {
              await equipCosmetic(cosmetic.id);
            }
            await updateEverything();
          }}
        >
          {equipped ? 'Unequip' : 'Equip'}
        </Button>
      </div>
    );
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isLoadingPaymentModal, setIsLoadingPaymentModal] = useState<boolean>(false);
  const [paymentModalCosmeticId, setPaymentModalCosmeticId] = useState<string | null>(null);
  const [paymentModalUpgradeId, setPaymentModalUpgradeId] = useState<string | null>(null);
  const [paymentModalRodId, setPaymentModalRodId] = useState<string | null>(null);
  const [paymentModalBaitId, setPaymentModalBaitId] = useState<string | null>(null);
  const [paymentModalBaitQty, setPaymentModalBaitQty] = useState<number>(1);
  const [paymentModalAquarium, setPaymentModalAquarium] = useState<boolean>(false);
  const [paymentModalSellRodId, setPaymentModalSellRodId] = useState<string | null>(null);
  const [paymentModalEventPreview, setPaymentModalEventPreview] = useState<boolean>(false);

  const isMoneyPayment =
    paymentModalSellRodId ||
    paymentModalUpgradeId ||
    paymentModalRodId ||
    paymentModalBaitId ||
    paymentModalAquarium;

  const paymentModalAmount = (() => {
    if (paymentModalSellRodId)
      return Math.floor((fishingRods.find(r => r.id === paymentModalSellRodId)?.price || 0) * 0.5);
    if (paymentModalUpgradeId)
      return UPGRADES.find(u => u.id === paymentModalUpgradeId)?.price_per_half_hour || 0;
    if (paymentModalRodId) return fishingRods.find(r => r.id === paymentModalRodId)?.price || 0;
    if (paymentModalBaitId)
      return (
        (fishingBaits.find(b => b.id === paymentModalBaitId)?.price || 0) * paymentModalBaitQty
      );
    if (paymentModalAquarium) return getAquariumUpgradeCost(user?.fishing?.aquarium.level || 1);
    if (paymentModalEventPreview) return 10;
    return cosmetics.find(c => c.id === paymentModalCosmeticId)?.price || 0;
  })();

  const paymentModalProductName = (() => {
    if (paymentModalSellRodId)
      return `${fishingRods.find(r => r.id === paymentModalSellRodId)?.name || 'Unknown Rod'} (Sale)`;
    if (paymentModalUpgradeId)
      return UPGRADES.find(u => u.id === paymentModalUpgradeId)?.name || 'Unknown Upgrade';
    if (paymentModalRodId)
      return fishingRods.find(r => r.id === paymentModalRodId)?.name || 'Unknown Rod';
    if (paymentModalBaitId)
      return fishingBaits.find(b => b.id === paymentModalBaitId)?.name || 'Unknown Bait';
    if (paymentModalAquarium) return 'Aquarium Upgrade';
    if (paymentModalEventPreview) return 'Fishing Event Preview';
    return cosmetics.find(c => c.id === paymentModalCosmeticId)?.name || 'Unknown Cosmetic';
  })();

  return (
    <>
      <div className="app-container">
        {debugOverlayEnabled && <DebugOverlay position={debugOverlayPosition} />}
        <NotificationToasts
          toasts={toasts}
          onDismiss={dismissToast}
          onClick={toast => {
            if (socialDisabled) return;
            if (socialRooms.some(r => r.uuid === toast.roomUuid)) {
              setSocialRoom(toast.roomUuid);
            }
            setTabTo('social');
          }}
        />
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
                    { key: 'fishing', label: '🎣 Fishing' },
                    { key: 'pets', label: '🐶 Pets' },
                    { key: 'social', label: '💬 Social' },
                    { key: 'radio', label: '📻 Radio' },
                    { key: 'upgrades', label: '⚡ Upgrades' },
                    { key: 'achievements', label: '🏅 Achievements' },
                    { key: 'leaderboard', label: '🏆 Leaderboard' },
                    { key: 'store', label: '🛒 Store' },
                    { key: 'cosmetics', label: '🎨 Cosmetics' },
                    { key: 'stats', label: '📊 Stats' },
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
                  className={`tab ${tab === t.key ? 'active' : ''} ${!gameHydrated || isFeatureTabDisabled(t.key) ? 'disabled' : ''}`}
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
                  {t.key === 'social' && totalUnread > 0 && (
                    <span className={styles['social-notif-dot']} />
                  )}
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
              <Avatar src={user?.avatar_data_uri} size={24} className="user-avatar" />
              <Nameplate
                text={user ? user.username : 'User'}
                styleKey={effectiveNameplateStyle}
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
              {equippedTagCosmetic && (
                <span className={`user-tag tag-colour-${equippedTagCosmetic.tagColour}`}>
                  <EmojiText>{equippedTagCosmetic.tagIcon}</EmojiText> {equippedTagCosmetic.tagName}
                </span>
              )}
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
              <div className={styles['money-tab-content']}>
                <h1 className="mono">
                  <span>{smartFormatNumber(totalNetWorth)}</span>
                </h1>
                <div className={styles['money-info']}>
                  <span className={styles['money-info-line']}>
                    <EmojiText>💰 Money: </EmojiText>
                    <span className="mono">{smartFormatNumber(user?.money || 0)}</span>
                  </span>
                  <span className={styles['money-info-line']}>
                    <EmojiText>💎 Gems: </EmojiText>
                    <span className="mono">{smartFormatNumber(user?.gems || 0, false, true)}</span>
                  </span>
                  <span className={styles['money-info-line']}>
                    <EmojiText>📈 Resources: </EmojiText>
                    <span className="mono">{smartFormatNumber(resourcesTotal)}</span>
                  </span>
                  <span className={styles['money-info-line']}>
                    <EmojiText>🎣 Aquarium: </EmojiText>
                    <span className="mono">{smartFormatNumber(aquariumTotal)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          {tab === 'resources' &&
            (resourceMarketDisabled ? (
              renderFeatureDisabled('Resources')
            ) : (
              <div className="tab-content">
                <NewsTicker />
                <div className={styles['resource-list-header']}>
                  <h2>Resources</h2>
                  <span>
                    <b>Total Value:</b> {smartFormatNumber(resourcesTotal)}
                  </span>
                </div>
                <div className={styles['resources-two-pane']}>
                  <ResourceList
                    onSelect={(resource: ResourceInfo) => {
                      setMarketResourceDetails(resource.id);
                    }}
                    resourceListHydrated={resourceListHydrated}
                    sortedResources={sortedResources}
                    resourcePrices={resourcePrices}
                    resourceChanges={resourceChanges}
                  />
                  <div className={styles['market-panel']}>
                    <div className={styles['market-panel-header']}>
                      <h2>
                        <EmojiText>{getResourceById(marketResourceDetails)?.icon}</EmojiText>{' '}
                        {getResourceById(marketResourceDetails)?.name}
                      </h2>
                      <span className={`${styles['market-panel-price']} mono`}>
                        {smartFormatNumber(
                          resourcePrices[marketResourceDetails] ||
                            getResourceById(marketResourceDetails)?.basePrice ||
                            0,
                          false,
                          true
                        )}
                      </span>
                    </div>
                    <ResourceGraph resource={getResourceById(marketResourceDetails)!} />
                    <BuySellPanel
                      key={marketResourceDetails}
                      resource={getResourceById(marketResourceDetails)!}
                      quantity={resourceQuantities[marketResourceDetails] || 0}
                      resourcePrice={resourcePrices[marketResourceDetails] || 0}
                      money={user ? user.money || 0 : 0}
                      onBuySell={mode => {
                        if (mode === 'buy' && isTutorialOpen && tab === 'resources') {
                          setTutorialProgress(prev => ({ ...prev, boughtResource: true }));
                        }
                        void updateEverything();
                        const fetchQuantity = async () => {
                          const qty = await getResourceQuantity(marketResourceDetails);
                          setResourceQuantities(prev => ({
                            ...prev,
                            [marketResourceDetails]: qty || 0,
                          }));
                        };
                        void fetchQuantity();
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          {tab === 'fishing' &&
            (fishingDisabled ? (
              renderFeatureDisabled('Fishing')
            ) : (
              <div className={`tab-content ${styles['fishing-tab']}`}>
                <div className={styles['fishing-subview-tabs']} role="tablist">
                  <button
                    type="button"
                    className={`${styles['fishing-subview-tab']} ${
                      fishingSubview === 'fishing' ? 'active' : ''
                    }`}
                    onClick={() => setFishingSubview('fishing')}
                  >
                    <EmojiText>🎣 Fishing</EmojiText>
                  </button>
                  <button
                    type="button"
                    className={`${styles['fishing-subview-tab']} ${
                      fishingSubview === 'aquarium' ? 'active' : ''
                    }`}
                    onClick={() => setFishingSubview('aquarium')}
                  >
                    <EmojiText>🐠 Aquarium</EmojiText>
                  </button>
                  <button
                    type="button"
                    className={`${styles['fishing-subview-tab']} ${
                      fishingSubview === 'sailors' ? 'active' : ''
                    }`}
                    onClick={() => setFishingSubview('sailors')}
                  >
                    <EmojiText>⛵ Sailors</EmojiText>
                  </button>
                </div>
                {fishingSubview === 'fishing' && (
                  <>
                    <div className={styles['fishing-container']}>
                      <div className={styles['fishing-hgrid']}>
                        <div className={styles['fishing-left']}>
                          <div className={styles['fishing-card']}>
                            <h2>
                              <EmojiText>🐟</EmojiText> Go Fishing!
                            </h2>
                            <div className={styles['fishing-card-actions']}>
                              <Checkbox
                                label="Auto-sell fish"
                                checked={autoSellEnabled}
                                onClick={setAutoSellEnabled}
                              />
                              <Button
                                onClickAsync={async () => {
                                  const result = await goFishing(autoSellEnabled);

                                  if (result) {
                                    setIsShowingFishingResults(true);
                                    setLastCatch(result);
                                    if (isTutorialOpen) {
                                      setTutorialProgress(prev => ({
                                        ...prev,
                                        caughtFish: true,
                                      }));
                                    }

                                    if (autoSellEnabled) {
                                      setWasLastCatchAutoSold(true);
                                    } else {
                                      setWasLastCatchAutoSold(false);
                                    }

                                    await updateEverything();
                                  }
                                }}
                                disabled={
                                  (user?.fishing?.last_fished_at || 0) + fishingCooldownMs >
                                    fishingNow ||
                                  ((user?.fishing?.aquarium.fish.length || 0) >=
                                    (user?.fishing?.aquarium.capacity || 0) &&
                                    !autoSellEnabled)
                                }
                              >
                                {(() => {
                                  if (
                                    (user?.fishing?.last_fished_at || 0) + fishingCooldownMs >
                                    fishingNow
                                  ) {
                                    return `Wait ${formatRemainingMilliseconds(
                                      (user?.fishing?.last_fished_at || 0) +
                                        fishingCooldownMs -
                                        fishingNow
                                    )}`;
                                  }
                                  const isAquariumFull =
                                    (user?.fishing?.aquarium.fish.length || 0) >=
                                      (user?.fishing?.aquarium.capacity || 0) && !autoSellEnabled;
                                  return isAquariumFull ? 'Aquarium Full' : 'Cast a Line!';
                                })()}
                              </Button>
                            </div>
                            {isShowingFishingResults && lastCatch && (
                              <div className={styles['fishing-results']}>
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
                                <p className={styles['fishing-result-weight']}>
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
                                <p className={styles['fishing-result-value']}>
                                  Value:{' '}
                                  <span className="mono">
                                    {smartFormatNumber(getFishValue(lastCatch.fishCaught))}
                                  </span>
                                </p>
                                <div className={styles['fishing-result-modifiers']}>
                                  <span className={styles['fishing-result-modifiers-label']}>
                                    Modifiers:
                                  </span>
                                  {lastCatch.fishCaught.modifiers?.length ? (
                                    <div className={styles['fishing-result-modifier-list']}>
                                      {lastCatch.fishCaught.modifiers.map(mod => {
                                        const modifier = fishModifiers.find(fm => fm.id === mod);
                                        if (!modifier) return null;
                                        return (
                                          <span
                                            key={modifier.id}
                                            className={styles['fishing-result-modifier']}
                                          >
                                            <EmojiText>{modifier.icon}</EmojiText> {modifier.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className={styles['fishing-result-none']}>None</span>
                                  )}
                                </div>

                                <div className={styles['fishing-result-buttons']}>
                                  <Button
                                    secondary
                                    onClick={() => {
                                      setIsShowingFishingResults(false);
                                      setLastCatch(null);
                                    }}
                                  >
                                    Dismiss
                                  </Button>
                                  {!wasLastCatchAutoSold ? (
                                    <Button
                                      onClickAsync={async () => {
                                        await sellFish(lastCatch.fishCaught.uuid);
                                        await updateEverything();
                                        setIsShowingFishingResults(false);
                                        setLastCatch(null);
                                      }}
                                    >
                                      Sell
                                    </Button>
                                  ) : (
                                    <span className={styles['auto-sold']}>Auto-sold</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="fishing-right">
                          <div className={styles['fishing-vgrid']}>
                            <div className="fishing-top">
                              <div className={styles['fishing-card']}>
                                <div className={styles['fishing-card-header']}>
                                  <h2>
                                    <EmojiText>🎣</EmojiText> Rods
                                  </h2>
                                  <Button onClick={() => setIsRodsModalOpen(true)}>Buy Rods</Button>
                                </div>
                                <div className={styles['fishing-grid']}>
                                  {(() => {
                                    const ownedRods = [...(user?.fishing?.rods_owned || [])].sort(
                                      (a, b) => {
                                        const rodA = fishingRods.find(r => r.id === a);
                                        const rodB = fishingRods.find(r => r.id === b);
                                        if (!rodA || !rodB) return 0;
                                        return rodB.multiplier - rodA.multiplier;
                                      }
                                    );
                                    if (ownedRods.length === 0) {
                                      return <p>You don't own any rods yet.</p>;
                                    }
                                    return ownedRods.map(rodId => {
                                      const rodInfo = fishingRods.find(r => r.id === rodId);

                                      if (!rodInfo) return null;

                                      const isEquipped = user?.fishing?.equipped_rod === rodId;
                                      const tier = getRodTierInfo(rodInfo.price);

                                      return (
                                        <div
                                          key={rodId}
                                          className={`${styles['fishing-grid-item']} ${isEquipped ? 'equipped' : ''}`}
                                        >
                                          <div className={styles['fishing-item-top']}>
                                            <span className={styles['fishing-item-type-badge']}>
                                              <EmojiText>{tier.emoji}</EmojiText> {tier.title}
                                            </span>
                                            {isEquipped && (
                                              <span
                                                className={styles['fishing-item-equipped-badge']}
                                              >
                                                <EmojiText>✓</EmojiText> Equipped
                                              </span>
                                            )}
                                          </div>
                                          <h3>{rodInfo.name}</h3>
                                          <span className={styles['rod-multiplier']}>
                                            x{rodInfo.multiplier} Multiplier
                                          </span>
                                          <div className="spacer"></div>
                                          <div className={styles['fishing-item-actions']}>
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
                                            {rodInfo.buyable && rodInfo.price > 0 && (
                                              <Button
                                                color="red"
                                                secondary
                                                onClick={() => {
                                                  setPaymentModalCosmeticId(null);
                                                  setPaymentModalUpgradeId(null);
                                                  setPaymentModalBaitId(null);
                                                  setPaymentModalAquarium(false);
                                                  setPaymentModalRodId(null);
                                                  setPaymentModalEventPreview(false);
                                                  setPaymentModalSellRodId(rodId);
                                                  setIsPaymentModalOpen(true);
                                                }}
                                              >
                                                Sell
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div className={styles['fishing-bottom']}>
                              <div className={styles['fishing-card']}>
                                <span className={styles['fishing-card-header']}>
                                  <h2>
                                    <EmojiText>🪱</EmojiText> Bait
                                  </h2>
                                  <span className={styles['fishing-card-actions-row']}>
                                    <Button
                                      disabled={!user?.fishing?.equipped_bait}
                                      onClickAsync={async () => {
                                        await unequipBait();
                                        await updateEverything();
                                      }}
                                    >
                                      {user?.fishing?.equipped_bait
                                        ? 'De-equip bait'
                                        : 'No bait equipped'}
                                    </Button>
                                    <Button onClick={() => setIsBaitModalOpen(true)}>
                                      Buy Bait
                                    </Button>
                                  </span>
                                </span>

                                <div className={styles['fishing-grid']}>
                                  {(() => {
                                    const ownedBaits = fishingBaits
                                      .filter(b => (user?.fishing?.bait_owned?.[b.id] || 0) > 0)
                                      .sort(
                                        (a, b) =>
                                          (user?.fishing?.bait_owned?.[b.id] || 0) -
                                          (user?.fishing?.bait_owned?.[a.id] || 0)
                                      );
                                    if (ownedBaits.length === 0) {
                                      return <p>You don't own any bait yet.</p>;
                                    }
                                    return ownedBaits.map(bait => {
                                      const quantity = user?.fishing?.bait_owned?.[bait.id] || 0;
                                      const isEquipped = user?.fishing?.equipped_bait === bait.id;
                                      return (
                                        <div
                                          key={bait.id}
                                          className={`${styles['fishing-grid-item']} ${isEquipped ? 'equipped' : ''}`}
                                        >
                                          <h3>{bait.name}</h3>
                                          <div className={styles['bait-pills']}>
                                            {bait.fish_types_boosted.map(typeId => {
                                              const typeInfo = fishTypes.find(t => t.id === typeId);
                                              if (!typeInfo) return null;
                                              return (
                                                <span key={typeId} className={styles['bait-pill']}>
                                                  <EmojiText>{typeInfo.icon}</EmojiText>{' '}
                                                  {typeInfo.name}
                                                </span>
                                              );
                                            })}
                                          </div>
                                          <span className={styles['bait-price']}>
                                            x{quantity} Owned
                                          </span>
                                          <div className="spacer"></div>
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
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Modal
                      isOpen={isRodsModalOpen}
                      onClose={() => setIsRodsModalOpen(false)}
                      width={700}
                    >
                      <div className={styles['fishing-modal']}>
                        <h2>
                          <EmojiText>🎣</EmojiText> Rods Shop
                        </h2>
                        {rodSections.map(section => (
                          <div key={section.id} className={styles['fishing-modal-section']}>
                            <div className={styles['fishing-modal-section-header']}>
                              <h3>{section.title}</h3>
                              <div className={styles['fishing-modal-section-meta']}>
                                <span className={styles['fishing-modal-section-subtitle']}>
                                  {section.subtitle}
                                </span>
                                <button
                                  className={styles['fishing-modal-section-toggle']}
                                  type="button"
                                  aria-expanded={!!openRodSections[section.id]}
                                  onClick={() => toggleRodSection(section.id)}
                                >
                                  {openRodSections[section.id] ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </div>
                            {openRodSections[section.id] && (
                              <div className={styles['fishing-modal-grid']}>
                                {section.rods.map(rod => (
                                  <div key={rod.id} className={styles['fishing-modal-card']}>
                                    <h3>{rod.name}</h3>
                                    <p>
                                      Price:{' '}
                                      <span className="mono">{smartFormatNumber(rod.price)}</span>
                                    </p>
                                    <span>{rod.multiplier}x Multiplier</span>

                                    <Button
                                      disabled={
                                        !user ||
                                        (user.money || 0) < rod.price ||
                                        (user.fishing?.rods_owned || []).includes(rod.id)
                                      }
                                      onClick={() => {
                                        if ((user?.fishing?.rods_owned || []).includes(rod.id))
                                          return;
                                        setPaymentModalCosmeticId(null);
                                        setPaymentModalUpgradeId(null);
                                        setPaymentModalBaitId(null);
                                        setPaymentModalAquarium(false);
                                        setPaymentModalSellRodId(null);
                                        setPaymentModalEventPreview(false);
                                        setPaymentModalRodId(rod.id);
                                        setIsPaymentModalOpen(true);
                                      }}
                                    >
                                      {(user?.fishing?.rods_owned || []).includes(rod.id)
                                        ? 'Owned'
                                        : 'Buy'}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Modal>

                    <Modal
                      isOpen={isBaitModalOpen}
                      onClose={() => setIsBaitModalOpen(false)}
                      width={700}
                    >
                      <div className={styles['fishing-modal']}>
                        <h2>
                          <EmojiText>🪱</EmojiText> Bait Shop
                        </h2>
                        {baitSections.map(section => (
                          <div key={section.id} className={styles['fishing-modal-section']}>
                            <div className={styles['fishing-modal-section-header']}>
                              <h3>{section.title}</h3>
                              <div className={styles['fishing-modal-section-meta']}>
                                <span className={styles['fishing-modal-section-subtitle']}>
                                  {section.subtitle}
                                </span>
                                <button
                                  className={styles['fishing-modal-section-toggle']}
                                  type="button"
                                  aria-expanded={!!openBaitSections[section.id]}
                                  onClick={() => toggleBaitSection(section.id)}
                                >
                                  {openBaitSections[section.id] ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </div>
                            {openBaitSections[section.id] && (
                              <div className={styles['fishing-modal-grid']}>
                                {section.baits.map(bait => (
                                  <div key={bait.id} className={styles['fishing-modal-card']}>
                                    <h3>{bait.name}</h3>
                                    <div className={styles['bait-pills']}>
                                      {bait.fish_types_boosted.map(typeId => {
                                        const typeInfo = fishTypes.find(t => t.id === typeId);
                                        if (!typeInfo) return null;
                                        return (
                                          <span key={typeId} className={styles['bait-pill']}>
                                            <EmojiText>{typeInfo.icon}</EmojiText> {typeInfo.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <p>
                                      Cost:{' '}
                                      <span className="mono">
                                        {smartFormatNumber(
                                          bait.price * (baitQuantities[bait.id] || 1)
                                        )}
                                      </span>
                                    </p>
                                    <div className={styles['bait-quantity-control']}>
                                      <button
                                        type="button"
                                        className={styles['bait-quantity-button']}
                                        onClick={() =>
                                          setBaitQuantity(
                                            bait.id,
                                            (baitQuantities[bait.id] || 1) - 1
                                          )
                                        }
                                      >
                                        -
                                      </button>
                                      <input
                                        className={styles['bait-quantity-input']}
                                        type="number"
                                        min={1}
                                        value={baitQuantities[bait.id] || 1}
                                        onChange={event =>
                                          setBaitQuantity(bait.id, Number(event.target.value))
                                        }
                                      />
                                      <button
                                        type="button"
                                        className={styles['bait-quantity-button']}
                                        onClick={() =>
                                          setBaitQuantity(
                                            bait.id,
                                            (baitQuantities[bait.id] || 1) + 1
                                          )
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                    <Button
                                      disabled={
                                        !user ||
                                        (user.money || 0) <
                                          bait.price * (baitQuantities[bait.id] || 1)
                                      }
                                      onClick={() => {
                                        setPaymentModalCosmeticId(null);
                                        setPaymentModalUpgradeId(null);
                                        setPaymentModalRodId(null);
                                        setPaymentModalAquarium(false);
                                        setPaymentModalSellRodId(null);
                                        setPaymentModalEventPreview(false);
                                        setPaymentModalBaitId(bait.id);
                                        setPaymentModalBaitQty(baitQuantities[bait.id] || 1);
                                        setIsPaymentModalOpen(true);
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
                  </>
                )}
                {fishingSubview === 'aquarium' && (
                  <>
                    <div className={styles['aquarium-tab']}>
                      <div className={styles['aquarium-banner']}>
                        <span className={styles['aquarium-banner-subtitle']}>
                          CURRENT FISHING EVENT
                        </span>
                        <h3 className={styles['aquarium-banner-title']}>
                          {currentFishingEvent.event ? (
                            <>
                              <EmojiText>{currentFishingEvent.event.icon}</EmojiText>{' '}
                              {currentFishingEvent.event.name}
                            </>
                          ) : (
                            'No active event'
                          )}
                        </h3>
                        <span className={styles['aquarium-banner-remaining']}>
                          {formatRemainingTime(
                            Math.max(0, Math.floor((currentFishingEvent.endsAt - eventNow) / 1000))
                          )}{' '}
                          {currentFishingEvent.event ? 'remaining' : 'until next event'}
                        </span>
                      </div>
                      <div className={styles['aquarium-info']}>
                        {(() => {
                          const fishLength = user?.fishing?.aquarium.fish.length ?? 0;
                          const capacity = user?.fishing?.aquarium.capacity ?? 0;

                          if (fishLength === 0) {
                            return (
                              <>
                                Your aquarium is empty. Catch some fish to display them here!{' '}
                                <span className={styles['aquarium-data']}>
                                  {fishLength}/{capacity}
                                </span>{' '}
                                fish in aquarium.
                              </>
                            );
                          }

                          if (fishLength !== capacity) {
                            return (
                              <>
                                You are using{' '}
                                <span className={styles['aquarium-data']}>{fishLength}</span> out of{' '}
                                <span className={styles['aquarium-data']}>{capacity}</span> capacity
                                in your aquarium.
                              </>
                            );
                          }

                          return (
                            <>
                              Your aquarium is at full capacity! Try upgrading your aquarium to fit
                              more fish.{' '}
                              <span className={styles['aquarium-data']}>
                                {fishLength}/{capacity}
                              </span>{' '}
                              fish in aquarium.
                            </>
                          );
                        })()}
                      </div>
                      <div className={styles['aquarium-action-row']}>
                        <div className={styles['aquarium-buttons']}>
                          <Button
                            onClick={() => {
                              setPaymentModalCosmeticId(null);
                              setPaymentModalUpgradeId(null);
                              setPaymentModalRodId(null);
                              setPaymentModalBaitId(null);
                              setPaymentModalSellRodId(null);
                              setPaymentModalEventPreview(false);
                              setPaymentModalAquarium(true);
                              setIsPaymentModalOpen(true);
                            }}
                            disabled={
                              !user ||
                              (user.money || 0) <
                                getAquariumUpgradeCost(user?.fishing?.aquarium.level || 1)
                            }
                          >
                            Upgrade Aquarium for{' '}
                            {smartFormatNumber(
                              getAquariumUpgradeCost(user?.fishing?.aquarium.level || 1)
                            )}
                          </Button>
                          <Button
                            onClick={async () => {
                              const res = await getEventPreview();
                              if (res?.unlocked) {
                                setEventPreview(res);
                                setIsEventPreviewModalOpen(true);
                                return;
                              }
                              if (res) {
                                setEventPreview(res);
                                setPaymentModalCosmeticId(null);
                                setPaymentModalUpgradeId(null);
                                setPaymentModalRodId(null);
                                setPaymentModalBaitId(null);
                                setPaymentModalSellRodId(null);
                                setPaymentModalAquarium(false);
                                setPaymentModalEventPreview(true);
                                setIsPaymentModalOpen(true);
                              }
                            }}
                          >
                            Upcoming Events
                          </Button>
                          <Button
                            onClick={() => setIsFishSellAllModalOpen(true)}
                            disabled={(user?.fishing?.aquarium.fish.length || 0) <= 0}
                          >
                            Sell All
                          </Button>
                        </div>
                        <div className={styles['aquarium-controls']}>
                          <div className={styles['aquarium-control-group']}>
                            <span className={styles['aquarium-control-label']}>Sort</span>
                            <Select
                              value={aquariumSort}
                              onChange={value =>
                                setAquariumSort(value as 'value-desc' | 'value-asc')
                              }
                              options={[
                                { label: 'Value: High to Low', value: 'value-desc' },
                                { label: 'Value: Low to High', value: 'value-asc' },
                              ]}
                              disabled={(user?.fishing?.aquarium.fish.length || 0) <= 1}
                            />
                          </div>
                          <div className={styles['aquarium-control-group']}>
                            <span className={styles['aquarium-control-label']}>Filter</span>
                            <Select
                              value={aquariumModifierFilter}
                              onChange={value =>
                                setAquariumModifierFilter(value as 'all' | 'with' | 'without')
                              }
                              options={[
                                { label: 'All Fish', value: 'all' },
                                { label: 'Has Modifiers', value: 'with' },
                                { label: 'No Modifiers', value: 'without' },
                              ]}
                              disabled={(user?.fishing?.aquarium.fish.length || 0) === 0}
                            />
                          </div>
                        </div>
                      </div>
                      {aquariumFishView.length === 0 &&
                        (user?.fishing?.aquarium.fish.length || 0) > 0 && (
                          <div className={styles['aquarium-empty']}>
                            No fish match those filters.
                          </div>
                        )}
                      <div className={styles['aquarium-grid']}>
                        {aquariumFishView.map(fish => (
                          <div key={fish.uuid} className={styles['aquarium-fish-card']}>
                            <h3>
                              <EmojiText>
                                {fishTypes.find(ft => ft.id === fish.type)?.icon}
                              </EmojiText>{' '}
                              {fishTypes.find(ft => ft.id === fish.type)?.name}
                            </h3>
                            <span className={styles['aquarium-fish-weight']}>
                              {fish.weight >= 1000 ? (
                                <span className="mono">
                                  {smartFormatNumber(fish.weight / 1000, false)} tonnes
                                </span>
                              ) : (
                                <span className="mono">
                                  {smartFormatNumber(fish.weight, false)} kg
                                </span>
                              )}
                            </span>
                            <div className={styles['aquarium-fish-modifiers']}>
                              {fish.modifiers?.map(mod => (
                                <span
                                  key={fishModifiers.find(fm => fm.id === mod)?.id}
                                  className={styles['aquarium-fish-modifier']}
                                >
                                  <EmojiText>
                                    {fishModifiers.find(fm => fm.id === mod)?.icon}
                                  </EmojiText>{' '}
                                  {fishModifiers.find(fm => fm.id === mod)?.name}
                                </span>
                              ))}
                            </div>
                            <span>
                              VALUE:{' '}
                              <span className={`${styles['aquarium-fish-value']} mono`}>
                                {smartFormatNumber(getFishValue(fish))}
                              </span>
                            </span>
                            <Button
                              className={styles['aquarium-fish-sell-button']}
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

                      <Modal
                        isOpen={isFishSellAllModalOpen}
                        onClose={() => setIsFishSellAllModalOpen(false)}
                      >
                        <div className={styles['fish-sell-modal']}>
                          <h2>Sell All Fish</h2>
                          <p>
                            Are you sure you want to sell all your fish for{' '}
                            <span className="mono">
                              {smartFormatNumber(
                                (user?.fishing?.aquarium.fish ?? []).reduce(
                                  (total, fish) => total + getFishValue(fish),
                                  0
                                )
                              )}
                            </span>
                            ?
                          </p>
                          <div className={styles['fish-sell-modal-buttons']}>
                            <Button onClick={() => setIsFishSellAllModalOpen(false)} secondary>
                              Cancel
                            </Button>
                            <Button
                              onClickAsync={async () => {
                                await sellAllFish();
                                setIsFishSellAllModalOpen(false);
                                await updateEverything();
                              }}
                            >
                              Sell All
                            </Button>
                          </div>
                        </div>
                      </Modal>

                      <Modal
                        isOpen={isFishSellModalOpen}
                        onClose={() => setIsFishSellModalOpen(false)}
                      >
                        <div className={styles['fish-sell-modal']}>
                          <h2>Sell Fish</h2>
                          <p>
                            Are you sure you want to sell this fish for{' '}
                            <span className="mono">
                              {smartFormatNumber(
                                user?.fishing?.aquarium.fish.find(
                                  f => f.uuid === aquariumFishToSell
                                )
                                  ? getFishValue(
                                      user.fishing.aquarium.fish.find(
                                        f => f.uuid === aquariumFishToSell
                                      )!
                                    )
                                  : 0
                              )}
                            </span>
                            ?
                          </p>
                          <div className={styles['fish-sell-modal-buttons']}>
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

                      <Modal
                        isOpen={isEventPreviewModalOpen}
                        onClose={() => setIsEventPreviewModalOpen(false)}
                      >
                        <div className={styles['event-preview-modal']}>
                          <h2>Upcoming Fishing Events</h2>
                          <div className={styles['event-preview-list']}>
                            {eventPreview?.events?.map((event, idx) => (
                              <div
                                key={`${event.event?.id ?? 'unknown'}-${event.startAt}-${idx}`}
                                className={styles['event-preview-item']}
                              >
                                <EmojiText>{event.event?.icon}</EmojiText>
                                <div className={styles['event-preview-item-info']}>
                                  <span className={styles['event-preview-item-name']}>
                                    {event.event?.name ?? 'No event'}
                                  </span>
                                  <span className={styles['event-preview-item-time']}>
                                    {new Date(event.startAt).toLocaleString(undefined, {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Modal>
                    </div>
                  </>
                )}
                {fishingSubview === 'sailors' && (
                  <>
                    <div className={styles['sailors-tab']}>
                      <div className={styles['sailors-banner']}>
                        <span className={styles['sailors-banner-subtitle']}>
                          PASSIVE FISHING CREW
                        </span>
                        <h3 className={styles['sailors-banner-title']}>
                          <EmojiText>⛵</EmojiText> Sailors
                        </h3>
                        <span className={styles['sailors-banner-remaining']}>
                          {(() => {
                            const levels = user?.fishing?.sailors?.levels ?? [];
                            return `Earning ${smartFormatNumber(
                              getSailorFleetRatePerSec(levels)
                            )}/sec, held until collected`;
                          })()}
                        </span>
                      </div>

                      <div className={styles['sailors-action-row']}>
                        <div className={styles['sailors-buttons']}>
                          <Button
                            onClickAsync={async () => {
                              await collectSailorEarnings();
                              await updateEverything();
                            }}
                            disabled={!user || (user.fishing?.sailors?.pending_coins ?? 0) <= 0}
                          >
                            Collect {smartFormatNumber(user?.fishing?.sailors?.pending_coins ?? 0)}
                          </Button>
                          <Button
                            onClickAsync={async () => {
                              await hireSailor();
                              setFishingSubview('sailors');
                              await updateEverything();
                            }}
                            disabled={
                              !user ||
                              (user?.fishing?.sailors?.levels?.length ?? 0) >= SAILOR_MAX_LEVEL ||
                              (user.money || 0) <
                                getSailorHireCost(user?.fishing?.sailors?.levels?.length ?? 0)
                            }
                          >
                            Hire Sailor for{' '}
                            {smartFormatNumber(
                              getSailorHireCost(user?.fishing?.sailors?.levels?.length ?? 0)
                            )}
                          </Button>
                        </div>
                        <span className={styles['sailors-count']}>
                          {user?.fishing?.sailors?.levels?.length ?? 0} / {SAILOR_MAX_LEVEL} hired
                        </span>
                      </div>

                      {(() => {
                        const levels = user?.fishing?.sailors?.levels ?? [];
                        if (levels.length === 0) {
                          return (
                            <div className={styles['sailors-empty']}>
                              <EmojiText>🧑‍✈️</EmojiText> You have no sailors yet. Hire a sailor to
                              start passively fishing for you while you're online or away!
                            </div>
                          );
                        }
                        return (
                          <div className={styles['sailors-grid']}>
                            {levels.map((level, index) => {
                              const atMax = level >= SAILOR_MAX_LEVEL;
                              const cost = getSailorLevelUpCost(level);
                              const rate = getSailorFleetRatePerSec([level]);
                              return (
                                <div key={index} className={styles['sailor-card']}>
                                  <h3>
                                    <EmojiText>🧑‍✈️</EmojiText> Sailor {index + 1}
                                  </h3>
                                  <span className={styles['sailor-level']}>Level {level}</span>
                                  <span className={styles['sailor-rate']}>
                                    <span className="mono">{smartFormatNumber(rate)}</span>/sec
                                  </span>
                                  <Button
                                    onClickAsync={async () => {
                                      await levelUpSailor(index);
                                      await updateEverything();
                                    }}
                                    disabled={atMax || !user || (user.money || 0) < cost}
                                  >
                                    {atMax
                                      ? `Max Level ${SAILOR_MAX_LEVEL}`
                                      : `Level Up for ${smartFormatNumber(cost)}`}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            ))}
          {tab === 'pets' &&
            (petsDisabled ? (
              renderFeatureDisabled('Pets')
            ) : (
              <div className="tab-content">
                <h2>Pets</h2>
                <PetsList
                  money={user?.money || 0}
                  petSlots={user?.pet_slots}
                  userUuid={user?.uuid ?? ''}
                  refreshUser={updateEverything}
                />
              </div>
            ))}
          {tab === 'social' &&
            (socialDisabled ? (
              renderFeatureDisabled('Social')
            ) : (
              <div className="tab-content">
                <Social
                  room={socialRooms.find(r => r.uuid === socialRoom)!}
                  setRoom={room => setSocialRoom(room.uuid)}
                  rooms={socialRooms}
                  user={user!}
                  unreadByRoom={unreadByRoom}
                />
              </div>
            ))}
          {tab === 'radio' && (
            <div className="tab-content">
              <h2>Monix Radio</h2>
              <div className={styles['now-playing-card']}>
                {currentTrack && (
                  <img
                    src={currentTrack?.coverSrc || undefined}
                    alt="Current Track Artwork"
                    className={styles['song-cover']}
                  />
                )}
                {!currentTrack && (
                  <div className={`${styles['song-cover']} placeholder-cover`}>
                    <IconMusic size={64} />
                  </div>
                )}
                <div className={styles['song-info']}>
                  {currentTrack && (
                    <>
                      <span className={styles['song-subtitle']}>Now Playing</span>
                      <span className={styles['song-name']}>
                        {currentTrack?.title || 'Nothing'}
                      </span>
                      <span className={styles['song-artist']}>
                        by <span>{currentTrack?.artist || 'Nobody'}</span>
                      </span>
                    </>
                  )}
                  {!currentTrack && (
                    <span className={styles['song-subtitle']}>Nothing is playing</span>
                  )}
                </div>
                <div className="spacer"></div>
                <div className={styles['song-controls']}>
                  {!isPlaying ? (
                    <button
                      className={styles['song-control']}
                      aria-label="Play"
                      onClick={handlePlay}
                      disabled={isPlaying}
                    >
                      <IconPlayerPlay size={20} />
                    </button>
                  ) : (
                    <button
                      className={styles['song-control']}
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
          {tab === 'upgrades' && (
            <div className="tab-content">
              <h2>Upgrades</h2>
              <div className={styles['prestige-panel']}>
                <div>
                  <h3>
                    <EmojiText>🌟</EmojiText> Prestige
                  </h3>
                  <p>
                    Reset money, resources, rods, and aquarium progress to earn permanent shards
                    based on net worth.
                  </p>
                  <span>
                    Prestiges: <b>{user?.prestige?.count || 0}</b> · Shards:{' '}
                    <b>{user?.prestige?.shards || 0}</b>
                  </span>
                </div>
                <Button
                  color="purple"
                  disabled={!user || user.money < 1_000_000_000}
                  onClickAsync={async () => {
                    if (
                      !globalThis.confirm(
                        'Prestige will reset your money, resources, rods, and aquarium. Continue?'
                      )
                    )
                      return;
                    if (await prestige()) await updateEverything();
                  }}
                >
                  Prestige for{' '}
                  {user
                    ? Math.floor(
                        Math.sqrt(
                          Math.max(
                            0,
                            user.money +
                              Object.entries(user.resources || {}).reduce(
                                (total, [id, quantity]) =>
                                  total +
                                  (resources.find(resource => resource.id === id)?.basePrice || 0) *
                                    quantity,
                                0
                              )
                          ) / 1_000_000_000
                        )
                      )
                    : 0}{' '}
                  shards
                </Button>
              </div>
              <h3 className={styles['upgrade-section-title']}>Permanent Upgrade Tree</h3>
              <div className={styles['upgrades-grid']}>
                {PERMANENT_UPGRADES.map(upgrade => {
                  const level = user?.permanent_upgrades?.[upgrade.id] || 0;
                  const cost = permanentUpgradeCost(upgrade, level);
                  return (
                    <div
                      key={upgrade.id}
                      className={`${styles['upgrade-card']} ${styles['permanent-upgrade-card']}`}
                    >
                      <h3 className={styles['upgrade-name']}>
                        <EmojiText>{upgrade.icon}</EmojiText> {upgrade.name}
                      </h3>
                      <p className={styles['upgrade-description']}>{upgrade.description}</p>
                      <span className={styles['upgrade-level']}>
                        Level {level} / {upgrade.maxLevel}
                      </span>
                      <Button
                        disabled={
                          level >= upgrade.maxLevel || !user || (user.prestige?.shards || 0) < cost
                        }
                        onClickAsync={async () => {
                          if (await buyPermanentUpgrade(upgrade.id)) await updateEverything();
                        }}
                      >
                        {level >= upgrade.maxLevel
                          ? 'Maxed'
                          : `Upgrade for ${cost} star${cost === 1 ? '' : 's'}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <h3 className={styles['upgrade-section-title']}>Timed Upgrades</h3>
              <div className={styles['upgrades-grid']}>
                {UPGRADES.sort((a, b) => {
                  // Sort by if it is active, and then alphabetically by name
                  const aActive =
                    user?.upgrades?.[a.id]?.expires_at &&
                    // eslint-disable-next-line react-hooks/purity
                    user?.upgrades[a.id].expires_at > Date.now();
                  const bActive =
                    user?.upgrades?.[b.id]?.expires_at &&
                    // eslint-disable-next-line react-hooks/purity
                    user?.upgrades[b.id].expires_at > Date.now();
                  if (aActive && !bActive) return -1;
                  if (!aActive && bActive) return 1;
                  return a.name.localeCompare(b.name);
                }).map(upgrade => {
                  const isActive =
                    user?.upgrades?.[upgrade.id]?.expires_at &&
                    // eslint-disable-next-line react-hooks/purity
                    user?.upgrades[upgrade.id].expires_at > Date.now();
                  return (
                    <div
                      key={upgrade.id}
                      className={`${styles['upgrade-card']} ${isActive ? 'active' : ''}`}
                    >
                      <h3 className={styles['upgrade-name']}>
                        <EmojiText>{upgrade.icon}</EmojiText> {upgrade.name}
                      </h3>
                      <p className={styles['upgrade-description']}>{upgrade.description}</p>
                      <div className="spacer"></div>
                      <Button
                        disabled={
                          isActive ||
                          !user ||
                          (user.money || 0) < (upgrade.price_per_half_hour || 0)
                        }
                        onClick={() => {
                          setPaymentModalCosmeticId(null);
                          setPaymentModalRodId(null);
                          setPaymentModalBaitId(null);
                          setPaymentModalAquarium(false);
                          setPaymentModalSellRodId(null);
                          setPaymentModalEventPreview(false);
                          setPaymentModalUpgradeId(upgrade.id);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        {isActive
                          ? `Active for ${
                              formatRemainingTime(
                                Math.max(
                                  0,
                                  // eslint-disable-next-line react-hooks/purity
                                  ((user.upgrades?.[upgrade.id]?.expires_at || 0) - Date.now()) /
                                    1000
                                )
                              ) || '0s'
                            }`
                          : `30mins for ${smartFormatNumber(upgrade.price_per_half_hour || 0)}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {tab === 'achievements' && (
            <div className="tab-content">
              <h2>Achievements</h2>
              <p className={styles['achievement-summary']}>
                {user?.achievements?.length || 0} / {ACHIEVEMENTS.length} unlocked
              </p>
              <div className={styles['achievements-grid']}>
                {ACHIEVEMENTS.map(achievement => {
                  const unlocked = user?.achievements?.includes(achievement.id) || false;
                  return (
                    <div
                      key={achievement.id}
                      className={`${styles['achievement-card']} ${unlocked ? styles['achievement-unlocked'] : ''}`}
                    >
                      <span className={styles['achievement-icon']}>
                        <EmojiText>{unlocked ? achievement.icon : '🔒'}</EmojiText>
                      </span>
                      <div>
                        <h3>{unlocked ? achievement.name : 'Locked Achievement'}</h3>
                        <p>{unlocked ? achievement.description : achievement.requirement}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {tab === 'leaderboard' && (
            <div className="tab-content">
              <Leaderboard />
            </div>
          )}
          {/* Gems moved into the Store tab as a subview */}
          {tab === 'store' && (
            <div className="tab-content">
              <div className={styles['store-header']}>
                <h2>Store</h2>
                <div className={styles['store-subtabs']}>
                  <button
                    type="button"
                    className={`${styles['store-subtab']} ${storeView === 'cosmetics' ? 'active' : ''}`}
                    onClick={() => setStoreView('cosmetics')}
                  >
                    🎨 Cosmetics
                  </button>
                  <button
                    type="button"
                    className={`${styles['store-subtab']} ${storeView === 'gems' ? 'active' : ''}`}
                    onClick={() => setStoreView('gems')}
                  >
                    💎 Gems
                  </button>
                </div>
              </div>

              {storeView === 'gems' && (
                <div className={styles['gems-section']}>
                  <h3>Gems Store</h3>
                  {gemPurchasesDisabled ? (
                    <p className={styles['feature-disabled-message']}>
                      Gem purchases have been disabled by staff.
                    </p>
                  ) : (
                    <div className={styles['gem-card-list']}>
                      <GemCard
                        amount={100}
                        price="A$1.00"
                        onClickAsync={async () => {
                          const url = await createPaymentSession('gems_pack_100', user!.username);
                          if (url) globalThis.location.href = url;
                        }}
                      />
                      <GemCard
                        amount={500}
                        price="A$4.50"
                        onClickAsync={async () => {
                          const url = await createPaymentSession('gems_pack_500', user!.username);
                          if (url) globalThis.location.href = url;
                        }}
                      />
                      <GemCard
                        amount={1000}
                        price="A$8.50"
                        onClickAsync={async () => {
                          const url = await createPaymentSession('gems_pack_1000', user!.username);
                          if (url) globalThis.location.href = url;
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {storeView === 'cosmetics' && (
                <>
                  {cosmeticPurchasesDisabled ? (
                    <p className={styles['feature-disabled-message']}>
                      Cosmetic purchases have been disabled by staff.
                    </p>
                  ) : (
                    <>
                      <div className={styles['cosmetics-store-controls']}>
                        <Checkbox
                          label="Hide already bought cosmetics"
                          checked={hideBoughtCosmetics}
                          onClick={setHideBoughtCosmetics}
                        />
                      </div>
                      {(() => {
                        const allBuyable = cosmetics.filter(c => c.buyable);
                        const buyable = cosmetics.filter(
                          c =>
                            c.buyable &&
                            (!hideBoughtCosmetics || !user?.cosmetics_unlocked?.includes(c.id))
                        );
                        if (buyable.length === 0) {
                          if (hideBoughtCosmetics && allBuyable.length > 0) {
                            return (
                              <p className={styles['no-cosmetics-message']}>
                                You have purchased every available cosmetic. Your filter is hiding
                                them, so nothing is shown here.
                              </p>
                            );
                          }
                          return (
                            <p className={styles['no-cosmetics-message']}>
                              No cosmetics are available for purchase at this time. Please check
                              back later or remove filters.
                            </p>
                          );
                        }
                        const nameplates = buyable.filter(c => c.type === 'nameplate');
                        const tags = buyable.filter(c => c.type === 'tag');
                        return (
                          <>
                            {nameplates.length > 0 && (
                              <div className={styles['cosmetics-section']}>
                                <h3 className={styles['cosmetics-section-title']}>
                                  <EmojiText>🪪</EmojiText> Nameplates
                                </h3>
                                <div className={styles['cosmetics-grid']}>
                                  {nameplates.map(renderCosmeticShopCard)}
                                </div>
                              </div>
                            )}
                            {tags.length > 0 && (
                              <div className={styles['cosmetics-section']}>
                                <h3 className={styles['cosmetics-section-title']}>
                                  <EmojiText>🏷️</EmojiText> Tags
                                </h3>
                                <div className={styles['cosmetics-grid']}>
                                  {tags.map(renderCosmeticShopCard)}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {tab === 'cosmetics' && (
            <div className="tab-content">
              <h2>Cosmetics</h2>
              {(() => {
                const ownedCosmetics = (user?.cosmetics_unlocked ?? [])
                  .map(cosmeticId => cosmetics.find(c => c.id === cosmeticId))
                  .filter((cosmetic): cosmetic is Cosmetic => Boolean(cosmetic))
                  .sort((a, b) => {
                    const equippedA = user?.equipped_cosmetics?.[a.type] === a.id;
                    const equippedB = user?.equipped_cosmetics?.[b.type] === b.id;

                    if (equippedA && !equippedB) return -1;
                    if (!equippedA && equippedB) return 1;

                    return 0;
                  });
                if (ownedCosmetics.length === 0) {
                  return (
                    <p>
                      You have not unlocked any cosmetics yet. Try earning some gems to unlock
                      cosmetics!
                    </p>
                  );
                }
                const nameplates = ownedCosmetics.filter(c => c.type === 'nameplate');
                const tags = ownedCosmetics.filter(c => c.type === 'tag');
                return (
                  <>
                    {nameplates.length > 0 && (
                      <div className={styles['cosmetics-section']}>
                        <h3 className={styles['cosmetics-section-title']}>
                          <EmojiText>🪪</EmojiText> Nameplates
                        </h3>
                        <div className={styles['cosmetics-grid']}>
                          {nameplates.map(renderCosmeticOwnedCard)}
                        </div>
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className={styles['cosmetics-section']}>
                        <h3 className={styles['cosmetics-section-title']}>
                          <EmojiText>🏷️</EmojiText> Tags
                        </h3>
                        <div className={styles['cosmetics-grid']}>
                          {tags.map(renderCosmeticOwnedCard)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {tab === 'settings' && (
            <div className="tab-content">
              <Settings user={user!} onRestartTutorial={startTutorial} />
            </div>
          )}
          {tab === 'stats' && (
            <div className={`tab-content ${styles['stats-tab']}`}>
              <h2>Your Stats</h2>
              {(() => {
                const stats = user?.stats;
                const fishCaughtByType = user?.fishing?.fish_caught;
                const totalFishCaught = fishCaughtByType
                  ? Object.values(fishCaughtByType).reduce((sum, count) => sum + (count || 0), 0)
                  : (stats?.fish_caught ?? 0);
                const playtimeSeconds = Math.floor((stats?.playtime_ms ?? 0) / 1000);
                const playtimeDays = Math.floor(playtimeSeconds / 86400);
                const playtimeHours = Math.floor((playtimeSeconds % 86400) / 3600);
                const playtimeMinutes = Math.floor((playtimeSeconds % 3600) / 60);
                const playtimeLabel =
                  playtimeDays > 0
                    ? `${playtimeDays}d ${playtimeHours}h ${playtimeMinutes}m`
                    : playtimeHours > 0
                      ? `${playtimeHours}h ${playtimeMinutes}m`
                      : `${playtimeMinutes}m`;
                const rows: { label: string; value: string | number }[] = [
                  { label: 'Playtime', value: playtimeLabel },
                  { label: 'Messages Sent', value: stats?.messages_sent ?? 0 },
                  {
                    label: 'Resources Bought',
                    value: `${stats?.resource_buys ?? 0} (${stats?.resources_bought ?? 0} total)`,
                  },
                  {
                    label: 'Resources Sold',
                    value: `${stats?.resource_sells ?? 0} (${stats?.resources_sold ?? 0} total)`,
                  },
                  {
                    label: 'Fish Caught',
                    value: `${stats?.fish_caught ?? 0} (${totalFishCaught} total)`,
                  },
                  { label: 'Fish Sold', value: stats?.fish_sold ?? 0 },
                  { label: 'Bait Used', value: stats?.bait_used ?? 0 },
                  { label: 'Pets Adopted', value: stats?.pets_adopted ?? 0 },
                  { label: 'Pets Fed', value: stats?.pets_fed ?? 0 },
                  { label: 'Pets Played With', value: stats?.pets_played ?? 0 },
                  { label: 'Aquarium Upgrades', value: stats?.aquarium_upgrades ?? 0 },
                  { label: 'Daily Rewards Claimed', value: stats?.daily_rewards_claimed ?? 0 },
                ];
                return (
                  <div className={styles['stats-grid']}>
                    {rows.map(row => (
                      <div key={row.label} className={styles['stats-item']}>
                        <span className={styles['stats-item-label']}>{row.label}</span>
                        <span className={`${styles['stats-item-value']} mono`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          {tab === 'jail' && (
            <div className={styles['jail-tab']}>
              <div className={styles['jail-card']}>
                <h2>
                  <EmojiText>🚓 You are in Jail 🚓</EmojiText>
                </h2>
                {currentPunishment ? (
                  <>
                    <span className={styles['jail-subtitle']}>
                      You have been banned from playing Monix.
                    </span>
                    {currentPunishment?.duration !== -1 ? (
                      <div className={styles['jail-duration']}>
                        <span>Remaining duration:</span>
                        <span className={`${styles['jail-time']} mono`}>
                          {formatRemainingTime(getRemainingDuration(currentPunishment) / 1000)}
                        </span>
                      </div>
                    ) : (
                      <div className={styles['jail-duration']}>
                        <span>This is a permanent ban.</span>
                      </div>
                    )}
                    <div className={styles['jail-info']}>
                      <div className={styles['jail-reason']}>
                        <h3>Reason:</h3>
                        <p>{currentPunishment.category.name}</p>
                      </div>
                      <div className={styles['jail-comment']}>
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
            <div className={styles['appeal-tab']}>
              <div className={styles['appeal-card']}>
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
      </div>
      {isTutorialOpen && (
        <div className={styles['tutorial-dock']} role="status" aria-live="polite">
          <div className={styles['tutorial-card']}>
            <div className={styles['tutorial-npc']}>
              <span className={styles['tutorial-npc-avatar']}>
                <EmojiText>🐠</EmojiText>
              </span>
              <span className={styles['tutorial-npc-name']}>Reef Guide</span>
            </div>
            <div className={styles['tutorial-body']}>
              <span className={styles['tutorial-step-count']}>
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </span>
              <h3>{currentTutorialStep?.title}</h3>
              <p>{currentTutorialStep?.body}</p>
              {currentTutorialStep?.task && (
                <div className={styles['tutorial-task']}>
                  <span className={styles['tutorial-task-label']}>Task</span>
                  <span
                    className={`${styles['tutorial-task-value']} ${
                      isTutorialStepComplete ? 'done' : 'todo'
                    }`}
                  >
                    {currentTutorialStep.task}
                  </span>
                </div>
              )}
            </div>
            <div className={styles['tutorial-actions']}>
              <Button secondary onClick={() => void handleTutorialComplete()}>
                Skip
              </Button>
              <div className={styles['tutorial-nav']}>
                <Button
                  secondary
                  disabled={tutorialStep === 0}
                  onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                >
                  Back
                </Button>
                <Button
                  disabled={!isTutorialStepComplete}
                  onClick={() => {
                    if (isLastTutorialStep) {
                      void handleTutorialComplete();
                    } else {
                      setTutorialStep(prev => prev + 1);
                    }
                  }}
                >
                  {isLastTutorialStep ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Modal isOpen={appealModalOpen} onClose={() => setAppealModalOpen(false)}>
        <div className={styles['appeal-modal']}>
          <h2>Submit an Appeal</h2>
          <textarea
            value={appealModalContent}
            onChange={e => setAppealModalContent(e.target.value)}
            placeholder="Enter your appeal details here..."
            rows={6}
          />
          <div className={styles['appeal-modal-actions']}>
            <Button secondary onClick={() => setAppealModalOpen(false)}>
              Cancel
            </Button>
            <Button onClickAsync={submitAppealClick}>Submit Appeal</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isDailyRewardModalOpen} onClose={() => setIsDailyRewardModalOpen(false)}>
        <div className={styles['daily-reward-modal']}>
          <div className={styles['daily-reward-header']}>
            <div>
              <h2>Daily Login Rewards</h2>
              <p className={styles['daily-reward-subtitle']}>
                Come back each day to build your streak.
              </p>
            </div>
          </div>
          <div className={styles['daily-reward-grid']}>
            {DAILY_REWARDS.map(reward => {
              const streak = dailyRewardResult?.streak || 0;
              const isClaimed = reward.day <= streak;
              const isToday = reward.day === dailyRewardResult?.reward?.day;
              const rewardLabel =
                reward.type === 'money'
                  ? `+${smartFormatNumber(reward.amount)}`
                  : `+${reward.amount} Gems`;
              return (
                <div
                  key={reward.day}
                  className={`${styles['daily-reward-card']}${isClaimed ? ' claimed' : ''}${
                    isToday ? ' today' : ''
                  }`}
                >
                  <div className={styles['daily-reward-day']}>Day {reward.day}</div>
                  <div className={styles['daily-reward-amount']}>{rewardLabel}</div>
                </div>
              );
            })}
          </div>
          {dailyRewardResult?.reward && (
            <div className={styles['daily-reward-today']}>
              <span className={styles['daily-reward-today-label']}>Today&apos;s reward</span>
              <strong className={styles['daily-reward-today-amount']}>
                {dailyRewardResult.reward.type === 'money'
                  ? `+${smartFormatNumber(dailyRewardResult.reward.amount)}`
                  : `+${dailyRewardResult.reward.amount} Gems`}
              </strong>
            </div>
          )}
          <div className={styles['daily-reward-actions']}>
            <Button onClick={() => setIsDailyRewardModalOpen(false)} secondary>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        isLoading={isLoadingPaymentModal}
        type={isMoneyPayment ? 'money' : 'gems'}
        mode={paymentModalSellRodId ? 'sell' : 'buy'}
        amount={paymentModalAmount}
        balance={isMoneyPayment ? (user?.money ?? 0) : (user?.gems ?? 0)}
        productName={paymentModalProductName}
        onClose={() => setIsPaymentModalOpen(false)}
        onPurchase={async () => {
          setIsLoadingPaymentModal(true);

          // Artificial delay, since the purchase is usually instant
          await new Promise(resolve => setTimeout(resolve, 750));

          if (paymentModalSellRodId) {
            await sellRod(paymentModalSellRodId);
          } else if (paymentModalUpgradeId) {
            await buyUpgrade(paymentModalUpgradeId);
          } else if (paymentModalRodId) {
            await buyRod(paymentModalRodId);
          } else if (paymentModalBaitId) {
            await buyBait(paymentModalBaitId, paymentModalBaitQty);
          } else if (paymentModalAquarium) {
            await upgradeAquarium();
          } else if (paymentModalEventPreview) {
            const res = await unlockEventPreview();
            await updateEverything();
            setIsLoadingPaymentModal(false);
            setPaymentModalEventPreview(false);
            setIsPaymentModalOpen(false);
            if (res) {
              setEventPreview(res);
              if (res.gems !== undefined) {
                setUser(prev => (prev ? { ...prev, gems: res.gems ?? 0 } : prev));
              }
              setIsEventPreviewModalOpen(true);
            }
            return;
          } else {
            await buyCosmetic(paymentModalCosmeticId!);
          }
          await updateEverything();

          setIsLoadingPaymentModal(false);
          setIsPaymentModalOpen(false);
        }}
      />
    </>
  );
}

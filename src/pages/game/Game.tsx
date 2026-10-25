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
  RoleBadge,
  Avatar,
  NewsTicker,
  Checkbox,
  Select,
  PaymentModal,
  NotificationToasts,
  DailyRewards,
  Spinner,
  UpdateInfoModal,
  GiveMoneyModal,
} from '../../components';
import { IconMusic, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import {
  buyCosmetic,
  buyUpgrade,
  equipCosmetic,
  logOut,
  unequipCosmetic,
} from '../../helpers/auth';
import { getResourceQuantity } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { hasRole } from '../../../server/common/roles';
import {
  formatRemainingMilliseconds,
  formatRemainingTime,
  smartFormatNumber,
  titleCase,
} from '../../../server/common/math';
import type { IRoom } from '../../../server/common/models/room';
import { getCurrentPunishment, isUserBanned } from '../../../server/common/punishx/punishx';
import { getRemainingDuration, type IPunishment } from '../../../server/common/models/punishment';
import { getMyAppeals, submitAppeal } from '../../helpers/appeals';
import type { IAppeal } from '../../../server/common/models/appeal';
import { useMusic } from '../../providers/music';
import { tracks } from '../../helpers/tracks';
import { loadSettings, updateSetting, type IClientSettings } from '../../helpers/settings';
import { seasonalThemes } from '../../helpers/theme';
import { resolveNameplate } from '../../helpers/cosmetics';
import { createPaymentSession } from '../../helpers/payments';
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
  type FishingFrenzyStatus,
} from '../../helpers/fishing';
import { fishingBaits } from '../../../server/common/fishing/fishingBait';
import {
  fishingRods,
  fishingRodCategories,
  getRodCategoryInfo,
  type FishingRodCategory,
} from '../../../server/common/fishing/fishingRods';
import {
  FRENZY_COOLDOWN_S,
  FRENZY_GEM_COST,
  FRENZY_MONEY_COST,
  FRENZY_WEIGHT_MULTIPLIER,
} from '../../../server/common/fishing/fishingFrenzy';
import type { IFish } from '../../../server/common/models/fish';
import type { IPet } from '../../../server/common/models/pet';
import { VsMode } from '../../components/fishing/VsMode';
import { rarityEmojis } from '../../../server/common/rarities';
import {
  DEFAULT_GLOBAL_SETTINGS,
  type IGlobalSettings,
} from '../../../server/common/models/globalSettings';
import {
  isUpgradeActive,
  MAGIC_JELLYBEAN_UPGRADE_ID,
  UPGRADES,
} from '../../../server/common/upgrades';
import { ACHIEVEMENTS } from '../../../server/common/achievements';
import { useSocket } from '../../providers/socket';
import { useChatNotifications } from '../../hooks/useChatNotifications';
import { useEventNotifications } from '../../hooks/useEventNotifications';
import { useGameToasts } from '../../hooks/useGameToasts';
import { petTypes } from '../../../server/common/petTypes';

const EMPTY_PETS: IPet[] = [];

const getRodTierInfo = (category: FishingRodCategory) => {
  const info = getRodCategoryInfo(category);
  return { emoji: info.emoji, title: info.title };
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
    | 'rewards'
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
  const [globalSettings, setGlobalSettings] = useState<IGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const { connected, subscribe, request } = useSocket();
  void connected;

  // Market states
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');

  const currentFishingEvent = useMemo(() => getCurrentFishingEvent(eventNow), [eventNow]);
  const [frenzyStatus, setFrenzyStatus] = useState<FishingFrenzyStatus | null>(null);
  const featureFlags = globalSettings.features;
  const resourceMarketDisabled = !featureFlags.resourcesMarket;
  const fishingDisabled = !featureFlags.fishingAquarium;
  const petsDisabled = !featureFlags.pets;
  const socialDisabled = !featureFlags.social;
  const gemPurchasesDisabled = !featureFlags.gemPurchases;
  const cosmeticPurchasesDisabled = !featureFlags.cosmeticPurchases;
  const frenzyActive = Boolean(frenzyStatus?.active && (frenzyStatus?.endsAt || 0) > fishingNow);
  // Count the cooldown down from the server-provided expiry against the local
  // clock. The server's `cooldownRemainingMs` is a one-shot snapshot, so using
  // it directly would freeze the readout until the next status push.
  const frenzyCooldownRemainingMs = Math.max(0, (frenzyStatus?.cooldownEndsAt || 0) - eventNow);
  const fishingCooldownMs = (() => {
    if (frenzyActive) return FRENZY_COOLDOWN_S * 1000;
    if (isUpgradeActive(user?.upgrades, MAGIC_JELLYBEAN_UPGRADE_ID, fishingNow)) return 2500;
    return 5000;
  })();

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
    const unsubscribe = subscribe('fishing:frenzy', data => {
      setFrenzyStatus(data as FishingFrenzyStatus);
    });
    // The server sends the current frenzy status as an initial snapshot on
    // subscribe, and pushes updates whenever it is activated or expires.
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

  // A DM created from the social panel is not in `socialRooms` until the next
  // snapshot arrives. Falling back to the first room (and correcting the
  // selected uuid) avoids rendering `Social` with an undefined room, which
  // previously crashed the whole game into a blank/grey screen.
  const activeSocialRoom = useMemo(
    () => socialRooms.find(r => r.uuid === socialRoom) ?? socialRooms[0] ?? null,
    [socialRooms, socialRoom]
  );

  useEffect(() => {
    if (socialRooms.length === 0) return;
    if (socialRooms.some(r => r.uuid === socialRoom)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocialRoom(socialRooms[0].uuid);
  }, [socialRooms, socialRoom]);

  const handleSetSocialRoom = useCallback((room: IRoom) => {
    setSocialRooms(prev => (prev.some(r => r.uuid === room.uuid) ? prev : [...prev, room]));
    setSocialRoom(room.uuid);
  }, []);

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
  const {
    totalUnread,
    unreadByRoom,
    toasts: chatToasts,
    dismissToast: dismissChatToast,
    clearRoom,
    clearAll,
  } = useChatNotifications({
    userUuid: user?.uuid ?? null,
    enabled: notificationsEnabled,
    isRoomActive,
  });
  const { toasts: eventToasts, dismissToast: dismissEventToast } = useEventNotifications({
    enabled: notificationsEnabled,
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
    strayCaught: boolean;
    satchelFull: boolean;
    nextCatchAutoSell: boolean;
    autoSold: boolean;
  } | null>(null);
  const [wasLastCatchAutoSold, setWasLastCatchAutoSold] = useState<boolean>(false);
  // VS mode is opt-in and only fetches pets while the fishing tab is open.
  const [vsModeEnabled, setVsModeEnabled] = useState<boolean>(false);
  // VS mode needs the pet list; only subscribe while it is actually visible.
  // The channel is stored with the payload so turning VS mode off can never
  // leave stale pets on screen without a synchronous reset inside the effect.
  const [vsPets, setVsPets] = useState<{ channel: string; pets: IPet[] } | null>(null);
  const vsChannel =
    !petsDisabled && vsModeEnabled && tab === 'fishing' && user?.uuid ? `pets:${user.uuid}` : null;
  useEffect(() => {
    if (!vsChannel) return;
    const unsubscribe = subscribe(vsChannel, data => {
      setVsPets({ channel: vsChannel, pets: (data as IPet[]) || [] });
    });
    return unsubscribe;
  }, [vsChannel, subscribe]);
  const activeVsPets = vsPets?.channel === vsChannel ? vsPets.pets : EMPTY_PETS;

  const [autoSellEnabled, setAutoSellEnabled] = useState<boolean>(
    () => loadSettings().autoSellFish ?? false
  );
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

    return fishingRodCategories
      .map(category => ({
        id: category.id,
        title: category.title,
        emoji: category.emoji,
        subtitle: category.subtitle,
        rods: buyableRods.filter(rod => rod.category === category.id),
      }))
      .filter(section => section.rods.length > 0);
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
    playTrack,
    setVolume,
  } = useMusic();
  void setVolume;

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

  const { toasts: gameToasts, dismissToast: dismissGameToast } = useGameToasts({
    currentTrack,
    user,
    hydrated: gameHydrated,
  });
  const toasts = useMemo(
    () => [...chatToasts, ...eventToasts, ...gameToasts],
    [chatToasts, eventToasts, gameToasts]
  );
  const dismissToast = useCallback(
    (id: string) => {
      dismissChatToast(id);
      dismissEventToast(id);
      dismissGameToast(id);
    },
    [dismissChatToast, dismissEventToast, dismissGameToast]
  );

  const applyUserData = useCallback(
    (userData: IUser) => {
      const jailTabs = ['jail', 'settings', 'appeals'];

      setUser(prev => {
        if (!userData) return prev;
        // Snapshots arrive on a timer and after every mutation. Only skip the
        // re-render when the snapshot is genuinely identical: comparing a
        // hand-picked subset of fields misses equipment/inventory changes
        // (e.g. equipped rods and bait), leaving the UI stale until a reload.
        if (prev && JSON.stringify(prev) === JSON.stringify(userData)) {
          return prev;
        }
        return userData;
      });
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
        ok?: boolean;
        error?: string;
        data?: { user?: IUser };
      };
      const userData = userResp?.data?.user;
      if (!userData || userResp?.ok === false) {
        logOut();
        setUser(null);
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

  // Hydrate the initial user snapshot once the socket is authenticated. Without
  // this, `gameHydrated` never becomes true on a fresh page load and every tab
  // stays disabled even though the server is reachable.
  useEffect(() => {
    if (!connected || gameHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateEverything();
  }, [connected, gameHydrated, updateEverything]);

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

  const equippedNameplate = resolveNameplate(
    user?.equipped_cosmetics?.nameplate,
    Boolean(user?.upgrades?.magic_jellybean?.expires_at) &&
      (user?.upgrades?.magic_jellybean?.expires_at || 0) > fishingNow
  );
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
    void import('../../helpers/fishing')
      .then(m => m.getEventPreview())
      .then(res => {
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
          backgroundKey={cosmetic.nameplateBackground}
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
              setPaymentModalFrenzyType(null);
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

  const [isUpdateInfoOpen, setIsUpdateInfoOpen] = useState<boolean>(false);
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState<boolean>(false);
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
  const [paymentModalFrenzyType, setPaymentModalFrenzyType] = useState<'gems' | 'money' | null>(
    null
  );

  const isMoneyPayment =
    paymentModalSellRodId ||
    paymentModalUpgradeId ||
    paymentModalRodId ||
    paymentModalBaitId ||
    paymentModalAquarium ||
    paymentModalFrenzyType === 'money';

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
    if (paymentModalFrenzyType === 'gems') return FRENZY_GEM_COST;
    if (paymentModalFrenzyType === 'money') return FRENZY_MONEY_COST;
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
    if (paymentModalFrenzyType) return 'Fishing Frenzy (for everyone)';
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
            if (toast.kind === 'event') {
              const target = toast.tab ?? 'fishing';
              if (target === 'fishing' && fishingDisabled) return;
              setTabTo(target);
              return;
            }
            if (socialDisabled) return;
            if (socialRooms.some(r => r.uuid === toast.roomUuid)) {
              setSocialRoom(toast.roomUuid);
            }
            setTabTo('social');
          }}
        />
        <header className="app-header">
          <div className="app-brand">
            <div className="app-brand-main">
              <div className="app-logo-wrap">
                <img src={monixLogoLight} alt="Monix Logo" className="app-logo app-logo-light" />
                <img src={monixLogoDark} alt="Monix Logo" className="app-logo app-logo-dark" />
                <img
                  src={seasonalThemes[0].logo}
                  alt="Monix Logo"
                  className="app-logo app-logo-seasonal"
                />
              </div>
              <h1 className="app-title">Monix</h1>
            </div>
            <span className="app-brand-caption">Spooknix update 2026!</span>
          </div>
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
                    { key: 'rewards', label: '🪎 Daily Rewards' },
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
                {...equippedNameplate}
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
              {userRole !== null && userRole !== 'user' && <RoleBadge role={userRole} />}
              {equippedTagCosmetic && (
                <span className={`user-tag tag-colour-${equippedTagCosmetic.tagColour}`}>
                  <EmojiText>{equippedTagCosmetic.tagIcon}</EmojiText> {equippedTagCosmetic.tagName}
                </span>
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
                <div className={styles['money-actions']}>
                  <Button onClick={() => setIsGiveMoneyOpen(true)}>
                    <EmojiText>💸</EmojiText> Give Money
                  </Button>
                  <Button secondary onClick={() => setIsUpdateInfoOpen(true)}>
                    <EmojiText>📋</EmojiText> Update information
                  </Button>
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
                      onBuySell={(_mode: unknown) => {
                        void _mode;
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
                    {frenzyActive && (
                      <div className={styles['fishing-frenzy-banner']}>
                        <span className={styles['fishing-frenzy-banner-icon']}>
                          <EmojiText>🌊</EmojiText>
                        </span>
                        <div className={styles['fishing-frenzy-banner-text']}>
                          <span className={styles['fishing-frenzy-banner-title']}>FRENZY!</span>
                          <span className={styles['fishing-frenzy-banner-sub']}>
                            {FRENZY_WEIGHT_MULTIPLIER}x fish weight • {FRENZY_COOLDOWN_S}s cooldown
                            •{' '}
                            {formatRemainingTime(
                              Math.max(
                                0,
                                Math.floor(((frenzyStatus?.endsAt || 0) - eventNow) / 1000)
                              )
                            )}{' '}
                            left
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={styles['fishing-container']}>
                      <div className={styles['fishing-hgrid']}>
                        <div className={styles['fishing-left']}>
                          <div className={styles['fishing-card']}>
                            <h2>
                              <EmojiText>🐟</EmojiText> Go Fishing!
                            </h2>
                            <div className={styles['fishing-card-actions']}>
                              <div className={styles['fishing-card-actions-row']}>
                                <Checkbox
                                  label="Auto-sell fish"
                                  checked={autoSellEnabled}
                                  onClick={next => {
                                    setAutoSellEnabled(next);
                                    updateSetting('autoSellFish', next);
                                  }}
                                />
                                {!petsDisabled && (
                                  <Checkbox
                                    label="VS Mode"
                                    color="purple"
                                    checked={vsModeEnabled}
                                    onClick={setVsModeEnabled}
                                  />
                                )}
                              </div>
                              <Button
                                onClickAsync={async () => {
                                  const result = await (
                                    await import('../../helpers/fishing')
                                  ).goFishing(autoSellEnabled);

                                  if (result) {
                                    setIsShowingFishingResults(true);
                                    setLastCatch(result);

                                    // The server is authoritative here: the
                                    // checkbox may be off while a stray pet still
                                    // forces this catch to be sold.
                                    setWasLastCatchAutoSold(result.autoSold);

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
                            {vsModeEnabled && !petsDisabled && (
                              <VsMode
                                fish={lastCatch?.fishCaught ?? null}
                                pets={activeVsPets}
                                passiveIncomeBonus={0}
                              />
                            )}
                            {isShowingFishingResults && lastCatch && (
                              <div className={styles['fishing-results']}>
                                {lastCatch.strayCaught ? (
                                  <>
                                    <h3>
                                      You Caught a Stray{' '}
                                      <EmojiText>
                                        {petTypes.find(
                                          p => p.id === lastCatch.fishingResult.stray_pet?.type_id
                                        )?.icon || '🐾'}
                                      </EmojiText>
                                    </h3>
                                    <p className={styles['fishing-result-value']}>
                                      A {lastCatch.fishingResult.stray_pet?.rarity || 'common'}{' '}
                                      {petTypes.find(
                                        p => p.id === lastCatch.fishingResult.stray_pet?.type_id
                                      )?.name || 'pet'}{' '}
                                      swam up on your line!
                                    </p>
                                    <p className={styles['fishing-result-weight']}>
                                      It's waiting in your satchel.{' '}
                                      {lastCatch.fishingResult.fish_type && (
                                        <>
                                          You also landed a{' '}
                                          <strong>{lastCatch.fishingResult.fish_type}</strong>
                                          {lastCatch.autoSold
                                            ? ', which was sold automatically.'
                                            : ' — it’s been kept in your aquarium, and your next catch will be sold automatically to make space for it.'}
                                        </>
                                      )}
                                    </p>
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
                                      <Button
                                        onClick={() => {
                                          setIsShowingFishingResults(false);
                                          setLastCatch(null);
                                          setTabTo(petsDisabled ? 'fishing' : 'pets');
                                        }}
                                      >
                                        View Satchel
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
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
                                        {
                                          fishTypes.find(f => f.id === lastCatch.fishCaught.type)
                                            ?.icon
                                        }
                                      </EmojiText>{' '}
                                      {
                                        fishTypes.find(f => f.id === lastCatch.fishCaught.type)
                                          ?.name
                                      }
                                    </h3>
                                    <p className={styles['fishing-result-weight']}>
                                      Weight:{' '}
                                      {lastCatch.fishCaught.weight >= 1000 ? (
                                        <span className="mono">
                                          {smartFormatNumber(
                                            lastCatch.fishCaught.weight / 1000,
                                            false
                                          )}{' '}
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
                                            const modifier = fishModifiers.find(
                                              fm => fm.id === mod
                                            );
                                            if (!modifier) return null;
                                            return (
                                              <span
                                                key={modifier.id}
                                                className={styles['fishing-result-modifier']}
                                              >
                                                <EmojiText>{modifier.icon}</EmojiText>{' '}
                                                {modifier.name}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className={styles['fishing-result-none']}>None</span>
                                      )}
                                    </div>

                                    {lastCatch.satchelFull && (
                                      <p className={styles['fishing-result-weight']}>
                                        A stray pet also bit, but your satchel is full — it swam
                                        away.
                                      </p>
                                    )}

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
                                  </>
                                )}
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
                                      const tier = getRodTierInfo(rodInfo.category);

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
                                                  await (
                                                    await import('../../helpers/fishing')
                                                  ).equipRod(rodId);
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
                                                  setPaymentModalFrenzyType(null);
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
                                                await (
                                                  await import('../../helpers/fishing')
                                                ).equipBait(bait.id);
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
                              <h3>
                                <EmojiText>{section.emoji}</EmojiText> {section.title}
                              </h3>
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
                                        setPaymentModalFrenzyType(null);
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
                                        setPaymentModalFrenzyType(null);
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
                  <div className={styles['aquarium-tab']}>
                    <div className={styles['aquarium-banner']}>
                      {frenzyActive ? (
                        <>
                          <span className={styles['aquarium-banner-subtitle']}>
                            🌊 FISHING FRENZY ACTIVE
                          </span>
                          <h3 className={styles['aquarium-banner-title']}>
                            <EmojiText>🌊</EmojiText> Fishing Frenzy
                          </h3>
                          <span className={styles['aquarium-banner-remaining']}>
                            {formatRemainingTime(
                              Math.max(
                                0,
                                Math.floor(((frenzyStatus?.endsAt || 0) - eventNow) / 1000)
                              )
                            )}{' '}
                            remaining • {FRENZY_WEIGHT_MULTIPLIER}x fish weight •{' '}
                            {FRENZY_COOLDOWN_S}s cooldown
                          </span>
                        </>
                      ) : (
                        <>
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
                              Math.max(
                                0,
                                Math.floor((currentFishingEvent.endsAt - eventNow) / 1000)
                              )
                            )}{' '}
                            {currentFishingEvent.event ? 'remaining' : 'until next event'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className={styles['aquarium-frenzy']}>
                      {!frenzyActive &&
                        (() => {
                          const cooldownSecs = Math.ceil(
                            Math.max(0, frenzyCooldownRemainingMs) / 1000
                          );
                          const canAffordGems =
                            (user?.gems ?? 0) >= FRENZY_GEM_COST || user?.gems === -1;
                          const canAffordMoney = (user?.money ?? 0) >= FRENZY_MONEY_COST;

                          if (cooldownSecs > 0) {
                            return (
                              <div className={styles['aquarium-frenzy-cooldown']}>
                                <span>
                                  <EmojiText>⏳</EmojiText> Fishing Frenzy is on cooldown: restarts
                                  in {formatRemainingTime(cooldownSecs)}
                                </span>
                                {hasRole(user?.role || 'user', 'admin') && (
                                  <div className={styles['aquarium-frenzy-admin']}>
                                    <Button
                                      secondary
                                      onClickAsync={async () => {
                                        const res = await (
                                          await import('../../helpers/fishing')
                                        ).resetFrenzyCooldown();
                                        if (res.status) setFrenzyStatus(res.status);
                                      }}
                                    >
                                      Reset cooldown (admin)
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className={styles['aquarium-frenzy-actions']}>
                              <span className={styles['aquarium-frenzy-label']}>
                                <EmojiText>🌊</EmojiText> Activate Fishing Frenzy for everyone:
                              </span>
                              <Button
                                disabled={!canAffordGems}
                                onClick={() => {
                                  setPaymentModalUpgradeId(null);
                                  setPaymentModalRodId(null);
                                  setPaymentModalBaitId(null);
                                  setPaymentModalAquarium(false);
                                  setPaymentModalSellRodId(null);
                                  setPaymentModalEventPreview(false);
                                  setPaymentModalCosmeticId(null);
                                  setPaymentModalFrenzyType('gems');
                                  setIsPaymentModalOpen(true);
                                }}
                              >
                                {FRENZY_GEM_COST} 💎
                              </Button>
                              <Button
                                disabled={!canAffordMoney}
                                onClick={() => {
                                  setPaymentModalUpgradeId(null);
                                  setPaymentModalRodId(null);
                                  setPaymentModalBaitId(null);
                                  setPaymentModalAquarium(false);
                                  setPaymentModalSellRodId(null);
                                  setPaymentModalEventPreview(false);
                                  setPaymentModalCosmeticId(null);
                                  setPaymentModalFrenzyType('money');
                                  setIsPaymentModalOpen(true);
                                }}
                              >
                                {smartFormatNumber(FRENZY_MONEY_COST)}
                              </Button>
                            </div>
                          );
                        })()}
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
                            setPaymentModalFrenzyType(null);
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
                          onClickAsync={async () => {
                            const res = await (
                              await import('../../helpers/fishing')
                            ).getEventPreview();
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
                            onChange={value => setAquariumSort(value as 'value-desc' | 'value-asc')}
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
                        <div className={styles['aquarium-empty']}>No fish match those filters.</div>
                      )}
                    <div className={styles['aquarium-grid']}>
                      {aquariumFishView.map(fish => (
                        <div key={fish.uuid} className={styles['aquarium-fish-card']}>
                          <h3>
                            <EmojiText>{fishTypes.find(ft => ft.id === fish.type)?.icon}</EmojiText>{' '}
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
                              user?.fishing?.aquarium.fish.find(f => f.uuid === aquariumFishToSell)
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
                          {eventPreview?.events?.map(event => (
                            <div
                              key={`${event.event?.id ?? 'unknown'}-${event.startAt}-${event.endsAt}`}
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
                )}
                {fishingSubview === 'sailors' && (
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
                              // eslint-disable-next-line react-x/no-array-index-key
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
                  gems={user?.gems ?? 0}
                  petSlots={user?.pet_slots}
                  userUuid={user?.uuid ?? ''}
                  passiveIncomeBonus={0}
                  refreshUser={updateEverything}
                />
              </div>
            ))}
          {tab === 'social' &&
            (socialDisabled ? (
              renderFeatureDisabled('Social')
            ) : (
              <div className="tab-content">
                {user && activeSocialRoom ? (
                  <Social
                    room={activeSocialRoom}
                    setRoom={handleSetSocialRoom}
                    rooms={socialRooms}
                    user={user}
                    unreadByRoom={unreadByRoom}
                  />
                ) : (
                  <Spinner />
                )}
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
              <h3 className={styles['radio-picker-heading']}>Song Picker</h3>
              <div className={styles['song-picker']}>
                {tracks.map(track => {
                  const key = track.id ?? track.src;
                  const activeKey = currentTrack ? (currentTrack.id ?? currentTrack.src) : null;
                  const active = activeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles['song-picker-item']} ${
                        active ? styles['song-picker-item-active'] : ''
                      }`}
                      aria-label={
                        active && isPlaying
                          ? `Pause ${track.title}`
                          : `Play ${track.title} by ${track.artist}`
                      }
                      aria-current={active ? 'true' : undefined}
                      onClick={() => {
                        if (active) {
                          if (isPlaying) pause();
                          else resume();
                          return;
                        }
                        playTrack(track);
                      }}
                    >
                      <img
                        src={track.coverSrc || undefined}
                        alt=""
                        className={styles['song-picker-cover']}
                      />
                      <span className={styles['song-picker-meta']}>
                        <span className={styles['song-picker-title']}>{track.title}</span>
                        <span className={styles['song-picker-artist']}>{track.artist}</span>
                      </span>
                      <span className={styles['song-picker-action']}>
                        {active && isPlaying ? (
                          <IconPlayerPause size={18} />
                        ) : (
                          <IconPlayerPlay size={18} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {tab === 'upgrades' && (
            <div className="tab-content">
              <h2>Upgrades</h2>
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
                          setPaymentModalFrenzyType(null);
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
          {tab === 'rewards' && user && (
            <div className={`tab-content ${styles['rewards-tab']}`}>
              <DailyRewards user={user} refreshUser={updateEverything} />
            </div>
          )}
          {tab === 'settings' && (
            <div className="tab-content">
              <Settings user={user!} />
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
                let playtimeLabel = `${playtimeMinutes}m`;
                if (playtimeHours > 0) {
                  playtimeLabel = `${playtimeHours}h ${playtimeMinutes}m`;
                }
                if (playtimeDays > 0) {
                  playtimeLabel = `${playtimeDays}d ${playtimeHours}h ${playtimeMinutes}m`;
                }

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
            await (await import('../../helpers/fishing')).buyRod(paymentModalRodId);
          } else if (paymentModalBaitId) {
            await (
              await import('../../helpers/fishing')
            ).buyBait(paymentModalBaitId, paymentModalBaitQty);
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
          } else if (paymentModalFrenzyType) {
            const res = await (
              await import('../../helpers/fishing')
            ).activateFrenzy(paymentModalFrenzyType);
            if (res.status) setFrenzyStatus(res.status);
            setPaymentModalFrenzyType(null);
          } else {
            await buyCosmetic(paymentModalCosmeticId!);
          }
          await updateEverything();

          setIsLoadingPaymentModal(false);
          setIsPaymentModalOpen(false);
        }}
      />

      <UpdateInfoModal isOpen={isUpdateInfoOpen} onClose={() => setIsUpdateInfoOpen(false)} />

      <GiveMoneyModal
        isOpen={isGiveMoneyOpen}
        onClose={() => setIsGiveMoneyOpen(false)}
        balance={user?.money ?? 0}
        currentUsername={user?.username ?? ''}
        onSent={updateEverything}
      />
    </>
  );
}

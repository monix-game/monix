import './Game.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  DebugOverlay,
  Modal,
  Nameplate,
  Avatar,
  Checkbox,
  Select,
  PaymentModal,
} from '../../components';
import { IconMusic, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import {
  buyCosmetic,
  completeTutorial,
  equipCosmetic,
  fetchUser,
  resetTutorial,
  unequipCosmetic,
} from '../../helpers/auth';
import { claimDailyReward, type DailyRewardClaimResult } from '../../helpers/rewards';
import { getResourceQuantity, getTotalResourceValue } from '../../helpers/resource';
import { getResourceById, resources, type ResourceInfo } from '../../../server/common/resources';
import { getPrices } from '../../helpers/market';
import {
  formatRemainingMilliseconds,
  formatRemainingTime,
  smartFormatNumber,
  titleCase,
} from '../../../server/common/math';
import { createPaymentSession } from '../../helpers/payments';
import type { IRoom } from '../../../server/common/models/room';
import { getAllRooms } from '../../helpers/social';
import { getCurrentPunishment, isUserBanned } from '../../../server/common/punishx/punishx';
import { getRemainingDuration, type IPunishment } from '../../../server/common/models/punishment';
import { getMyAppeals, submitAppeal } from '../../helpers/appeals';
import { useMusic } from '../../providers/music';
import { tracks } from '../../helpers/tracks';
import { loadSettings, type IClientSettings } from '../../helpers/settings';
import type { IAppeal } from '../../../server/common/models/appeal';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { fishTypes } from '../../../server/common/fishing/fishTypes';
import { fishModifiers } from '../../../server/common/fishing/fishModifiers';
import {
  getAquariumUpgradeCost,
  getCurrentFishingEvent,
  getFishValue,
  type FishingResult,
} from '../../../server/common/fishing/fishing';
import {
  buyBait,
  buyRod,
  equipBait,
  equipRod,
  goFishing,
  sellAllFish,
  sellFish,
  upgradeAquarium,
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
import { getGlobalSettings } from '../../helpers/globalSettings';
import { createPoll, fetchPolls, type PollView, voteInPoll } from '../../helpers/polls';

const toLocalInputDateTime = (timeMs: number) => {
  const offsetMs = new Date(timeMs).getTimezoneOffset() * 60000;
  return new Date(timeMs - offsetMs).toISOString().slice(0, 16);
};

const fromLocalInputDateTime = (value: string) => new Date(value).getTime();

const createPollDraftOption = () => ({
  id: `opt-${Math.random().toString(36).slice(2, 9)}`,
  label: '',
  emoji: '',
});

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
    | 'market'
    | 'fishing'
    | 'aquarium'
    | 'pets'
    | 'relics'
    | 'council'
    | 'social'
    | 'polls'
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
    openedResourceModal: false,
    openedMarketModal: false,
    caughtFish: false,
    visitedAquarium: false,
    visitedPets: false,
  });
  const [globalSettings, setGlobalSettings] = useState<IGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  type TutorialStep = {
    title: string;
    body: string;
    tab?: typeof tab;
    task?: string;
  };

  // Market states
  const [marketResourceDetails, setMarketResourceDetails] = useState<string>('gold');
  const [marketModalResource, setMarketModalResource] = useState<ResourceInfo | null>(null);
  const [marketModalOpen, setMarketModalOpen] = useState<boolean>(false);

  const currentFishingEvent = useMemo(() => getCurrentFishingEvent(eventNow), [eventNow]);
  const tutorialSteps = useMemo<TutorialStep[]>(
    () => [
      {
        title: 'Welcome to Monix',
        body: 'Build your fortune by fishing, trading resources, and upgrading your collection.',
        tab: 'money',
      },
      {
        title: 'Track Your Net Worth',
        body: 'The Money tab shows your total value across money, resources, and your aquarium.',
        tab: 'money',
        task: 'Check the Money tab totals.',
      },
      {
        title: 'Collect Resources',
        body: 'Visit the Resources tab to review holdings and open the market for any resource.',
        tab: 'resources',
        task: 'Open a resource card.',
      },
      {
        title: 'Trade in the Market',
        body: 'Use the Market tab to buy or sell. Price changes can help you grow faster.',
        tab: 'market',
        task: 'Open the buy/sell modal.',
      },
      {
        title: 'Go Fishing',
        body: 'Catch fish to fill your aquarium. Modifiers can boost value, so check each catch.',
        tab: 'fishing',
        task: 'Catch a fish.',
      },
      {
        title: 'Review Your Aquarium',
        body: 'The Aquarium tab stores your fish. Sell or upgrade capacity when you need space.',
        tab: 'aquarium',
        task: 'Visit the Aquarium tab.',
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
  const isTutorialStepComplete = useMemo(() => {
    if (!currentTutorialStep) return true;

    switch (tutorialStep) {
      case 1:
        return tab === 'money';
      case 2:
        return tab === 'resources' && tutorialProgress.openedResourceModal;
      case 3:
        return tab === 'market' && tutorialProgress.openedMarketModal;
      case 4: {
        return tab === 'fishing' && tutorialProgress.caughtFish;
      }
      case 5:
        return tab === 'aquarium' && tutorialProgress.visitedAquarium;
      case 6:
        return tab === 'pets' && tutorialProgress.visitedPets;
      default:
        return true;
    }
  }, [
    currentTutorialStep,
    tutorialStep,
    tab,
    tutorialProgress.openedResourceModal,
    tutorialProgress.openedMarketModal,
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
    let mounted = true;
    const fetchSettings = async () => {
      const settings = await getGlobalSettings();
      if (!mounted) return;
      if (settings) {
        setGlobalSettings(settings);
      }
    };

    void fetchSettings();

    const interval = setInterval(fetchSettings, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
  const [resourceQuantities, setResourceQuantities] = useState<{ [key: string]: number }>({});

  // Social states
  const [socialRoom, setSocialRoom] = useState<string>('general');
  const [socialRooms, setSocialRooms] = useState<IRoom[]>([]);
  const [socialHasUnread, setSocialHasUnread] = useState<boolean>(false);
  const [polls, setPolls] = useState<PollView[]>([]);
  const [pollsLoading, setPollsLoading] = useState<boolean>(false);
  const [pollsError, setPollsError] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollStartsAt, setPollStartsAt] = useState<string>(() => toLocalInputDateTime(Date.now()));
  const [pollEndsAt, setPollEndsAt] = useState<string>(() =>
    toLocalInputDateTime(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [pollOptionsDraft, setPollOptionsDraft] = useState<
    { id: string; label: string; emoji: string }[]
  >(() => [createPollDraftOption(), createPollDraftOption()]);
  const [pollCreateError, setPollCreateError] = useState<string | null>(null);
  const [pollCreateSubmitting, setPollCreateSubmitting] = useState<boolean>(false);
  const [pollVotePending, setPollVotePending] = useState<string | null>(null);
  const [isPollCreateOpen, setIsPollCreateOpen] = useState<boolean>(false);
  const pollsNeedAttention = useMemo(
    () => polls.some(poll => poll.status === 'active' && !poll.has_voted),
    [polls]
  );
  const activePolls = useMemo(
    () => polls.filter(poll => poll.status !== 'ended').sort((a, b) => a.ends_at - b.ends_at),
    [polls]
  );
  const completedPolls = useMemo(
    () => polls.filter(poll => poll.status === 'ended').sort((a, b) => b.ends_at - a.ends_at),
    [polls]
  );
  const canCreatePoll = userRole === 'admin' || userRole === 'owner';
  useEffect(() => {
    try {
      const val = localStorage.getItem('social:hasUnread');

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocialHasUnread(val === '1');
    } catch {
      setSocialHasUnread(false);
    }

    const handler = (ev: Event) => {
      try {
        // event detail may be present
        const detail = (ev as CustomEvent).detail as { hasUnread?: boolean } | undefined;
        if (detail && typeof detail.hasUnread === 'boolean') setSocialHasUnread(detail.hasUnread);
        else {
          const v = localStorage.getItem('social:hasUnread');
          setSocialHasUnread(v === '1');
        }
      } catch {
        const v = localStorage.getItem('social:hasUnread');
        setSocialHasUnread(v === '1');
      }
    };

    globalThis.addEventListener('social-unread-changed', handler as EventListener);
    return () => globalThis.removeEventListener('social-unread-changed', handler as EventListener);
  }, []);

  const refreshPolls = useCallback(
    async (showLoading = false) => {
      if (showLoading) setPollsLoading(true);
      setPollsError(null);
      const nextPolls = await fetchPolls();
      if (nextPolls !== null) {
        setPolls(nextPolls);
      } else {
        setPollsError('Failed to load polls. Please try again soon.');
      }
      if (showLoading) setPollsLoading(false);
    },
    [setPolls, setPollsError, setPollsLoading]
  );

  useEffect(() => {
    if (banned) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPolls(true);
    const interval = setInterval(() => {
      void refreshPolls(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [banned, refreshPolls]);

  useEffect(() => {
    if (tab !== 'polls') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPolls(false);
  }, [tab, refreshPolls]);

  const addPollOption = useCallback(() => {
    setPollOptionsDraft(prev => {
      if (prev.length >= 8) return prev;
      return [...prev, createPollDraftOption()];
    });
  }, []);

  const updatePollOption = useCallback((id: string, field: 'label' | 'emoji', value: string) => {
    setPollOptionsDraft(prev =>
      prev.map(option => (option.id === id ? { ...option, [field]: value } : option))
    );
  }, []);

  const removePollOption = useCallback((id: string) => {
    setPollOptionsDraft(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter(option => option.id !== id);
    });
  }, []);

  const resetPollForm = useCallback(() => {
    const now = Date.now();
    setPollQuestion('');
    setPollStartsAt(toLocalInputDateTime(now));
    setPollEndsAt(toLocalInputDateTime(now + 24 * 60 * 60 * 1000));
    setPollOptionsDraft([createPollDraftOption(), createPollDraftOption()]);
    setPollCreateError(null);
  }, []);

  const handleCreatePoll = useCallback(async () => {
    if (pollCreateSubmitting) return;
    setPollCreateError(null);

    const question = pollQuestion.trim();
    if (!question) {
      setPollCreateError('Poll question is required.');
      return;
    }

    const startsAt = fromLocalInputDateTime(pollStartsAt);
    const endsAt = fromLocalInputDateTime(pollEndsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
      setPollCreateError('Please provide valid start and end times.');
      return;
    }

    if (endsAt <= startsAt) {
      setPollCreateError('Poll end time must be after the start time.');
      return;
    }

    const options = pollOptionsDraft
      .map(option => ({
        label: option.label.trim(),
        emoji: option.emoji.trim() || undefined,
      }))
      .filter(option => option.label.length > 0);

    if (options.length < 2) {
      setPollCreateError('Polls need at least two options.');
      return;
    }

    setPollCreateSubmitting(true);
    const created = await createPoll({
      question,
      options,
      starts_at: startsAt,
      ends_at: endsAt,
    });

    if (!created) {
      setPollCreateError('Failed to create poll.');
    } else {
      resetPollForm();
      setIsPollCreateOpen(false);
      void refreshPolls(false);
    }

    setPollCreateSubmitting(false);
  }, [
    pollCreateSubmitting,
    pollQuestion,
    pollStartsAt,
    pollEndsAt,
    pollOptionsDraft,
    refreshPolls,
    resetPollForm,
  ]);

  const handleVote = useCallback(
    async (pollId: string, optionId: string) => {
      if (pollVotePending) return;
      setPollVotePending(pollId);
      setPollsError(null);
      const result = await voteInPoll(pollId, optionId);
      if (!result) {
        setPollsError('Failed to cast vote. Please try again.');
      }
      void refreshPolls(false);
      setPollVotePending(null);
    },
    [pollVotePending, refreshPolls]
  );

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

    const totalResources = resourceMarketDisabled ? 0 : await getTotalResourceValue();
    const aquariumValue = (userData?.fishing?.aquarium?.fish ?? []).reduce(
      (total, fish) => total + getFishValue(fish),
      0
    );

    setResourcesTotal(totalResources);
    setAquariumTotal(aquariumValue);
    setTotalNetWorth((userData?.money || 0) + totalResources + aquariumValue);

    const socialRooms = socialDisabled ? [] : await getAllRooms();
    setSocialRooms(socialRooms);
  }, [tab, setTabTo, banned, resourceMarketDisabled, socialDisabled]);

  const startTutorial = useCallback(async () => {
    setTutorialStep(0);
    setIsTutorialOpen(true);
    setTutorialProgress({
      openedResourceModal: false,
      openedMarketModal: false,
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTutorialOpen(true);
  }, [user, isTutorialOpen, banned]);

  useEffect(() => {
    if (!isTutorialOpen || !currentTutorialStep?.tab) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTabTo(currentTutorialStep.tab);
  }, [currentTutorialStep, isTutorialOpen, setTabTo]);

  useEffect(() => {
    if (!isTutorialOpen) return;

    if (tab === 'resources' && marketModalResource) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTutorialProgress(prev => ({
        ...prev,
        openedResourceModal: true,
      }));
    }

    if (tab === 'market' && marketModalOpen) {
      setTutorialProgress(prev => ({
        ...prev,
        openedMarketModal: true,
      }));
    }

    if (tab === 'aquarium') {
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
  }, [isTutorialOpen, tab, marketModalResource, marketModalOpen]);

  const equippedNameplateStyle = user?.equipped_cosmetics?.nameplate
    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.nameplate)?.nameplateStyle
    : null;
  const equippedTagCosmetic = user?.equipped_cosmetics?.tag
    ? cosmetics.find(c => c.id === user.equipped_cosmetics?.tag)
    : null;

  useEffect(() => {
    let mounted = true;
    let intervalId: number | undefined;

    if (resourceMarketDisabled) {
      queueMicrotask(() => {
        setResourceListHydrated(true);
        setSortedResources([]);
        setResourcePrices({});
        setResourceQuantities({});
      });
      return () => {
        mounted = false;
        if (intervalId !== undefined) clearInterval(intervalId);
      };
    }

    const updateResource = async () => {
      if (banned || resourceMarketDisabled) return;

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
  }, [banned, resourceMarketDisabled]);

  useEffect(() => {
    if (!resourceMarketDisabled) return;
    queueMicrotask(() => {
      setMarketModalOpen(false);
      setMarketModalResource(null);
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
    if (key === 'resources' || key === 'market') return resourceMarketDisabled;
    if (key === 'fishing' || key === 'aquarium') return fishingDisabled;
    if (key === 'pets') return petsDisabled;
    if (key === 'social') return socialDisabled;
    return false;
  };

  const renderFeatureDisabled = (title: string) => (
    <div className="tab-content feature-disabled">
      <h2>{title}</h2>
      <p>This feature has been disabled by staff.</p>
    </div>
  );

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isLoadingPaymentModal, setIsLoadingPaymentModal] = useState<boolean>(false);
  const [paymentModalCosmeticId, setPaymentModalCosmeticId] = useState<string | null>(null);

  return (
    <>
      <div className="app-container">
        {debugOverlayEnabled && <DebugOverlay position={debugOverlayPosition} />}
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
                    { key: 'social', label: '💬 Social' },
                    { key: 'polls', label: '🗳️ Polls' },
                    { key: 'games', label: '🎮 Games' },
                    { key: 'radio', label: '📻 Radio' },
                    { key: 'leaderboard', label: '🏆 Leaderboard' },
                    { key: 'store', label: '🛒 Store' },
                    { key: 'cosmetics', label: '🎨 Cosmetics' },
                    { key: 'settings', label: '⚙️ Settings' },
                  ] as const);

              const half = Math.ceil(tabs.length / noOfRows);
              const rows = [];
              for (let i = 0; i < noOfRows; i++) {
                rows.push(tabs.slice(i * half, i * half + half));
              }

              const renderTab = (t: { key: typeof tab; label: string }, index: number) => {
                const isAttention = t.key === 'polls' && pollsNeedAttention && tab !== 'polls';
                return (
                  <span
                    key={t.key}
                    className={`tab ${tab === t.key ? 'active' : ''} ${isAttention ? 'attention' : ''} ${!gameHydrated || isFeatureTabDisabled(t.key) ? 'disabled' : ''}`}
                    onClick={() => setTabTo(t.key)}
                    role="tab"
                    tabIndex={index}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setTabTo(t.key);
                      }
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <EmojiText>{t.label}</EmojiText>
                      {t.key === 'social' && socialHasUnread && tab !== 'social' && (
                        <span className="tab-unread-dot" />
                      )}
                      {t.key === 'polls' && isAttention && <span className="tab-attention-dot" />}
                    </div>
                  </span>
                );
              };

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
          {tab === 'resources' &&
            (resourceMarketDisabled ? (
              renderFeatureDisabled('Resources')
            ) : (
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
            ))}
          {tab === 'market' &&
            (resourceMarketDisabled ? (
              renderFeatureDisabled('Market')
            ) : (
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
            ))}
          {tab === 'fishing' &&
            (fishingDisabled ? (
              renderFeatureDisabled('Fishing')
            ) : (
              <div className="tab-content fishing-tab">
                <h2>Fishing</h2>
                <div className="fishing-container">
                  <div className="fishing-hgrid">
                    <div className="fishing-left">
                      <div className="fishing-card">
                        <h2>
                          <EmojiText>🐟</EmojiText> Go Fishing!
                        </h2>
                        <div className="fishing-card-actions">
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
                              (user?.fishing?.last_fished_at || 0) + 5000 > fishingNow ||
                              ((user?.fishing?.aquarium.fish.length || 0) >=
                                (user?.fishing?.aquarium.capacity || 0) &&
                                !autoSellEnabled)
                            }
                          >
                            {(() => {
                              if ((user?.fishing?.last_fished_at || 0) + 5000 > fishingNow) {
                                return `Wait ${formatRemainingMilliseconds(
                                  (user?.fishing?.last_fished_at || 0) + 5000 - fishingNow
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
                            <div className="fishing-result-modifiers">
                              <span className="fishing-result-modifiers-label">Modifiers:</span>
                              {lastCatch.fishCaught.modifiers?.length ? (
                                <div className="fishing-result-modifier-list">
                                  {lastCatch.fishCaught.modifiers.map(mod => {
                                    const modifier = fishModifiers.find(fm => fm.id === mod);
                                    if (!modifier) return null;
                                    return (
                                      <span key={modifier.id} className="fishing-result-modifier">
                                        <EmojiText>{modifier.icon}</EmojiText> {modifier.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="fishing-result-none">None</span>
                              )}
                            </div>

                            <div className="fishing-result-buttons">
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
                                <span className="auto-sold">Auto-sold</span>
                              )}
                            </div>
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
                                              <EmojiText>{typeInfo.icon}</EmojiText> {typeInfo.name}
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

                <Modal
                  isOpen={isRodsModalOpen}
                  onClose={() => setIsRodsModalOpen(false)}
                  width={700}
                >
                  <div className="fishing-modal">
                    <h2>
                      <EmojiText>🎣</EmojiText> Rods Shop
                    </h2>
                    {rodSections.map(section => (
                      <div key={section.id} className="fishing-modal-section">
                        <div className="fishing-modal-section-header">
                          <h3>{section.title}</h3>
                          <div className="fishing-modal-section-meta">
                            <span className="fishing-modal-section-subtitle">
                              {section.subtitle}
                            </span>
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
                                  onClickAsync={async () => {
                                    await buyRod(rod.id);
                                    await updateEverything();
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
                  <div className="fishing-modal">
                    <h2>
                      <EmojiText>🪱</EmojiText> Bait Shop
                    </h2>
                    {baitSections.map(section => (
                      <div key={section.id} className="fishing-modal-section">
                        <div className="fishing-modal-section-header">
                          <h3>{section.title}</h3>
                          <div className="fishing-modal-section-meta">
                            <span className="fishing-modal-section-subtitle">
                              {section.subtitle}
                            </span>
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
                                <div className="bait-pills">
                                  {bait.fish_types_boosted.map(typeId => {
                                    const typeInfo = fishTypes.find(t => t.id === typeId);
                                    if (!typeInfo) return null;
                                    return (
                                      <span key={typeId} className="bait-pill">
                                        <EmojiText>{typeInfo.icon}</EmojiText> {typeInfo.name}
                                      </span>
                                    );
                                  })}
                                </div>
                                <p>
                                  Cost:{' '}
                                  <span className="mono">
                                    {smartFormatNumber(bait.price * (baitQuantities[bait.id] || 1))}
                                  </span>
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
                                  disabled={
                                    !user ||
                                    (user.money || 0) < bait.price * (baitQuantities[bait.id] || 1)
                                  }
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
            ))}
          {tab === 'aquarium' &&
            (fishingDisabled ? (
              renderFeatureDisabled('Aquarium')
            ) : (
              <div className="tab-content">
                <h2>Aquarium</h2>
                <div className="aquarium-banner">
                  <span className="aquarium-banner-subtitle">CURRENT FISHING EVENT</span>
                  <h3 className="aquarium-banner-title">
                    {currentFishingEvent.event ? (
                      <>
                        <EmojiText>{currentFishingEvent.event.icon}</EmojiText>{' '}
                        {currentFishingEvent.event.name}
                      </>
                    ) : (
                      'No active event'
                    )}
                  </h3>
                  <span className="aquarium-banner-remaining">
                    {formatRemainingTime(
                      Math.max(0, Math.floor((currentFishingEvent.endsAt - eventNow) / 1000))
                    )}{' '}
                    {currentFishingEvent.event ? 'remaining' : 'until next event'}
                  </span>
                </div>
                <div className="aquarium-info">
                  {(() => {
                    const fishLength = user?.fishing?.aquarium.fish.length ?? 0;
                    const capacity = user?.fishing?.aquarium.capacity ?? 0;

                    if (fishLength === 0) {
                      return (
                        <>
                          Your aquarium is empty. Catch some fish to display them here!{' '}
                          <span className="aquarium-data">
                            {fishLength}/{capacity}
                          </span>{' '}
                          fish in aquarium.
                        </>
                      );
                    }

                    if (fishLength !== capacity) {
                      return (
                        <>
                          You are using <span className="aquarium-data">{fishLength}</span> out of{' '}
                          <span className="aquarium-data">{capacity}</span> capacity in your
                          aquarium.
                        </>
                      );
                    }

                    return (
                      <>
                        Your aquarium is at full capacity! Try upgrading your aquarium to fit more
                        fish.{' '}
                        <span className="aquarium-data">
                          {fishLength}/{capacity}
                        </span>{' '}
                        fish in aquarium.
                      </>
                    );
                  })()}
                </div>
                <div className="aquarium-action-row">
                  <div className="aquarium-buttons">
                    <Button
                      onClickAsync={async () => {
                        await upgradeAquarium();
                        await updateEverything();
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
                      onClick={() => setIsFishSellAllModalOpen(true)}
                      disabled={(user?.fishing?.aquarium.fish.length || 0) <= 0}
                    >
                      Sell All
                    </Button>
                  </div>
                  <div className="aquarium-controls">
                    <div className="aquarium-control-group">
                      <span className="aquarium-control-label">Sort</span>
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
                    <div className="aquarium-control-group">
                      <span className="aquarium-control-label">Filter</span>
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
                    <div className="aquarium-empty">No fish match those filters.</div>
                  )}
                <div className="aquarium-grid">
                  {aquariumFishView.map(fish => (
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
                            <EmojiText>{fishModifiers.find(fm => fm.id === mod)?.icon}</EmojiText>{' '}
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

                <Modal
                  isOpen={isFishSellAllModalOpen}
                  onClose={() => setIsFishSellAllModalOpen(false)}
                >
                  <div className="fish-sell-modal">
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
                    <div className="fish-sell-modal-buttons">
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
                  refreshUser={updateEverything}
                />
              </div>
            ))}
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
                />
              </div>
            ))}
          {tab === 'polls' && (
            <div className="tab-content polls-tab">
              <div className="polls-header">
                <h2>Polls</h2>
                <div className="polls-header-actions">
                  {canCreatePoll && (
                    <Button onClick={() => setIsPollCreateOpen(true)}>Create Poll</Button>
                  )}
                  <Button
                    secondary
                    onClick={() => void refreshPolls(true)}
                    disabled={pollsLoading}
                    isLoading={pollsLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {pollsError && <div className="polls-error">{pollsError}</div>}

              {pollsLoading && polls.length === 0 ? (
                <p>Loading polls...</p>
              ) : (
                <div className="polls-sections">
                  <div className="polls-section">
                    <h3>Active Polls</h3>
                    {activePolls.length === 0 && (
                      <p className="polls-empty">No active polls right now.</p>
                    )}
                    {activePolls.map(poll => {
                      const totalVotes =
                        poll.total_votes ??
                        poll.results?.reduce((total, result) => total + result.count, 0) ??
                        0;
                      const showResults = Boolean(poll.results);
                      const myVoteLabel = poll.options.find(
                        option => option.id === poll.my_vote
                      )?.label;
                      const remainingStart = Math.max(
                        0,
                        Math.floor((poll.starts_at - eventNow) / 1000)
                      );
                      const remainingEnd = Math.max(
                        0,
                        Math.floor((poll.ends_at - eventNow) / 1000)
                      );
                      const timeLabel =
                        poll.status === 'upcoming'
                          ? `Starts in ${formatRemainingTime(remainingStart) || '0s'}`
                          : `Ends in ${formatRemainingTime(remainingEnd) || '0s'}`;

                      return (
                        <div key={poll.uuid} className="poll-card">
                          <div className="poll-card-header">
                            <span className="poll-question">{poll.question}</span>
                            <span className="poll-status">{timeLabel}</span>
                          </div>
                          <div className="poll-meta">
                            <span>Asked by {poll.created_by_username}</span>
                            {poll.has_voted && myVoteLabel && (
                              <span className="poll-voted">You voted for {myVoteLabel}</span>
                            )}
                          </div>

                          {poll.status === 'upcoming' && (
                            <p className="polls-empty">Voting opens when the poll starts.</p>
                          )}

                          {poll.status === 'active' && !poll.has_voted && (
                            <div className="poll-options">
                              {poll.options.map(option => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className="poll-option-button"
                                  onClick={() => void handleVote(poll.uuid, option.id)}
                                  disabled={pollVotePending === poll.uuid}
                                >
                                  <span className="poll-option-label">
                                    {option.emoji && (
                                      <span className="poll-option-emoji">
                                        <EmojiText>{option.emoji}</EmojiText>
                                      </span>
                                    )}
                                    {option.label}
                                  </span>
                                  <span className="poll-option-action">Vote</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {showResults ? (
                            <div className="poll-results">
                              {poll.options.map(option => {
                                const count =
                                  poll.results?.find(result => result.option_id === option.id)
                                    ?.count || 0;
                                const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                                return (
                                  <div key={option.id} className="poll-result-row">
                                    <div className="poll-result-meta">
                                      <span className="poll-result-label">
                                        {option.emoji && <EmojiText>{option.emoji}</EmojiText>}{' '}
                                        {option.label}
                                      </span>
                                      <span className="poll-result-count">
                                        {count} vote{count === 1 ? '' : 's'} ({Math.round(percent)}
                                        %)
                                      </span>
                                    </div>
                                    <div className="poll-result-track">
                                      <div
                                        className="poll-result-bar"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="poll-result-total">Total votes: {totalVotes}</div>
                            </div>
                          ) : (
                            poll.status === 'active' && (
                              <div className="poll-results-hidden">Vote to reveal the results.</div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="polls-section">
                    <h3>Completed Polls</h3>
                    {completedPolls.length === 0 && (
                      <p className="polls-empty">No completed polls yet.</p>
                    )}
                    {completedPolls.map(poll => {
                      const totalVotes =
                        poll.total_votes ??
                        poll.results?.reduce((total, result) => total + result.count, 0) ??
                        0;
                      const endedLabel = new Date(poll.ends_at).toLocaleString();
                      return (
                        <div key={poll.uuid} className="poll-card">
                          <div className="poll-card-header">
                            <span className="poll-question">{poll.question}</span>
                            <span className="poll-status">Ended {endedLabel}</span>
                          </div>
                          <div className="poll-meta">
                            <span>Asked by {poll.created_by_username}</span>
                          </div>
                          <div className="poll-results">
                            {poll.options.map(option => {
                              const count =
                                poll.results?.find(result => result.option_id === option.id)
                                  ?.count || 0;
                              const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                              return (
                                <div key={option.id} className="poll-result-row">
                                  <div className="poll-result-meta">
                                    <span className="poll-result-label">
                                      {option.emoji && <EmojiText>{option.emoji}</EmojiText>}{' '}
                                      {option.label}
                                    </span>
                                    <span className="poll-result-count">
                                      {count} vote{count === 1 ? '' : 's'} ({Math.round(percent)}%)
                                    </span>
                                  </div>
                                  <div className="poll-result-track">
                                    <div
                                      className="poll-result-bar"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <div className="poll-result-total">Total votes: {totalVotes}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {canCreatePoll && (
                <Modal
                  isOpen={isPollCreateOpen}
                  onClose={() => setIsPollCreateOpen(false)}
                  width={700}
                >
                  <div className="poll-create">
                    <div className="poll-create-header">
                      <h3>Create Poll</h3>
                      <Button secondary onClick={resetPollForm} disabled={pollCreateSubmitting}>
                        Reset
                      </Button>
                    </div>
                    <label className="poll-form-field">
                      <span>Question</span>
                      <input
                        className="poll-input"
                        type="text"
                        value={pollQuestion}
                        onChange={event => setPollQuestion(event.target.value)}
                        placeholder="Ask the community a question"
                        maxLength={140}
                      />
                    </label>
                    <div className="poll-form-grid">
                      <label className="poll-form-field">
                        <span>Starts At</span>
                        <input
                          className="poll-input"
                          type="datetime-local"
                          value={pollStartsAt}
                          onChange={event => setPollStartsAt(event.target.value)}
                        />
                      </label>
                      <label className="poll-form-field">
                        <span>Ends At</span>
                        <input
                          className="poll-input"
                          type="datetime-local"
                          value={pollEndsAt}
                          onChange={event => setPollEndsAt(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="poll-options-editor">
                      <div className="poll-options-header">
                        <span>Options</span>
                        <Button
                          secondary
                          onClick={addPollOption}
                          disabled={pollOptionsDraft.length >= 8}
                        >
                          Add Option
                        </Button>
                      </div>
                      {pollOptionsDraft.map(option => (
                        <div key={option.id} className="poll-option-row">
                          <input
                            className="poll-input poll-emoji-input"
                            type="text"
                            value={option.emoji}
                            onChange={event =>
                              updatePollOption(option.id, 'emoji', event.target.value)
                            }
                            placeholder="Emoji"
                            maxLength={8}
                          />
                          <input
                            className="poll-input"
                            type="text"
                            value={option.label}
                            onChange={event =>
                              updatePollOption(option.id, 'label', event.target.value)
                            }
                            placeholder="Option label"
                            maxLength={60}
                          />
                          <Button
                            onClick={() => removePollOption(option.id)}
                            disabled={pollOptionsDraft.length <= 2}
                            color="red"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    {pollCreateError && <div className="polls-error">{pollCreateError}</div>}
                    <div className="poll-create-actions">
                      <Button
                        secondary
                        onClick={() => setIsPollCreateOpen(false)}
                        disabled={pollCreateSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => void handleCreatePoll()}
                        disabled={pollCreateSubmitting}
                      >
                        {pollCreateSubmitting ? 'Creating...' : 'Create Poll'}
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}
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
          {/* Gems moved into the Store tab as a subview */}
          {tab === 'store' && (
            <div className="tab-content">
              <div className="store-header">
                <h2>Store</h2>
                <div className="store-subtabs">
                  <button
                    type="button"
                    className={`store-subtab ${storeView === 'cosmetics' ? 'active' : ''}`}
                    onClick={() => setStoreView('cosmetics')}
                  >
                    🎨 Cosmetics
                  </button>
                  <button
                    type="button"
                    className={`store-subtab ${storeView === 'gems' ? 'active' : ''}`}
                    onClick={() => setStoreView('gems')}
                  >
                    💎 Gems
                  </button>
                </div>
              </div>

              {storeView === 'gems' && (
                <div className="gems-section">
                  <h3>Gems Store</h3>
                  <div className="gem-card-list">
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
                </div>
              )}

              {storeView === 'cosmetics' && (
                <>
                  <Checkbox
                    label="Hide already bought cosmetics"
                    checked={hideBoughtCosmetics}
                    onClick={setHideBoughtCosmetics}
                  />
                  <div className="cosmetics-grid">
                    {cosmetics.filter(
                      c =>
                        c.buyable &&
                        (!hideBoughtCosmetics || !user?.cosmetics_unlocked?.includes(c.id))
                    ).length === 0 && (
                      <p className="no-cosmetics-message">
                        No cosmetics are available for purchase at this time. Please check back
                        later or remove filters.
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
                            <EmojiText>{rarityEmojis[cosmetic.rarity]}</EmojiText>{' '}
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
                            onClick={() => {
                              if (user?.cosmetics_unlocked?.includes(cosmetic.id)) return;
                              setIsPaymentModalOpen(true);
                              setPaymentModalCosmeticId(cosmetic.id);
                            }}
                          >
                            {user?.cosmetics_unlocked?.includes(cosmetic.id) && 'Purchased'}
                            {!user?.cosmetics_unlocked?.includes(cosmetic.id) &&
                              `Buy for ${smartFormatNumber(cosmetic.price || 0, false, false, false)} Gems`}
                          </Button>
                        </div>
                      ))}
                  </div>
                </>
              )}
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
                        <EmojiText>{rarityEmojis[cosmetic.rarity]}</EmojiText>{' '}
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
              <Settings user={user!} onRestartTutorial={startTutorial} />
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
      {isTutorialOpen && (
        <div className="tutorial-dock" role="status" aria-live="polite">
          <div className="tutorial-card">
            <div className="tutorial-npc">
              <span className="tutorial-npc-avatar">
                <EmojiText>🐠</EmojiText>
              </span>
              <span className="tutorial-npc-name">Reef Guide</span>
            </div>
            <div className="tutorial-body">
              <span className="tutorial-step-count">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </span>
              <h3>{currentTutorialStep?.title}</h3>
              <p>{currentTutorialStep?.body}</p>
              {currentTutorialStep?.task && (
                <div className="tutorial-task">
                  <span className="tutorial-task-label">Task</span>
                  <span
                    className={`tutorial-task-value ${isTutorialStepComplete ? 'done' : 'todo'}`}
                  >
                    {currentTutorialStep.task}
                  </span>
                </div>
              )}
            </div>
            <div className="tutorial-actions">
              <Button secondary onClick={() => void handleTutorialComplete()}>
                Skip
              </Button>
              <div className="tutorial-nav">
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
      <Modal isOpen={isDailyRewardModalOpen} onClose={() => setIsDailyRewardModalOpen(false)}>
        <div className="daily-reward-modal">
          <div className="daily-reward-header">
            <div>
              <h2>Daily Login Rewards</h2>
              <p className="daily-reward-subtitle">Come back each day to build your streak.</p>
            </div>
          </div>
          <div className="daily-reward-grid">
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
                  className={`daily-reward-card${isClaimed ? ' claimed' : ''}${
                    isToday ? ' today' : ''
                  }`}
                >
                  <div className="daily-reward-day">Day {reward.day}</div>
                  <div className="daily-reward-amount">{rewardLabel}</div>
                </div>
              );
            })}
          </div>
          {dailyRewardResult?.reward && (
            <div className="daily-reward-today">
              <span className="daily-reward-today-label">Today&apos;s reward</span>
              <strong className="daily-reward-today-amount">
                {dailyRewardResult.reward.type === 'money'
                  ? `+${smartFormatNumber(dailyRewardResult.reward.amount)}`
                  : `+${dailyRewardResult.reward.amount} Gems`}
              </strong>
            </div>
          )}
          <div className="daily-reward-actions">
            <Button onClick={() => setIsDailyRewardModalOpen(false)} secondary>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        isLoading={isLoadingPaymentModal}
        type="gems"
        amount={cosmetics.find(c => c.id === paymentModalCosmeticId)?.price || 0}
        balance={user?.gems ?? 0}
        productName={
          cosmetics.find(c => c.id === paymentModalCosmeticId)?.name || 'Unknown Cosmetic'
        }
        onClose={() => setIsPaymentModalOpen(false)}
        onPurchase={async () => {
          setIsLoadingPaymentModal(true);

          // Artificial delay, since the purchase is usually instant
          await new Promise(resolve => setTimeout(resolve, 750));

          // Purchase the cosmetic
          await buyCosmetic(paymentModalCosmeticId!);
          await updateEverything();

          setIsLoadingPaymentModal(false);
          setIsPaymentModalOpen(false);
        }}
      />
    </>
  );
}

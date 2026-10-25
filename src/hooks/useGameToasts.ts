import React from 'react';
import type { EventToastData } from '../components/notificationtoast/NotificationToasts';
import type { Track } from '../helpers/tracks';
import type { IUser } from '../../server/common/models/user';
import { ACHIEVEMENTS } from '../../server/common/achievements';
import { getTimeZoneDayIndex, SYDNEY_TIME_ZONE } from '../../server/common/timezone';

const TOAST_DURATION_MS = 7000;

export type GameToastState = {
  toasts: EventToastData[];
  dismissToast: (id: string) => void;
};

/**
 * Raised for things that happen to the current player rather than the wider
 * site: song changes, newly unlocked achievements, and the daily chest being
 * available when the game finishes hydrating after login.
 */
export function useGameToasts(opts: {
  currentTrack: Track | null;
  user: IUser | null;
  hydrated: boolean;
}): GameToastState {
  const { currentTrack, user, hydrated } = opts;
  const [toasts, setToasts] = React.useState<EventToastData[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = React.useCallback(
    (toast: EventToastData) => {
      setToasts(prev => [...prev.slice(-2), toast]);
      timersRef.current.set(
        toast.id,
        setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS)
      );
    },
    [dismissToast]
  );

  // Song changes. This also fires for the first track started after a page
  // load, which is useful confirmation that the picker/play button worked.
  const lastTrackKeyRef = React.useRef<string | null>(null);
  const trackKey = currentTrack ? (currentTrack.id ?? currentTrack.src) : null;

  React.useEffect(() => {
    if (!currentTrack || !trackKey) {
      lastTrackKeyRef.current = null;
      return;
    }
    if (lastTrackKeyRef.current === trackKey) return;
    lastTrackKeyRef.current = trackKey;

    pushToast({
      kind: 'event',
      id: `song-${trackKey}-${Date.now()}`,
      icon: '🎵',
      title: 'Now playing',
      body: `${currentTrack.title} — ${currentTrack.artist}`,
      tone: 'primary',
      tab: 'radio',
    });
  }, [currentTrack, trackKey, pushToast]);

  // Achievement unlocks. The first snapshot is treated as a baseline so the
  // achievements already earned before logging in do not spam the screen.
  const achievementsUserRef = React.useRef<string | null>(null);
  const seenAchievementsRef = React.useRef<Set<string> | null>(null);

  React.useEffect(() => {
    if (!hydrated || !user) return;

    const earned = new Set(user.achievements ?? []);

    if (achievementsUserRef.current !== user.uuid) {
      achievementsUserRef.current = user.uuid;
      seenAchievementsRef.current = earned;
      return;
    }

    const previous = seenAchievementsRef.current;
    if (!previous) {
      seenAchievementsRef.current = earned;
      return;
    }

    seenAchievementsRef.current = earned;
    for (const id of earned) {
      if (previous.has(id)) continue;
      const info = ACHIEVEMENTS.find(achievement => achievement.id === id);
      pushToast({
        kind: 'event',
        id: `achievement-${id}-${Date.now()}`,
        icon: info?.icon ?? '🏅',
        title: 'Achievement unlocked!',
        body: info ? `${info.name} — ${info.description}` : 'A new achievement was unlocked.',
        tone: 'success',
        tab: 'achievements',
      });
    }
  }, [hydrated, user, pushToast]);

  // Daily chest availability, announced once per login/session.
  const dailyCheckedUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!hydrated || !user) return;
    if (dailyCheckedUserRef.current === user.uuid) return;
    dailyCheckedUserRef.current = user.uuid;

    const today = getTimeZoneDayIndex(Date.now(), SYDNEY_TIME_ZONE);
    if ((user.daily_rewards?.last_claimed_day ?? 0) === today) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    pushToast({
      kind: 'event',
      id: `daily-${user.uuid}-${today}`,
      icon: '🪎',
      title: 'Daily reward available',
      body: 'Open your daily chest to keep your streak going.',
      tone: 'primary',
      tab: 'rewards',
    });
  }, [hydrated, user, pushToast]);

  return { toasts, dismissToast };
}

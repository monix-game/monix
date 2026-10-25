import React from 'react';
import { useSocket } from '../providers/socket';
import type { FishingFrenzyStatus } from '../helpers/fishing';
import { FRENZY_WEIGHT_MULTIPLIER } from '../../server/common/fishing/fishingFrenzy';
import type { EventToastData } from '../components/notificationtoast/NotificationToasts';

const TOAST_DURATION_MS = 7000;

export type EventNotificationState = {
  toasts: EventToastData[];
  dismissToast: (id: string) => void;
};

/**
 * Watches the `fishing:frenzy` status channel and raises a toast whenever the
 * frenzy starts or ends for everyone. The socket only pushes on state changes
 * (activation, expiry, admin reset), so the transition is detected by comparing
 * the incoming status against the last one seen. The first snapshot received on
 * subscribe is treated as "no change" so simply opening the page while a frenzy
 * is already running does not fire a spurious "started" toast.
 */
export function useEventNotifications(opts: { enabled: boolean }): EventNotificationState {
  const { subscribe } = useSocket();
  const enabledRef = React.useRef(opts.enabled);
  const previousActiveRef = React.useRef<boolean | null>(null);
  const [toasts, setToasts] = React.useState<EventToastData[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  React.useEffect(() => {
    enabledRef.current = opts.enabled;
  }, [opts.enabled]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  React.useEffect(() => {
    const timers = timersRef.current;

    const unsubscribe = subscribe('fishing:frenzy', data => {
      const status = data as FishingFrenzyStatus;
      if (!status || typeof status.active !== 'boolean') return;

      const previous = previousActiveRef.current;
      previousActiveRef.current = status.active;

      // First snapshot after subscribing: record the baseline, don't announce.
      if (previous === null) return;
      if (previous === status.active) return;
      if (!enabledRef.current) return;

      const id = `frenzy-${status.active ? 'start' : 'end'}-${Date.now()}`;
      const toast: EventToastData = status.active
        ? {
            kind: 'event',
            id,
            icon: '🌊',
            title: 'Fishing Frenzy started!',
            body: `${FRENZY_WEIGHT_MULTIPLIER}x fish weight for everyone, for one minute.`,
            tone: 'primary',
          }
        : {
            kind: 'event',
            id,
            icon: '🌊',
            title: 'Fishing Frenzy ended',
            body: 'The frenzy is over. Normal fishing has resumed.',
            tone: 'success',
          };

      setToasts(prev => [...prev.slice(-2), toast]);
      timers.set(
        id,
        setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
      );
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [subscribe, dismissToast]);

  return { toasts, dismissToast };
}

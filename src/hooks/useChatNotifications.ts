import React from 'react';
import { useSocket } from '../providers/socket';
import type { ChatToastData } from '../components/notificationtoast/NotificationToasts';

type NewMessageData = {
  room_uuid?: string;
  room_name?: string;
  sender_uuid?: string;
  sender_username?: string;
  sender_avatar_url?: string;
  content?: string;
  time_sent?: number;
};

export type ChatNotificationState = {
  unreadByRoom: Record<string, number>;
  totalUnread: number;
  toasts: ChatToastData[];
  dismissToast: (id: string) => void;
  clearRoom: (roomUuid: string) => void;
  clearAll: () => void;
};

const TOAST_DURATION_MS = 6000;

/**
 * Consumes the global `chat:new-message` channel to drive the Social-tab unread
 * dot and the in-app (bottom-right) toasts for the online client. Offline push
 * notifications are handled entirely by the service worker / server, not here.
 */
export function useChatNotifications(opts: {
  userUuid?: string | null;
  enabled: boolean;
  isRoomActive: (roomUuid: string) => boolean;
}): ChatNotificationState {
  const { subscribe } = useSocket();
  const enabledRef = React.useRef(opts.enabled);
  const isRoomActiveRef = React.useRef(opts.isRoomActive);
  const userUuidRef = React.useRef(opts.userUuid);

  React.useEffect(() => {
    enabledRef.current = opts.enabled;
    isRoomActiveRef.current = opts.isRoomActive;
    userUuidRef.current = opts.userUuid;
  }, [opts.enabled, opts.isRoomActive, opts.userUuid]);

  const [unreadByRoom, setUnreadByRoom] = React.useState<Record<string, number>>({});
  const [toasts, setToasts] = React.useState<ChatToastData[]>([]);
  const toastTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const queuedToastIdsRef = React.useRef<Set<string>>(new Set());

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    queuedToastIdsRef.current.delete(id);
  }, []);

  const clearRoom = React.useCallback((roomUuid: string) => {
    setUnreadByRoom(prev => {
      if (!prev[roomUuid]) return prev;
      const next = { ...prev };
      delete next[roomUuid];
      return next;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setUnreadByRoom({});
  }, []);

  React.useEffect(() => {
    const timers = toastTimersRef.current;
    const unsubscribe = subscribe('chat:new-message', data => {
      const msg = (data as NewMessageData) || {};
      const { room_uuid, room_name, sender_uuid, sender_username, sender_avatar_url, content } =
        msg;

      if (!room_uuid) return;
      if (typeof content !== 'string' || content.length === 0) return;
      if (sender_uuid && userUuidRef.current && sender_uuid === userUuidRef.current) return;

      const active = isRoomActiveRef.current(room_uuid);

      // Track unread for the Social-tab dot (always on, regardless of the
      // notifications setting). Skip the room the user is currently reading.
      if (!active) {
        setUnreadByRoom(prev => ({
          ...prev,
          [room_uuid]: (prev[room_uuid] || 0) + 1,
        }));
      }

      // In-app toasts are gated by the notifications setting.
      if (!enabledRef.current) return;
      if (active) return;

      const id = `${room_uuid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (queuedToastIdsRef.current.has(id)) return;
      queuedToastIdsRef.current.add(id);

      setToasts(prev => [...prev.slice(-4), { id, roomUuid: room_uuid, roomName: room_name || 'Chat', senderUsername: sender_username || 'Someone', senderAvatarUrl: sender_avatar_url, content }]);

      const timer = setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);
      timers.set(id, timer);
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, [subscribe, dismissToast]);

  const totalUnread = Object.values(unreadByRoom).reduce((sum, n) => sum + n, 0);

  return {
    unreadByRoom,
    totalUnread,
    toasts,
    dismissToast,
    clearRoom,
    clearAll,
  };
}

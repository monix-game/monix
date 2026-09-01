import React from 'react';
import { SocketContext, type SocketSnapshotHandler } from './socket';
import { API_BASE } from '../helpers/api';
import { localStorageKey } from '../helpers/constants';

type Props = {
  children: React.ReactNode;
};

const MAX_RECONNECT_MS = 15000;

function buildSocketUrl(): string {
  const url = new URL(API_BASE, globalThis.location.origin);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/ws`;
}

type PendingRequest = {
  ackType: string;
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function SocketProvider({ children }: Readonly<Props>) {
  const [connected, setConnected] = React.useState<boolean>(false);
  const socketRef = React.useRef<WebSocket | null>(null);
  const subscribedChannelsRef = React.useRef<Map<string, Set<SocketSnapshotHandler>>>(new Map());
  const pendingPingRef = React.useRef<{
    resolve: (ms: number) => void;
    timer: ReturnType<typeof setTimeout>;
    start: number;
  } | null>(null);
  const intentionalCloseRef = React.useRef<boolean>(false);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = React.useRef<number>(0);
  const pendingRequestsRef = React.useRef<PendingRequest[]>([]);

  const sendMessage = React.useCallback((data: unknown) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }, []);

  const request = React.useCallback(
    (op: string, payload: Record<string, unknown>, ackType: string, timeoutMs = 5000) =>
      new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingRequestsRef.current = pendingRequestsRef.current.filter(r => r.timer !== timer);
          reject(new Error(`${op} timed out`));
        }, timeoutMs);
        pendingRequestsRef.current.push({ ackType, resolve, reject, timer });
        sendMessage({ op, ...payload });
      }),
    [sendMessage]
  );

  const authSockets = React.useCallback(() => {
    const token = localStorage.getItem(localStorageKey('session_token'));
    if (token) {
      sendMessage({ op: 'auth', token });
    }
  }, [sendMessage]);

  const resubscribeAll = React.useCallback(() => {
    for (const channel of subscribedChannelsRef.current.keys()) {
      sendMessage({ op: 'subscribe', channel });
    }
  }, [sendMessage]);

  const subscribe = React.useCallback(
    (channel: string, handler: SocketSnapshotHandler) => {
      let handlers = subscribedChannelsRef.current.get(channel);
      if (!handlers) {
        handlers = new Set();
        subscribedChannelsRef.current.set(channel, handlers);
        sendMessage({ op: 'subscribe', channel });
      }
      handlers.add(handler);

      return () => {
        const setForChannel = subscribedChannelsRef.current.get(channel);
        if (!setForChannel) return;
        setForChannel.delete(handler);
        if (setForChannel.size === 0) {
          subscribedChannelsRef.current.delete(channel);
          sendMessage({ op: 'unsubscribe', channel });
        }
      };
    },
    [sendMessage]
  );

  const ping = React.useCallback(async (): Promise<number> => {
    const existing = pendingPingRef.current;
    if (existing) {
      clearTimeout(existing.timer);
      existing.resolve(0);
      pendingPingRef.current = null;
    }

    const start = performance.now();
    return new Promise<number>(resolve => {
      const timer = setTimeout(() => {
        if (pendingPingRef.current?.timer === timer) {
          pendingPingRef.current = null;
          resolve(0);
        }
      }, 3000);
      pendingPingRef.current = { resolve, timer, start };
      sendMessage({ op: 'ping' });
    });
  }, [sendMessage]);

  const connectRef = React.useRef<() => void>(() => {});

  const connect = React.useCallback(() => {
    intentionalCloseRef.current = false;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    if (socketRef.current?.readyState === WebSocket.CONNECTING) return;

    const socket = new WebSocket(buildSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnected(true);
      authSockets();
      resubscribeAll();
    };

    socket.onmessage = event => {
      let message: {
        type?: string;
        channel?: string;
        data?: unknown;
        ok?: boolean;
        error?: string;
      } | null = null;
      try {
        message = JSON.parse(String(event.data)) as {
          type?: string;
          channel?: string;
          data?: unknown;
          ok?: boolean;
          error?: string;
        };
      } catch {
        return;
      }

      if (message?.type === 'snapshot' && typeof message.channel === 'string') {
        const handlers = subscribedChannelsRef.current.get(message.channel);
        if (!handlers) return;
        for (const handler of handlers) {
          handler(message.data);
        }
      } else if (message?.type === 'pong') {
        const pending = pendingPingRef.current;
        if (pending) {
          pendingPingRef.current = null;
          clearTimeout(pending.timer);
          pending.resolve(Math.round(performance.now() - pending.start));
        }
      } else if (message?.type) {
        const idx = pendingRequestsRef.current.findIndex(r => r.ackType === message.type);
        if (idx !== -1) {
          const [req] = pendingRequestsRef.current.splice(idx, 1);
          clearTimeout(req.timer);
          req.resolve(message);
        }
      }
    };

    socket.onclose = () => {
      setConnected(false);
      if (intentionalCloseRef.current) return;
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, MAX_RECONNECT_MS);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connectRef.current, delay);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [authSockets, resubscribeAll]);

  React.useEffect(() => {
    connectRef.current = connect;
    connect();
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connect]);

const send = React.useCallback(
  (op: string, payload: Record<string, unknown> = {}) => {
    sendMessage({ op, ...payload });
  },
  [sendMessage]
);

  const value = React.useMemo(
    () => ({ connected, subscribe, send, request, ping }),
    [connected, subscribe, send, request, ping]
  );

  return <SocketContext value={value}>{children}</SocketContext>;
}

export default SocketProvider;

import React from 'react';

export type SocketSnapshotHandler = (data: unknown) => void;

export type SocketSendResult = {
  ok: boolean;
  error?: string;
};

export type SocketContextValue = {
  connected: boolean;
  subscribe: (channel: string, handler: SocketSnapshotHandler) => () => void;
  send: (op: string, payload?: Record<string, unknown>) => void;
  request: (
    op: string,
    payload: Record<string, unknown>,
    ackType: string
  ) => Promise<unknown>;
  ping: () => Promise<number>;
};

export const SocketContext = React.createContext<SocketContextValue | undefined>(undefined);

export function useSocket(): SocketContextValue {
  const ctx = React.use(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
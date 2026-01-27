import React from 'react';
import type { Track } from '../helpers/tracks';

export type MusicContextValue = {
  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number; // 0.0 - 1.0
  enqueue: (tracks: Track | Track[]) => void;
  playAt: (index: number) => void;
  playNext: () => void;
  playPrev: () => void;
  pause: () => void;
  resume: () => void;
  setVolume: (v: number) => void;
  clearQueue: () => void;
};

export const MusicContext = React.createContext<MusicContextValue | undefined>(undefined);

export function useMusic(): MusicContextValue {
  const ctx = React.use(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}

import React from 'react';
import { MusicContext, type MusicContextValue } from './music';
import type { Track } from '../helpers/tracks';

type Props = {
  children: React.ReactNode;
  fadeDurationMs?: number; // default 1000ms
};

export function MusicProvider({ children, fadeDurationMs = 1000 }: Readonly<Props>) {
  const [queue, setQueue] = React.useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(-1);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.7);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const fadingRef = React.useRef<{ cancel?: () => void } | null>(null);
  const endingRef = React.useRef(false);

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const cleanupAudio = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.src = '';
    a.onended = null;
    audioRef.current = null;
  }, []);

  const fadeTo = React.useCallback((target: number, durationMs: number, onDone?: () => void) => {
    const a = audioRef.current;
    if (!a) {
      onDone?.();
      return;
    }
    // cancel existing fade
    fadingRef.current?.cancel?.();
    const start = performance.now();
    const from = a.volume;
    const clampedTarget = Math.max(0, Math.min(1, target));
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      const v = from + (clampedTarget - from) * t;
      a.volume = v;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };
    fadingRef.current = { cancel: () => (cancelled = true) };
    requestAnimationFrame(tick);
  }, []);

  const startTrack = React.useCallback(
    (track: Track) => {
      endingRef.current = false;
      // Stop any existing audio
      cleanupAudio();
      const a = new Audio(track.src);
      a.preload = 'auto';
      a.volume = 0; // start from 0 for fade-in
      a.onended = () => {
        playNext();
      };
      audioRef.current = a;
      a.play()
        .then(() => {
          setIsPlaying(true);
          fadeTo(volume, fadeDurationMs);
        })
        .catch(() => {
          // Autoplay restrictions; mark as not playing.
          setIsPlaying(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fadeDurationMs, volume]
  );

  const playAt = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      setCurrentIndex(index);
      const track = queue[index];
      // Crossfade: fade out current then start next with fade in
      if (audioRef.current) {
        fadeTo(0, fadeDurationMs, () => {
          startTrack(track);
        });
      } else {
        startTrack(track);
      }
    },
    [queue, fadeDurationMs, fadeTo, startTrack]
  );

  const playNext = React.useCallback(() => {
    if (queue.length === 0) return;
    const next = currentIndex + 1 < queue.length ? currentIndex + 1 : -1;
    if (next === -1) {
      if (endingRef.current) return; // already handling end fade
      endingRef.current = true;
      const a = audioRef.current;
      if (a) {
        a.onended = null; // prevent re-entrancy during fade
      }
      // reached end of queue
      fadeTo(0, Math.min(500, fadeDurationMs), () => {
        a?.pause();
        cleanupAudio();
        setIsPlaying(false);
        setCurrentIndex(-1);
        endingRef.current = false;
      });
    } else {
      playAt(next);
    }
  }, [queue.length, currentIndex, fadeDurationMs, fadeTo, cleanupAudio, playAt]);

  const playPrev = React.useCallback(() => {
    if (queue.length === 0) return;
    const prev = Math.max(0, currentIndex - 1);
    playAt(prev);
  }, [queue.length, currentIndex, playAt]);

  const enqueue = React.useCallback(
    (tracks: Track | Track[]) => {
      setQueue(prev => {
        const newQueue = Array.isArray(tracks) ? [...prev, ...tracks] : [...prev, tracks];
        // Autostart if nothing is playing
        if (prev.length === 0 && newQueue.length > 0) {
          setTimeout(() => playAt(0), 0);
        }
        return newQueue;
      });
    },
    [playAt]
  );

  const pause = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    fadeTo(0, Math.min(300, fadeDurationMs), () => {
      a.pause();
      setIsPlaying(false);
    });
  }, [fadeTo, fadeDurationMs]);

  const resume = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) {
      if (currentTrack) startTrack(currentTrack);
      return;
    }
    a.play()
      .then(() => {
        setIsPlaying(true);
        fadeTo(volume, Math.min(300, fadeDurationMs));
      })
      .catch(() => {
        // Ignore resume errors (e.g., autoplay restrictions)
      });
  }, [currentTrack, startTrack, fadeTo, volume, fadeDurationMs]);

  const setVolumeLevel = React.useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    const a = audioRef.current;
    if (a) a.volume = clamped;
  }, []);

  const clearQueue = React.useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    fadeTo(0, Math.min(300, fadeDurationMs), () => cleanupAudio());
  }, [fadeTo, fadeDurationMs, cleanupAudio]);

  const value: MusicContextValue = React.useMemo(
    () => ({
      queue,
      currentIndex,
      currentTrack,
      isPlaying,
      volume,
      enqueue,
      playAt,
      playNext,
      playPrev,
      pause,
      resume,
      setVolume: setVolumeLevel,
      clearQueue,
    }),
    [
      queue,
      currentIndex,
      currentTrack,
      isPlaying,
      volume,
      enqueue,
      playAt,
      playNext,
      playPrev,
      pause,
      resume,
      setVolumeLevel,
      clearQueue,
    ]
  );

  return <MusicContext value={value}>{children}</MusicContext>;
}

export default MusicProvider;

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

  // Refs hold the latest values so audio event callbacks never read stale state.
  const queueRef = React.useRef<Track[]>([]);
  const currentIndexRef = React.useRef<number>(-1);
  const volumeRef = React.useRef(0.7);
  const fadeDurationRef = React.useRef(fadeDurationMs);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const fadingRef = React.useRef<{ cancel?: () => void } | null>(null);
  const endingRef = React.useRef(false);

  const syncQueue = React.useCallback((next: Track[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const syncIndex = React.useCallback((next: number) => {
    currentIndexRef.current = next;
    setCurrentIndex(next);
  }, []);

  React.useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  React.useEffect(() => {
    fadeDurationRef.current = fadeDurationMs;
  }, [fadeDurationMs]);

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

  const fadeTo = React.useCallback(
    (target: number, durationMs: number, onDone?: () => void) => {
      const a = audioRef.current;
      if (!a) {
        onDone?.();
        return;
      }
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
    },
    []
  );

  const startTrackRef = React.useRef<(track: Track) => void>(() => {});

  const startTrack = React.useCallback(
    (track: Track) => {
      endingRef.current = false;
      cleanupAudio();
      const a = new Audio(track.src);
      a.preload = 'auto';
      a.volume = 0; // start from 0 for fade-in
      a.onended = () => {
        // Use the refs (never stale) to decide what to play next.
        const q = queueRef.current;
        const idx = currentIndexRef.current;
        const next = idx + 1 < q.length ? idx + 1 : -1;
        if (next === -1) {
          if (endingRef.current) return;
          endingRef.current = true;
          fadeTo(0, Math.min(500, fadeDurationRef.current), () => {
            cleanupAudio();
            syncIndex(-1);
            setIsPlaying(false);
            endingRef.current = false;
          });
        } else {
          startTrackRef.current(q[next]);
          syncIndex(next);
          fadeTo(volumeRef.current, fadeDurationRef.current);
        }
      };
      audioRef.current = a;
      a.play()
        .then(() => {
          setIsPlaying(true);
          fadeTo(volumeRef.current, fadeDurationRef.current);
        })
        .catch(() => {
          // Autoplay restrictions; mark as not playing.
          setIsPlaying(false);
        });
    },
    [cleanupAudio, fadeTo, syncIndex]
  );

  React.useEffect(() => {
    startTrackRef.current = startTrack;
  }, [startTrack]);

  const playAt = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= queueRef.current.length) return;
      // Guard against redundant starts of the same already-loaded track.
      if (audioRef.current && index === currentIndexRef.current) return;
      const track = queueRef.current[index];
      syncIndex(index);
      if (audioRef.current) {
        fadeTo(0, fadeDurationRef.current, () => {
          startTrack(track);
        });
      } else {
        startTrack(track);
      }
    },
    [fadeTo, startTrack, syncIndex]
  );

  const playNext = React.useCallback(() => {
    playAt(currentIndexRef.current + 1);
  }, [playAt]);

  const playPrev = React.useCallback(() => {
    playAt(Math.max(0, currentIndexRef.current - 1));
  }, [playAt]);

  const enqueue = React.useCallback(
    (tracks: Track | Track[]) => {
      const incoming = Array.isArray(tracks) ? tracks : [tracks];
      const prev = queueRef.current;

      const existing = new Set(prev.map(t => t.id ?? t.src));
      const added: Track[] = [];
      for (const t of incoming) {
        const key = t.id ?? t.src;
        if (existing.has(key)) continue;
        existing.add(key);
        added.push(t);
      }

      const nextQueue = [...prev, ...added];
      const wasEmpty = prev.length === 0;
      syncQueue(nextQueue);
      if (wasEmpty && nextQueue.length > 0) {
        queueMicrotask(() => playAt(0));
      }
    },
    [playAt, syncQueue]
  );

  const pause = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    fadingRef.current?.cancel?.();
    a.pause();
    setIsPlaying(false);
  }, []);

  const resume = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.play()
      .then(() => {
        setIsPlaying(true);
        fadeTo(volumeRef.current, Math.min(300, fadeDurationRef.current));
      })
      .catch(() => {
        // Ignore resume errors (e.g., autoplay restrictions).
      });
  }, [fadeTo]);

  const setVolumeLevel = React.useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    setVolume(clamped);
    const a = audioRef.current;
    if (a) a.volume = clamped;
  }, []);

  const clearQueue = React.useCallback(() => {
    syncQueue([]);
    syncIndex(-1);
    setIsPlaying(false);
    volumeRef.current = 0.7;
    setVolume(0.7);
    fadeTo(0, Math.min(300, fadeDurationRef.current), cleanupAudio);
  }, [cleanupAudio, fadeTo, syncIndex, syncQueue]);

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
import React, { useEffect, useMemo, useState } from 'react';
import './DebugOverlay.css';
import { api } from '../../helpers/api';

type DebugOverlayPosition = 'topleft' | 'topright' | 'bottomleft' | 'bottomright';

interface DebugOverlayProps {
  position?: DebugOverlayPosition;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ position = 'topleft' }) => {
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const positionClass = useMemo(() => `debug-overlay-${position}`, [position]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);

    globalThis.addEventListener('online', updateOnline);
    globalThis.addEventListener('offline', updateOnline);

    return () => {
      globalThis.removeEventListener('online', updateOnline);
      globalThis.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const measurePing = async () => {
      const start = performance.now();
      const response = await api.get('/ping', { timeout: 3000, retries: 0 });
      const end = performance.now();

      if (!isMounted) return;

      if (response.success) {
        setPingMs(Math.round(end - start));
      } else {
        setPingMs(null);
      }
    };

    void measurePing();
    const intervalId = globalThis.setInterval(() => {
      void measurePing();
    }, 5000);

    return () => {
      isMounted = false;
      globalThis.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let frames = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      frames += 1;

      if (time - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (time - lastTime)));
        frames = 0;
        lastTime = time;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={`debug-overlay ${positionClass}`} role="status" aria-live="polite">
      <div className="debug-overlay-title">Debug Overlay</div>
      <div className="debug-overlay-row">
        <span>Ping</span>
        <span>{pingMs === null ? '—' : `${pingMs}ms`}</span>
      </div>
      <div className="debug-overlay-row">
        <span>FPS</span>
        <span>{fps}</span>
      </div>
      <div className="debug-overlay-row">
        <span>Network</span>
        <span>{isOnline ? 'online' : 'offline'}</span>
      </div>
    </div>
  );
};

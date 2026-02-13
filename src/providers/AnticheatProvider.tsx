import { useEffect, useRef, type ReactNode } from 'react';

type AnticheatProviderProps = {
  children: ReactNode;
};

export function AnticheatProvider({ children }: Readonly<AnticheatProviderProps>) {
  const anticheatAlertMessage =
    "Hello! Monix's anticheat has detected cheating. You are not automatically banned for this. Please reload the page and continue playing fairly.";
  const anticheatTriggeredRef = useRef(false);
  const anticheatTimeoutRef = useRef<number | null>(null);
  const clickHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    const startAnticheatAlertLoop = () => {
      if (anticheatTriggeredRef.current) return;
      anticheatTriggeredRef.current = true;

      const loop = () => {
        globalThis.alert(anticheatAlertMessage);
        anticheatTimeoutRef.current = globalThis.setTimeout(loop, 0);
      };

      loop();
    };

    const handlePointerDown = () => {
      if (anticheatTriggeredRef.current) return;

      const now = Date.now();
      const history = clickHistoryRef.current;

      history.push(now);

      const maxHistory = 40;
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }

      const lastSecond = history.filter(time => now - time <= 1000);
      const lastHalfSecond = history.filter(time => now - time <= 500);

      if (lastSecond.length >= 12 || lastHalfSecond.length >= 8) {
        startAnticheatAlertLoop();
      }
    };

    globalThis.addEventListener('pointerdown', handlePointerDown);

    return () => {
      globalThis.removeEventListener('pointerdown', handlePointerDown);
      if (anticheatTimeoutRef.current !== null) {
        globalThis.clearTimeout(anticheatTimeoutRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}

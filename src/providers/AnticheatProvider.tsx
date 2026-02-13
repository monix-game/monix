import { useEffect, useRef, useState, type ReactNode } from 'react';

type AnticheatProviderProps = {
  children: ReactNode;
};

declare global {
  var _anticheatTriggered: boolean | undefined;
}

export function AnticheatProvider({ children }: Readonly<AnticheatProviderProps>) {
  const anticheatAlertMessage =
    'Monix Anticheat: We have detected suspicious activity. To ensure a fair experience for everyone, this session has been locked. Please reload the page and remove any scripts before continuing.';
  const [isLocked, setIsLocked] = useState(false);
  const anticheatTriggeredRef = useRef(false);
  const clickHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    const startAnticheatAlertLoop = () => {
      if (anticheatTriggeredRef.current) return;
      anticheatTriggeredRef.current = true;
      globalThis._anticheatTriggered = true;
      setIsLocked(true);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (anticheatTriggeredRef.current) return;
      if (!event.isTrusted) {
        startAnticheatAlertLoop();
        return;
      }

      const now = Date.now();
      const history = clickHistoryRef.current;

      history.push(now);

      const maxHistory = 40;
      if (history.length > maxHistory) {
        history.splice(0, history.length - maxHistory);
      }

      const lastSecond = history.filter(time => now - time <= 1000);
      const lastHalfSecond = history.filter(time => now - time <= 500);

      if (lastSecond.length >= 30 || lastHalfSecond.length >= 20) {
        startAnticheatAlertLoop();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (anticheatTriggeredRef.current) return;
      if (!event.isTrusted) {
        startAnticheatAlertLoop();
      }
    };

    globalThis.addEventListener('pointerdown', handlePointerDown);
    globalThis.addEventListener('click', handleClick, true);

    return () => {
      globalThis.removeEventListener('pointerdown', handlePointerDown);
      globalThis.removeEventListener('click', handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (!isLocked) return;

    const prevent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    globalThis.addEventListener('keydown', prevent, { capture: true });
    globalThis.addEventListener('keypress', prevent, { capture: true });
    globalThis.addEventListener('keyup', prevent, { capture: true });
    globalThis.addEventListener('wheel', prevent, { capture: true, passive: false });

    return () => {
      globalThis.removeEventListener('keydown', prevent, { capture: true });
      globalThis.removeEventListener('keypress', prevent, { capture: true });
      globalThis.removeEventListener('keyup', prevent, { capture: true });
      globalThis.removeEventListener('wheel', prevent, { capture: true });
    };
  }, [isLocked]);

  return (
    <>
      {children}
      {isLocked ? (
        <div
          aria-live="assertive"
          role="alert"
          style={{
            alignItems: 'center',
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(10, 10, 15, 0.88)',
            color: '#f5f7ff',
            display: 'flex',
            fontFamily: 'inherit',
            fontSize: '16px',
            justifyContent: 'center',
            left: 0,
            padding: '24px',
            position: 'fixed',
            textAlign: 'center',
            top: 0,
            width: '100%',
            height: '100%',
            zIndex: 9999,
          }}
        >
          {anticheatAlertMessage}
        </div>
      ) : null}
    </>
  );
}

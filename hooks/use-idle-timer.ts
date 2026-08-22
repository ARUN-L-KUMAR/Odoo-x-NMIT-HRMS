import { useEffect, useRef, useState } from "react";

/**
 * useIdleTimer Hook — adapted from Faceviz for NextAuth.
 *
 * Detects user inactivity and calls `onIdle` after the given timeout.
 * Wire this to `signOut()` from next-auth/react in AppShell to auto-logout
 * idle sessions.
 *
 * @param timeout - Timeout in milliseconds (default: 20 minutes)
 * @param onIdle  - Callback to invoke when user becomes idle
 */
const useIdleTimer = (
  timeout: number = 20 * 60 * 1000,
  onIdle: () => void
) => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest onIdle in a ref so the effect below doesn't need it as a
  // dependency — an inline callback (a new function every render) would
  // otherwise tear down and re-attach all activity listeners on every
  // render, and briefly drop activity while the listeners are detached.
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsIdle(true);
        onIdleRef.current();
      }, timeout);
    };

    const handleActivity = () => {
      setIsIdle(false);
      resetTimer();
    };

    // Track all meaningful user interactions.
    // "keydown" (not "keypress") catches Tab/Backspace/Delete/arrow-key/
    // Ctrl-shortcut activity — keypress only fires for character-producing keys.
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
      "touchmove",
      "scroll",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer immediately
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout]);

  return isIdle;
};

export default useIdleTimer;

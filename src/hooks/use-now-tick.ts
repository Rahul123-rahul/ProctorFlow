import { useEffect, useState } from 'react';

/**
 * Forces a re-render on an interval (default 30s) so time-derived UI — like the
 * "ongoing"/LIVE window — updates as login/logout times are crossed, not just on
 * load. The interval is cleared on unmount.
 */
export function useNowTick(intervalMs = 30000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
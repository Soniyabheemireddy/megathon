import { useEffect, useRef, useState } from 'react';

/** Poll an async loader for near real-time dashboard data. */
export function useLiveData(loader, intervalMs = 5000, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let timer;
    async function run() {
      try {
        const result = await loader();
        if (alive.current) {
          setData(result);
          setError('');
          setTick((t) => t + 1);
        }
      } catch (err) {
        if (alive.current) setError(err.message || 'Failed to load');
      }
      if (alive.current) timer = setTimeout(run, intervalMs);
    }
    run();
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, tick, reload: () => loader().then(setData) };
}

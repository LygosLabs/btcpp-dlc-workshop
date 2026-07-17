'use client';

import { useEffect, useState } from 'react';

/** useState persisted to localStorage so a refresh doesn't lose workshop progress. */
export function usePersisted(key: string, initial = ''): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setValue(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: string) => {
    setValue(v);
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  };
  return [value, set];
}

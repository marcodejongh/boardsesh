'use client';

import { useState, useEffect } from 'react';
import { BoardName } from '@/app/lib/types';

interface UseBetaCountOptions {
  climbUuid: string | undefined;
  boardName: BoardName;
  enabled?: boolean;
}

export function useBetaCount({ climbUuid, boardName, enabled = true }: UseBetaCountOptions): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!climbUuid || !boardName || !enabled) {
      setCount(null);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      try {
        const response = await fetch(`/api/v1/${boardName}/beta/${climbUuid}`);
        if (!response.ok) {
          setCount(null);
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        if (!cancelled) {
          setCount(null);
        }
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [climbUuid, boardName, enabled]);

  return count;
}

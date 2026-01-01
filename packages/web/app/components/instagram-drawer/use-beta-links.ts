'use client';

import { useState, useEffect, useCallback } from 'react';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { BoardName } from '@/app/lib/types';

interface UseBetaLinksOptions {
  climbUuid: string | undefined;
  boardName: BoardName;
  enabled?: boolean;
}

interface UseBetaLinksResult {
  betaLinks: BetaLink[];
  count: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBetaLinks({ climbUuid, boardName, enabled = true }: UseBetaLinksOptions): UseBetaLinksResult {
  const [betaLinks, setBetaLinks] = useState<BetaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBetaLinks = useCallback(async () => {
    if (!climbUuid || !boardName || !enabled) {
      setBetaLinks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/${boardName}/beta/${climbUuid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch beta videos');
      }
      const data = await response.json();
      setBetaLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setBetaLinks([]);
    } finally {
      setLoading(false);
    }
  }, [climbUuid, boardName, enabled]);

  useEffect(() => {
    fetchBetaLinks();
  }, [fetchBetaLinks]);

  return {
    betaLinks,
    count: betaLinks.length > 0 ? betaLinks.length : null,
    loading,
    error,
    refetch: fetchBetaLinks,
  };
}

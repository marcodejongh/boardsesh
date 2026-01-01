'use client';

import { BoardName } from '@/app/lib/types';
import { useBetaLinks } from './use-beta-links';

interface UseBetaCountOptions {
  climbUuid: string | undefined;
  boardName: BoardName;
  enabled?: boolean;
}

export function useBetaCount({ climbUuid, boardName, enabled = true }: UseBetaCountOptions): number | null {
  const { count } = useBetaLinks({ climbUuid, boardName, enabled });
  return count;
}

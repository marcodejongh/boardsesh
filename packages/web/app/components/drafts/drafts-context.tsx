'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  DraftClimb,
  CreateDraftOptions,
  getAllDraftClimbs,
  createDraftClimb,
  updateDraftClimb,
  deleteDraftClimb,
  getDraftClimbsCount,
} from '@/app/lib/draft-climbs-db';
import { LitUpHoldsMap } from '../board-renderer/types';

interface DraftsContextType {
  drafts: DraftClimb[];
  draftsCount: number;
  isLoading: boolean;
  createDraft: (options: CreateDraftOptions) => Promise<DraftClimb>;
  updateDraft: (
    uuid: string,
    updates: {
      name?: string;
      description?: string;
      frames?: string;
      litUpHoldsMap?: LitUpHoldsMap;
      isDraft?: boolean;
      angle?: number;
    },
  ) => Promise<void>;
  deleteDraft: (uuid: string) => Promise<void>;
  reorderDrafts: (reorderedDrafts: DraftClimb[]) => void;
  refreshDrafts: () => Promise<void>;
}

const DraftsContext = createContext<DraftsContextType | undefined>(undefined);

export const DraftsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drafts, setDrafts] = useState<DraftClimb[]>([]);
  const [draftsCount, setDraftsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    try {
      const [loadedDrafts, count] = await Promise.all([getAllDraftClimbs(), getDraftClimbsCount()]);
      setDrafts(loadedDrafts);
      setDraftsCount(count);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const createDraft = useCallback(async (options: CreateDraftOptions): Promise<DraftClimb> => {
    const newDraft = await createDraftClimb(options);
    setDrafts((prev) => [newDraft, ...prev]);
    setDraftsCount((prev) => prev + 1);
    return newDraft;
  }, []);

  const updateDraft = useCallback(
    async (
      uuid: string,
      updates: {
        name?: string;
        description?: string;
        frames?: string;
        litUpHoldsMap?: LitUpHoldsMap;
        isDraft?: boolean;
        angle?: number;
      },
    ): Promise<void> => {
      await updateDraftClimb(uuid, updates);
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.uuid === uuid ? { ...draft, ...updates, updatedAt: Date.now() } : draft,
        ),
      );
    },
    [],
  );

  const deleteDraftHandler = useCallback(async (uuid: string): Promise<void> => {
    await deleteDraftClimb(uuid);
    setDrafts((prev) => prev.filter((draft) => draft.uuid !== uuid));
    setDraftsCount((prev) => prev - 1);
  }, []);

  const reorderDrafts = useCallback((reorderedDrafts: DraftClimb[]) => {
    // Update local state with new order
    // We merge the reordered subset back into the full drafts array
    setDrafts((prev) => {
      const reorderedIds = new Set(reorderedDrafts.map((d) => d.uuid));
      const otherDrafts = prev.filter((d) => !reorderedIds.has(d.uuid));
      return [...reorderedDrafts, ...otherDrafts];
    });
  }, []);

  const value = useMemo<DraftsContextType>(
    () => ({
      drafts,
      draftsCount,
      isLoading,
      createDraft,
      updateDraft,
      deleteDraft: deleteDraftHandler,
      reorderDrafts,
      refreshDrafts: loadDrafts,
    }),
    [drafts, draftsCount, isLoading, createDraft, updateDraft, deleteDraftHandler, reorderDrafts, loadDrafts],
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
};

export const useDrafts = (): DraftsContextType => {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within a DraftsProvider');
  }
  return context;
};

export type { DraftsContextType, DraftClimb };

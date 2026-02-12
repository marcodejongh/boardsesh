'use client';

import React from 'react';
import CollapsibleSection from '@/app/components/collapsible-section/collapsible-section';
import { useBuildClimbDetailSections } from '@/app/components/climb-detail/build-climb-detail-sections';
import type { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import type { Climb } from '@/app/lib/types';

interface ClimbViewSidebarProps {
  climb: Climb;
  betaLinks: BetaLink[];
  climbUuid: string;
  boardType: string;
  angle: number;
  currentClimbDifficulty?: string;
  boardName?: string;
}

export default function ClimbViewSidebar({
  climb,
  betaLinks,
  climbUuid,
  boardType,
  angle,
  currentClimbDifficulty,
  boardName,
}: ClimbViewSidebarProps) {
  const sections = useBuildClimbDetailSections({
    climb,
    betaLinks,
    climbUuid,
    boardType,
    angle,
    currentClimbDifficulty,
    boardName,
  });

  return <CollapsibleSection sections={sections} />;
}

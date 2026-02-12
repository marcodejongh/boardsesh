'use client';

import React from 'react';
import ClimbCard from '@/app/components/climb-card/climb-card';
import ClimbDetailShellClient from './climb-detail-shell.client';
import { useBuildClimbDetailSections } from './build-climb-detail-sections';
import type { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import type { BoardDetails, Climb } from '@/app/lib/types';

interface ClimbDetailInfoShellClientProps {
  climb: Climb;
  boardDetails: BoardDetails;
  betaLinks: BetaLink[];
  climbUuid: string;
  boardType: string;
  angle: number;
  currentClimbDifficulty?: string;
  boardName?: string;
}

export default function ClimbDetailInfoShellClient({
  climb,
  boardDetails,
  betaLinks,
  climbUuid,
  boardType,
  angle,
  currentClimbDifficulty,
  boardName,
}: ClimbDetailInfoShellClientProps) {
  const sections = useBuildClimbDetailSections({
    climb,
    betaLinks,
    climbUuid,
    boardType,
    angle,
    currentClimbDifficulty,
    boardName,
  });

  return (
    <ClimbDetailShellClient
      mode="info"
      aboveFold={<ClimbCard climb={climb} boardDetails={boardDetails} actions={[]} />}
      sections={sections}
    />
  );
}

'use client';

import React from 'react';
import CollapsibleSection from '@/app/components/collapsible-section/collapsible-section';
import type { CollapsibleSectionConfig } from '@/app/components/collapsible-section/collapsible-section';
import BetaVideos from '@/app/components/beta-videos/beta-videos';
import { LogbookSection, useLogbookSummary } from '@/app/components/logbook/logbook-section';
import ClimbSocialSection from '@/app/components/social/climb-social-section';
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
  const logbookSummary = useLogbookSummary(climb.uuid);

  const getLogbookSummaryParts = (): string[] => {
    if (!logbookSummary) return [];
    const parts: string[] = [];
    parts.push(`${logbookSummary.totalAttempts} attempt${logbookSummary.totalAttempts !== 1 ? 's' : ''}`);
    if (logbookSummary.successfulAscents > 0) {
      parts.push(`${logbookSummary.successfulAscents} send${logbookSummary.successfulAscents !== 1 ? 's' : ''}`);
    }
    return parts;
  };

  const sections: CollapsibleSectionConfig[] = [
    {
      key: 'beta',
      label: 'Beta Videos',
      title: 'Beta Videos',
      defaultSummary: 'No videos',
      getSummary: () =>
        betaLinks.length > 0
          ? [`${betaLinks.length} video${betaLinks.length !== 1 ? 's' : ''}`]
          : [],
      lazy: true,
      content: <BetaVideos betaLinks={betaLinks} />,
    },
    {
      key: 'logbook',
      label: 'Your Logbook',
      title: 'Your Logbook',
      defaultSummary: 'No ascents',
      getSummary: getLogbookSummaryParts,
      content: <LogbookSection climb={climb} />,
    },
  ];

  // Pick a sensible default: logbook if the user has entries, otherwise beta if there are videos
  const defaultKey = logbookSummary ? 'logbook' : betaLinks.length > 0 ? 'beta' : 'logbook';

  return (
    <>
      <CollapsibleSection sections={sections} defaultActiveKey={defaultKey} />
      <ClimbSocialSection
        climbUuid={climbUuid}
        boardType={boardType}
        angle={angle}
        currentClimbDifficulty={currentClimbDifficulty}
        boardName={boardName}
      />
    </>
  );
}

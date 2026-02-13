'use client';

import React, { useEffect, useState } from 'react';
import type { CollapsibleSectionConfig } from '@/app/components/collapsible-section/collapsible-section';
import BetaVideos from '@/app/components/beta-videos/beta-videos';
import { LogbookSection, useLogbookSummary } from '@/app/components/logbook/logbook-section';
import ClimbSocialSection from '@/app/components/social/climb-social-section';
import type { BetaLink } from '@boardsesh/shared-schema';
import type { Climb } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { GET_BETA_LINKS, type GetBetaLinksQueryResponse, type GetBetaLinksQueryVariables } from '@/app/lib/graphql/operations';

interface BuildClimbDetailSectionsProps {
  climb: Climb;
  climbUuid: string;
  boardType: string;
  angle: number;
  betaLinks?: BetaLink[];
  currentClimbDifficulty?: string;
  boardName?: string;
}

function useClimbBetaLinks({ boardType, climbUuid, initialBetaLinks }: { boardType: string; climbUuid: string; initialBetaLinks?: BetaLink[] }) {
  const [betaLinks, setBetaLinks] = useState<BetaLink[]>(initialBetaLinks ?? []);

  useEffect(() => {
    if (initialBetaLinks) {
      setBetaLinks(initialBetaLinks);
      return;
    }

    if (!climbUuid || !boardType) {
      setBetaLinks([]);
      return;
    }

    let cancelled = false;

    const fetchBetaLinks = async () => {
      try {
        const data = await executeGraphQL<GetBetaLinksQueryResponse, GetBetaLinksQueryVariables>(
          GET_BETA_LINKS,
          { boardName: boardType, climbUuid },
        );
        if (!cancelled) {
          setBetaLinks(data.betaLinks);
        }
      } catch {
        if (!cancelled) {
          setBetaLinks([]);
        }
      }
    };

    void fetchBetaLinks();

    return () => {
      cancelled = true;
    };
  }, [boardType, climbUuid, initialBetaLinks]);

  return betaLinks;
}

export function useBuildClimbDetailSections({
  climb,
  climbUuid,
  boardType,
  angle,
  betaLinks: initialBetaLinks,
  currentClimbDifficulty,
  boardName,
}: BuildClimbDetailSectionsProps): CollapsibleSectionConfig[] {
  const betaLinks = useClimbBetaLinks({ boardType, climbUuid, initialBetaLinks });
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

  return [
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
    {
      key: 'community',
      label: 'Community',
      title: 'Community',
      defaultSummary: 'Votes, comments, proposals',
      getSummary: () => ['Votes', 'Comments', 'Proposals'],
      lazy: true,
      content: (
        <ClimbSocialSection
          climbUuid={climbUuid}
          boardType={boardType}
          angle={angle}
          currentClimbDifficulty={currentClimbDifficulty}
          boardName={boardName}
        />
      ),
    },
  ];
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useQueueContext } from '../graphql-queue';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { parseBoardRouteParams, constructPlayUrlWithSlugs, getContextAwareClimbViewUrl } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import FastForwardOutlined from '@mui/icons-material/FastForwardOutlined';
import { track } from '@vercel/analytics';
import IconButton from '@mui/material/IconButton';
import type { IconButtonProps } from '@mui/material/IconButton';

type NextClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const NextButton = (props: IconButtonProps) => (
  <IconButton {...props} aria-label="Next climb"><FastForwardOutlined /></IconButton>
);

export default function NextClimbButton({ navigate = false, boardDetails }: NextClimbButtonProps) {
  const { setCurrentClimbQueueItem, getNextClimbQueueItem, viewOnlyMode } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPlayPage = pathname.includes('/play/');

  const nextClimb = getNextClimbQueueItem();

  const handleClick = () => {
    if (!nextClimb) {
      return;
    }
    setCurrentClimbQueueItem(nextClimb);
    track('Queue Navigation', {
      direction: 'next',
      boardLayout: boardDetails?.layout_name || '',
    });
  };

  if (!viewOnlyMode && navigate && nextClimb) {
    let climbUrl = '';

    if (isPlayPage) {
      climbUrl =
        boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
          ? constructPlayUrlWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.size_description,
              boardDetails.set_names,
              angle,
              nextClimb.climb.uuid,
              nextClimb.climb.name,
            )
          : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/play/${nextClimb.climb.uuid}`;
    } else if (boardDetails) {
      climbUrl = getContextAwareClimbViewUrl(
        pathname,
        boardDetails,
        angle,
        nextClimb.climb.uuid,
        nextClimb.climb.name,
      );
    } else {
      climbUrl = `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${nextClimb.climb.uuid}`;
    }

    // Preserve search params in play mode to maintain filter state for back navigation
    if (isPlayPage) {
      const queryString = searchParams.toString();
      if (queryString) {
        climbUrl = `${climbUrl}?${queryString}`;
      }
    }

    return (
      <Link
        href={climbUrl}
        onClick={handleClick}
      >
        <NextButton />
      </Link>
    );
  }
  return <NextButton onClick={handleClick} disabled={!nextClimb || viewOnlyMode} />;
}

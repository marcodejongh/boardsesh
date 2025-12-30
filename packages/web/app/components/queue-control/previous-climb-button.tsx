import React from 'react';

import Link from 'next/link';
import { useQueueContext } from '../graphql-queue';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs, constructPlayUrlWithSlugs } from '@/app/lib/url-utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import { track } from '@vercel/analytics';
import { FastBackwardOutlined } from '@ant-design/icons';
import Button, { ButtonProps } from 'antd/es/button';

type PreviousClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const PreviousButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastBackwardOutlined />} aria-label="Previous climb" />
);

export default function PreviousClimbButton({ navigate = false, boardDetails }: PreviousClimbButtonProps) {
  const { getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPlayPage = pathname.includes('/play/');

  const previousClimb = getPreviousClimbQueueItem();

  const handleClick = () => {
    if (previousClimb) {
      setCurrentClimbQueueItem(previousClimb);
      track('Queue Navigation', {
        direction: 'previous',
        boardLayout: boardDetails?.layout_name || '',
      });
    }
  };

  if (!viewOnlyMode && navigate && previousClimb) {
    const urlConstructor = isPlayPage ? constructPlayUrlWithSlugs : constructClimbViewUrlWithSlugs;
    const fallbackPath = isPlayPage ? 'play' : 'view';

    let climbUrl =
      boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? urlConstructor(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            angle,
            previousClimb.climb.uuid,
            previousClimb.climb.name,
          )
        : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/${fallbackPath}/${previousClimb.climb.uuid}`;

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
        <PreviousButton />
      </Link>
    );
  }
  return <PreviousButton onClick={handleClick} disabled={!previousClimb || viewOnlyMode} />;
}

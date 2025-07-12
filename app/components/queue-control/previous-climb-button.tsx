import React from 'react';

import Link from 'next/link';
import { useQueueContext } from './queue-context';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import { track } from '@vercel/analytics';
import { FastBackwardOutlined } from '@ant-design/icons';
import Button, { ButtonProps } from 'antd/es/button';

type PreviousClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const PreviousButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastBackwardOutlined />} aria-label="Next climb" />
);

export default function PreviousClimbButton({ navigate = false, boardDetails }: PreviousClimbButtonProps) {
  const { getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode } = useQueueContext();
  const { angle } = parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());

  const previousClimb = getPreviousClimbQueueItem();

  const handleClick = () => {
    if (previousClimb) {
      // Remove the next climb from the queue by updating the state
      setCurrentClimbQueueItem(previousClimb);
      track('Queue Navigation', {
        direction: 'previous',
        boardLayout: boardDetails?.layout_name || '',
      });
    }
  };

  if (!viewOnlyMode && navigate && previousClimb) {
    const climbViewUrl =
      boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? constructClimbViewUrlWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.set_names,
            angle,
            previousClimb.climb.uuid,
            previousClimb.climb.name,
          )
        : (() => { throw new Error('Board details are missing required slug information'); })();

    return (
      <Link
        href={climbViewUrl}
        onClick={handleClick} // Update the queue when the link is clicked
      >
        <PreviousButton />
      </Link>
    );
  }
  return <PreviousButton onClick={handleClick} disabled={!previousClimb || viewOnlyMode} />;
}

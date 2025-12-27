import React from 'react';

import Link from 'next/link';
import { useQueueContext } from '../graphql-queue';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import { track } from '@vercel/analytics';
import { FastBackwardOutlined } from '@ant-design/icons';
import Button, { ButtonProps } from 'antd/es/button';
import { Tooltip } from 'antd';

type PreviousClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const PreviousButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastBackwardOutlined />} aria-label="Next climb" />
);

export default function PreviousClimbButton({ navigate = false, boardDetails }: PreviousClimbButtonProps) {
  const { getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode, isConnectionReady, sessionId } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());

  const previousClimb = getPreviousClimbQueueItem();

  // Disable when in a session but connection is not ready
  const actionsDisabled = !!(sessionId && !isConnectionReady);

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

  if (!viewOnlyMode && !actionsDisabled && navigate && previousClimb) {
    const climbViewUrl =
      boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? constructClimbViewUrlWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            angle,
            previousClimb.climb.uuid,
            previousClimb.climb.name,
          )
        : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${previousClimb.climb.uuid}`;

    return (
      <Link
        href={climbViewUrl}
        onClick={handleClick} // Update the queue when the link is clicked
      >
        <PreviousButton />
      </Link>
    );
  }

  const isDisabled = !previousClimb || viewOnlyMode || actionsDisabled;

  return (
    <Tooltip title={actionsDisabled ? 'Waiting for connection...' : undefined}>
      <PreviousButton onClick={handleClick} disabled={isDisabled} />
    </Tooltip>
  );
}

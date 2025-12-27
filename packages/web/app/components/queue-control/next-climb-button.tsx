import React from 'react';
import Link from 'next/link';
import { useQueueContext } from '../graphql-queue';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import { FastForwardOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import Button, { ButtonProps } from 'antd/es/button';
import { Tooltip } from 'antd';

type NextClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const NextButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastForwardOutlined />} aria-label="Next climb" />
);

export default function NextClimbButton({ navigate = false, boardDetails }: NextClimbButtonProps) {
  const { setCurrentClimbQueueItem, getNextClimbQueueItem, viewOnlyMode, isConnectionReady, sessionId } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());

  const nextClimb = getNextClimbQueueItem();

  // Disable when in a session but connection is not ready
  const actionsDisabled = sessionId && !isConnectionReady;

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

  if (!viewOnlyMode && !actionsDisabled && navigate && nextClimb) {
    const climbViewUrl =
      boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? constructClimbViewUrlWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            angle,
            nextClimb.climb.uuid,
            nextClimb.climb.name,
          )
        : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${nextClimb.climb.uuid}`;

    return (
      <Link
        href={climbViewUrl}
        onClick={handleClick} // Update the queue when the link is clicked
      >
        <NextButton />
      </Link>
    );
  }

  const isDisabled = !nextClimb || viewOnlyMode || !!actionsDisabled;

  return (
    <Tooltip title={actionsDisabled ? 'Waiting for connection...' : undefined}>
      <NextButton onClick={handleClick} disabled={isDisabled} />
    </Tooltip>
  );
}

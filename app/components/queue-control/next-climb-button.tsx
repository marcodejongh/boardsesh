import React from 'react';
import Link from 'next/link';
import { useQueueContext } from './queue-context';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid, BoardDetails } from '@/app/lib/types';
import { FastForwardOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import Button, { ButtonProps } from 'antd/es/button';

type NextClimbButtonProps = {
  navigate: boolean;
  boardDetails?: BoardDetails;
};

const NextButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastForwardOutlined />} aria-label="Next climb" />
);

export default function NextClimbButton({ navigate = false, boardDetails }: NextClimbButtonProps) {
  const { setCurrentClimbQueueItem, getNextClimbQueueItem, viewOnlyMode } = useQueueContext(); // Assuming setSuggestedQueue is available
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());

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
    const climbViewUrl = boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
      ? constructClimbViewUrlWithSlugs(
          boardDetails.board_name,
          boardDetails.layout_name,
          boardDetails.size_name,
          boardDetails.set_names,
          angle,
          nextClimb.climb.uuid,
          nextClimb.climb.name
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
  return <NextButton onClick={handleClick} disabled={!nextClimb || viewOnlyMode} />;
}

import React from 'react';

import Link from 'next/link';
import { useQueueContext } from './queue-context';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { BoardRouteParametersWithUuid } from '@/app/lib/types';
import { FastBackwardOutlined } from '@ant-design/icons';
import Button, { ButtonProps } from 'antd/es/button';

type PreviousClimbButtonProps = {
  navigate: boolean;
};

const PreviousButton = (props: ButtonProps) => (
  <Button {...props} type="default" icon={<FastBackwardOutlined />} aria-label="Next climb" />
);

export default function PreviousClimbButton({ navigate = false }: PreviousClimbButtonProps) {
  const { getPreviousClimbQueueItem, setCurrentClimbQueueItem, viewOnlyMode } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());

  const previousClimb = getPreviousClimbQueueItem();

  const handleClick = () => {
    if (previousClimb) {
      // Remove the next climb from the queue by updating the state
      setCurrentClimbQueueItem(previousClimb);
    }
  };

  if (!viewOnlyMode && navigate && previousClimb) {
    return (
      <Link
        href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${previousClimb?.climb.uuid}`}
        onClick={handleClick} // Update the queue when the link is clicked
      >
        <PreviousButton />
      </Link>
    );
  }
  return <PreviousButton onClick={handleClick} disabled={!previousClimb || viewOnlyMode} />;
}

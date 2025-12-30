import React from 'react';
import Link from 'next/link';
import { useQueueContext } from '../graphql-queue';
import { useParams } from 'next/navigation';
import { parseBoardRouteParams, constructClimbViewUrlWithSlugs, constructPlayUrlWithSlugs } from '@/app/lib/url-utils';
import { usePathname } from 'next/navigation';
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
  const { setCurrentClimbQueueItem, getNextClimbQueueItem, viewOnlyMode } = useQueueContext();
  const { board_name, layout_id, size_id, set_ids, angle } =
    parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());
  const pathname = usePathname();
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
    const urlConstructor = isPlayPage ? constructPlayUrlWithSlugs : constructClimbViewUrlWithSlugs;
    const fallbackPath = isPlayPage ? 'play' : 'view';

    const climbUrl =
      boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
        ? urlConstructor(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            angle,
            nextClimb.climb.uuid,
            nextClimb.climb.name,
          )
        : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/${fallbackPath}/${nextClimb.climb.uuid}`;

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

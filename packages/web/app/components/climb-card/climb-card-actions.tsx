'use client';
import React, { useState } from 'react';
import { useQueueContext } from '../graphql-queue';
import { BoardDetails, Climb } from '@/app/lib/types';
import { PlusCircleOutlined, InfoCircleOutlined, CheckCircleOutlined, ForkOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, constructCreateClimbUrl } from '@/app/lib/url-utils';
import { track } from '@vercel/analytics';
import { FavoriteButton } from '../climb-actions';

type ClimbCardActionsProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
};

const ClimbCardActions = ({ climb, boardDetails }: ClimbCardActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);

  if (!climb) {
    return [];
  }

  const handleAddToQueue = () => {
    if (addToQueue && !recentlyAdded) {
      addToQueue(climb);

      track('Add to Queue', {
        boardLayout: boardDetails.layout_name || '',
        queueLength: queue.length + 1,
      });

      setRecentlyAdded(true);

      setTimeout(() => {
        setRecentlyAdded(false);
      }, 5000);
    }
  };

  const actions: (React.JSX.Element | null)[] = [
    <Link
      key="infocircle"
      href={
        boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
          ? constructClimbViewUrlWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.size_description,
              boardDetails.set_names,
              climb.angle,
              climb.uuid,
              climb.name,
            )
          : constructClimbViewUrl(
              {
                board_name: boardDetails.board_name,
                layout_id: boardDetails.layout_id,
                size_id: boardDetails.size_id,
                set_ids: boardDetails.set_ids,
                angle: climb.angle,
              },
              climb.uuid,
              climb.name,
            )
      }
      onClick={() => {
        track('Climb Info Viewed', {
          boardLayout: boardDetails.layout_name || '',
        });
      }}
    >
      <InfoCircleOutlined />
    </Link>,
    boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names ? (
      <Link
        key="fork"
        href={constructCreateClimbUrl(
          boardDetails.board_name,
          boardDetails.layout_name,
          boardDetails.size_name,
          boardDetails.size_description,
          boardDetails.set_names,
          climb.angle,
          { frames: climb.frames, name: climb.name },
        )}
        onClick={() => {
          track('Climb Forked', {
            boardLayout: boardDetails.layout_name || '',
            originalClimb: climb.uuid,
          });
        }}
        title="Fork this climb"
      >
        <ForkOutlined />
      </Link>
    ) : null,
    <FavoriteButton
      key="heart"
      boardName={boardDetails.board_name}
      climbUuid={climb.uuid}
      climbName={climb.name}
      angle={climb.angle}
      size="small"
    />,
    recentlyAdded ? (
      <CheckCircleOutlined
        key="edit"
        onClick={handleAddToQueue}
        style={{ color: '#52c41a', cursor: 'not-allowed' }}
      />
    ) : (
      <PlusCircleOutlined
        key="edit"
        onClick={handleAddToQueue}
        style={{ color: 'inherit', cursor: 'pointer' }}
      />
    ),
  ];

  return actions.filter((action): action is React.JSX.Element => action !== null);
};

export default ClimbCardActions;

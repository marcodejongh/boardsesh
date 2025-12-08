'use client';
import React, { useState } from 'react';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, Climb } from '@/app/lib/types';
import { PlusCircleOutlined, HeartOutlined, InfoCircleOutlined, CheckCircleOutlined, ForkOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, constructCreateClimbUrl } from '@/app/lib/url-utils';
import { track } from '@vercel/analytics';
import { message } from 'antd';

// import TickClimbButton from '@/c/tick-climb/tick-climb-button';

type ClimbCardActionsProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
};
const ClimbCardActions = ({ climb, boardDetails }: ClimbCardActionsProps) => {
  const { addToQueue, queue } = useQueueContext();
  const [isDuplicate, setDuplicateTimer] = useState(false);

  if (!climb) {
    return [];
  }

  const isAlreadyInQueue = queue.some((item) => item.climb?.uuid === climb.uuid);

  const handleAddToQueue = () => {
    if (addToQueue && !isDuplicate) {
      addToQueue(climb);

      const climbName = climb.name || '';
      message.info(`Successfully added ${climbName} to the queue`);

      track('Add to Queue', {
        boardLayout: boardDetails.layout_name || '',
        queueLength: queue.length + 1,
      });

      setDuplicateTimer(true);

      setTimeout(() => {
        setDuplicateTimer(false);
      }, 3000);
    }
  };

  const actions: (React.JSX.Element | null)[] = [
    // <SettingOutlined key="setting" />,
    // <TickClimbButton key="tickclimbbutton" />,
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
    <HeartOutlined key="heart" onClick={() => message.info('TODO: Implement')} />,
    isAlreadyInQueue ? (
      <CheckCircleOutlined
        key="edit"
        onClick={handleAddToQueue}
        style={{ color: '#52c41a', cursor: isDuplicate ? 'not-allowed' : 'pointer' }}
      />
    ) : (
      <PlusCircleOutlined
        key="edit"
        onClick={handleAddToQueue}
        style={{ color: 'inherit', cursor: isDuplicate ? 'not-allowed' : 'pointer' }}
      />
    ),
  ];

  return actions.filter((action): action is React.JSX.Element => action !== null);
};

export default ClimbCardActions;

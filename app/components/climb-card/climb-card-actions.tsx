'use client';
import React, { useState } from 'react';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, Climb } from '@/app/lib/types';
import { PlusCircleOutlined, HeartOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import {
  constructClimbViewUrlWithSlugs,
} from '@/app/lib/url-utils';
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

  const isAlreadyInQueue = queue.some((item) => item.climb.uuid === climb.uuid);

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

  return [
    // <SettingOutlined key="setting" />,
    // <TickClimbButton key="tickclimbbutton" />,
    <Link
      key="infocircle"
      href={
         constructClimbViewUrlWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name || '',
              boardDetails.size_name || '',
              boardDetails.set_names || [],
              climb.angle,
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
};

export default ClimbCardActions;

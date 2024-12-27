'use client';
import React, { useState } from 'react';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, Climb } from '@/app/lib/types';
import { PlusCircleOutlined, HeartOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
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

      setDuplicateTimer(true);

      setTimeout(() => {
        setDuplicateTimer(false);
      }, 3000);
    }
  };

  return [
    // <SettingOutlined key="setting" />,
    // <TickClimbButton key="tickclimbbutton" />,
    // TODO: Keeping htis Link component here since we do have a info screen inside this app too
    // it's just not as useful currently as the offical one
    <Link key="infocircle" target="_blank" href={constructClimbInfoUrl(boardDetails, climb.uuid, climb.angle)}>
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

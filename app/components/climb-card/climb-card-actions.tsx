'use client';
import React from 'react';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, Climb } from '@/app/lib/types';
import { PlusCircleOutlined, HeartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { message } from 'antd';
import TickClimbButton from '@/c/tick-climb/tick-climb-button';

type ClimbCardActionsProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
};
const ClimbCardActions = ({ climb, boardDetails }: ClimbCardActionsProps) => {
  const { addToQueue } = useQueueContext();
  if (!climb) {
    return [];
  }
  return [
    // <SettingOutlined key="setting" />,
    <TickClimbButton />,
    <Link href={constructClimbInfoUrl(boardDetails, climb.uuid, climb.angle)}>
      <InfoCircleOutlined onClick={() => message.info('TODO: Implement')} />
    </Link>,
    <HeartOutlined onClick={() => message.info('TODO: Implement')} />,
    <PlusCircleOutlined key="edit" onClick={addToQueue ? () => addToQueue(climb) : undefined} />,
  ];
};

export default ClimbCardActions;

'use client';
import React from 'react';
import { useQueueContext } from '../queue-control/queue-context';
import { Climb } from '@/app/lib/types';
import { PlusCircleOutlined, FireOutlined } from '@ant-design/icons';

type ClimbCardActionsProps = {
  climb?: Climb;
};
const ClimbCardActions = ({ climb }: ClimbCardActionsProps) => {
  const { addToQueue, setCurrentClimb } = useQueueContext();
  if (!climb) {
    return [];
  }
  return [
    // <SettingOutlined key="setting" />,
    <PlusCircleOutlined key="edit" onClick={addToQueue ? () => addToQueue(climb) : undefined} />,
    <FireOutlined key="set-active" onClick={setCurrentClimb ? () => setCurrentClimb(climb) : undefined} />,
  ];
};

export default ClimbCardActions;

'use client';

import React, { useState, useCallback } from 'react';
import { PlusCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { track } from '@vercel/analytics';
import { useQueueContext } from '../graphql-queue';
import { Climb, BoardDetails } from '@/app/lib/types';

type QueueButtonProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  showLabel?: boolean;
  size?: 'small' | 'default';
  className?: string;
};

export default function QueueButton({
  climb,
  boardDetails,
  showLabel = false,
  size = 'default',
  className,
}: QueueButtonProps) {
  const { addToQueue, queue } = useQueueContext();
  const [recentlyAdded, setRecentlyAdded] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

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
  }, [addToQueue, recentlyAdded, climb, boardDetails.layout_name, queue.length]);

  const iconStyle: React.CSSProperties = {
    fontSize: size === 'small' ? 14 : 16,
    color: recentlyAdded ? '#52c41a' : 'inherit',
    cursor: recentlyAdded ? 'not-allowed' : 'pointer',
  };

  const Icon = recentlyAdded ? CheckCircleOutlined : PlusCircleOutlined;
  const label = recentlyAdded ? 'Added' : 'Queue';

  return (
    <Tooltip title={recentlyAdded ? 'Added to queue' : 'Add to queue'}>
      <span
        onClick={handleClick}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: recentlyAdded ? 'not-allowed' : 'pointer',
        }}
        role="button"
        aria-label={recentlyAdded ? 'Added to queue' : 'Add to queue'}
      >
        <Icon style={iconStyle} />
        {showLabel && <span style={{ marginLeft: 8 }}>{label}</span>}
      </span>
    </Tooltip>
  );
}

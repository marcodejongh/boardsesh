'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Skeleton } from 'antd';
import { fetchBoardDetails } from '../rest-api/api';
import { BoardDetails, BoardName } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { BoardConfigData } from '@/app/lib/server-board-configs';

const { Text } = Typography;

type BoardConfigLivePreviewProps = {
  boardName?: BoardName;
  layoutId?: number;
  sizeId?: number;
  setIds: number[];
  angle: number;
  configName: string;
  useAsDefault: boolean;
  boardConfigs: BoardConfigData;
};

export default function BoardConfigLivePreview({
  boardName,
  layoutId,
  sizeId,
  setIds,
  boardConfigs,
}: BoardConfigLivePreviewProps) {
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if all required props are present
  const hasRequiredProps = Boolean(boardName && layoutId && sizeId && setIds.length > 0);

  useEffect(() => {
    if (!hasRequiredProps) {
      setBoardDetails(null);
      return;
    }

    const loadPreview = async () => {
      try {
        setIsLoading(true);

        // Type assertion is safe because we've already checked hasRequiredProps
        const safeBoardName = boardName!;
        const safeLayoutId = layoutId!;
        const safeSizeId = sizeId!;

        // Get data from boardConfigs prop
        const detailsKey = `${safeBoardName}-${safeLayoutId}-${safeSizeId}-${setIds.join(',')}`;
        const cachedDetails = boardConfigs.details[detailsKey];

        // Use cached details if available, otherwise fetch
        let details = cachedDetails;
        if (!details) {
          try {
            debugger;
            details = await fetchBoardDetails(safeBoardName, safeLayoutId, safeSizeId, setIds);
          } catch (error) {
            console.error('Failed to fetch board details:', error);
            details = null;
          }
        }

        setBoardDetails(details);
      } catch (error) {
        console.error('Failed to load preview:', error);
        setBoardDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [hasRequiredProps, boardName, layoutId, sizeId, setIds, boardConfigs]);

  if (!hasRequiredProps) {
    return (
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Text type="secondary">Select board configuration to see preview</Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card style={{ width: 400 }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  if (!boardDetails) {
    return (
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Text type="secondary">Preview unavailable</Text>
      </Card>
    );
  }

  return (
    <Card
      style={{ width: 400 }}
      cover={<BoardRenderer litUpHoldsMap={{}} mirrored={false} boardDetails={boardDetails} thumbnail={false} />}
    />
  );
}

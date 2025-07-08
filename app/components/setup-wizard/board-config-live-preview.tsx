'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Space, Skeleton } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { fetchBoardDetails, fetchLayouts, fetchSizes } from '../rest-api/api';
import { BoardDetails, BoardName } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';

const { Text } = Typography;

type BoardConfigLivePreviewProps = {
  boardName?: BoardName;
  layoutId?: number;
  sizeId?: number;
  setIds: number[];
  angle: number;
  configName: string;
  useAsDefault: boolean;
};

export default function BoardConfigLivePreview({ 
  boardName, 
  layoutId, 
  sizeId, 
  setIds, 
  angle, 
  configName,
  useAsDefault 
}: BoardConfigLivePreviewProps) {
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [layoutName, setLayoutName] = useState<string>('');
  const [sizeName, setSizeName] = useState<string>('');

  useEffect(() => {
    if (!boardName || !layoutId || !sizeId || setIds.length === 0) {
      setBoardDetails(null);
      setLayoutName('');
      setSizeName('');
      return;
    }

    const loadPreview = async () => {
      try {
        setIsLoading(true);
        
        const [details, layouts, sizes] = await Promise.all([
          fetchBoardDetails(boardName, layoutId, sizeId, setIds),
          fetchLayouts(boardName),
          fetchSizes(boardName, layoutId)
        ]);
        
        setBoardDetails(details);
        
        const layout = layouts.find(l => l.id === layoutId);
        setLayoutName(layout?.name || `Layout ${layoutId}`);
        
        const size = sizes.find(s => s.id === sizeId);
        setSizeName(size?.name || `Size ${sizeId}`);
        
      } catch (error) {
        console.error('Failed to load preview:', error);
        setBoardDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [boardName, layoutId, sizeId, setIds]);

  if (!boardName || !layoutId || !sizeId || setIds.length === 0) {
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
      cover={
        <BoardRenderer
          litUpHoldsMap={{}}
          mirrored={false}
          boardDetails={boardDetails}
          thumbnail={false}
        />
      }
    />
  );
}
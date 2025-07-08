'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tooltip, Tag, Space, Flex, Skeleton } from 'antd';
import { DeleteOutlined, StarFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { fetchBoardDetails, fetchLayouts, fetchSizes } from '../rest-api/api';
import { BoardDetails } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';

const { Text } = Typography;

type StoredBoardConfig = {
  name: string;
  board: string;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  useAsDefault: boolean;
  createdAt: string;
  lastUsed?: string;
};

type BoardConfigPreviewProps = {
  config: StoredBoardConfig;
  onDelete: (configName: string) => void;
};

export default function BoardConfigPreview({ config, onDelete }: BoardConfigPreviewProps) {
  const router = useRouter();
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutName, setLayoutName] = useState<string>('');
  const [sizeName, setSizeName] = useState<string>('');

  useEffect(() => {
    const loadBoardDetails = async () => {
      try {
        setIsLoading(true);
        
        // Load board details, layout name, and size name in parallel
        const [details, layouts, sizes] = await Promise.all([
          fetchBoardDetails(
            config.board as any,
            config.layoutId,
            config.sizeId,
            config.setIds
          ),
          fetchLayouts(config.board as any),
          fetchSizes(config.board as any, config.layoutId)
        ]);
        
        setBoardDetails(details);
        
        // Find layout name
        const layout = layouts.find(l => l.id === config.layoutId);
        setLayoutName(layout?.name || `Layout ${config.layoutId}`);
        
        // Find size name
        const size = sizes.find(s => s.id === config.sizeId);
        setSizeName(size?.name || `Size ${config.sizeId}`);
        
      } catch (error) {
        console.error('Failed to load board details for preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBoardDetails();
  }, [config]);

  const handleSelect = () => {
    // Navigate directly to the board using saved angle
    const setsString = config.setIds.join(',');
    const savedAngle = config.angle || 40;
    router.push(`/${config.board}/${config.layoutId}/${config.sizeId}/${setsString}/${savedAngle}/list`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(config.name);
  };

  if (isLoading) {
    return (
      <Card
        hoverable
        size="small"
        style={{ width: 200 }}
      >
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  if (!boardDetails) {
    return (
      <Card
        hoverable
        size="small"
        onClick={handleSelect}
        extra={
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            danger
            size="small"
          />
        }
      >
        <Space direction="vertical" size="small" align="center">
          <Text type="secondary">Preview unavailable</Text>
          <Text strong>{config.name}</Text>
          <Space direction="vertical" size={2}>
            <Tag>{layoutName}</Tag>
            <Space size={2}>
              <Tag>{sizeName}</Tag>
              <Tag>{config.angle || 40}°</Tag>
              {config.useAsDefault && <StarFilled />}
            </Space>
          </Space>
        </Space>
      </Card>
    );
  }

  return (
    <Card
      hoverable
      size="small"
      onClick={handleSelect}
      cover={
        <BoardRenderer
          litUpHoldsMap={{}} // Empty holds map - just show the board
          mirrored={false}
          boardDetails={boardDetails}
          thumbnail={true}
        />
      }
      extra={
        <Button
          type="text"
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          danger
          size="small"
        />
      }
    >
      <Card.Meta
        title={<Text strong>{config.name}</Text>}
        description={
          <Space direction="vertical" size={2}>
            <Tag>{layoutName}</Tag>
            <Space size={2}>
              <Tag>{sizeName}</Tag>
              <Tag>{config.angle || 40}°</Tag>
              {config.useAsDefault && (
                <Tooltip title="Default configuration">
                  <StarFilled />
                </Tooltip>
              )}
            </Space>
          </Space>
        }
      />
    </Card>
  );
}
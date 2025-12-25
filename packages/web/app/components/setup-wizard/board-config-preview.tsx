'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tooltip, Tag, Space, Skeleton } from 'antd';
import { DeleteOutlined, StarFilled } from '@ant-design/icons';
import Link from 'next/link';
import { fetchBoardDetails } from '../rest-api/api';
import { BoardDetails, BoardName } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';

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
  boardConfigs: BoardConfigData;
  isEditMode?: boolean;
};

export default function BoardConfigPreview({ config, onDelete, boardConfigs, isEditMode = false }: BoardConfigPreviewProps) {
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutName, setLayoutName] = useState<string>('');
  const [sizeName, setSizeName] = useState<string>('');
  const [boardUrl, setBoardUrl] = useState<string>('');

  useEffect(() => {
    const loadBoardDetails = async () => {
      try {
        setIsLoading(true);

        // Get data from boardConfigs prop
        const layouts = boardConfigs.layouts[config.board as BoardName] || [];
        const sizes = boardConfigs.sizes[`${config.board}-${config.layoutId}`] || [];
        const sets = boardConfigs.sets[`${config.board}-${config.layoutId}-${config.sizeId}`] || [];
        const detailsKey = `${config.board}-${config.layoutId}-${config.sizeId}-${config.setIds.join(',')}`;
        const cachedDetails = boardConfigs.details[detailsKey];

        // Find layout name
        const layout = layouts.find((l) => l.id === config.layoutId);
        setLayoutName(layout?.name || `Layout ${config.layoutId}`);

        // Find size name
        const size = sizes.find((s) => s.id === config.sizeId);
        setSizeName(size?.name || `Size ${config.sizeId}`);

        // Validate that the saved configuration is still valid
        const isValidConfig = layout && size && config.setIds.every((setId) => sets.some((set) => set.id === setId));

        // Generate the URL - always use SEO-friendly slug URLs
        const savedAngle = config.angle || 40;

        // Get set names for slug generation
        const setNames = sets
          .filter((s) => config.setIds.includes(s.id))
          .map((s) => s.name);

        // Always generate slug-based URL from the pre-loaded board configs data
        if (layout && size && setNames.length > 0) {
          const url = constructClimbListWithSlugs(
            config.board,
            layout.name,
            size.name,
            size.description,
            setNames,
            savedAngle,
          );
          setBoardUrl(url);
        }

        // Only try to get board details for preview rendering if we have cached details or if the config is valid
        let details = cachedDetails;
        if (!details && isValidConfig) {
          try {
            details = await fetchBoardDetails(config.board as BoardName, config.layoutId, config.sizeId, config.setIds);
            setBoardDetails(details);
          } catch (error) {
            console.error('Failed to fetch board details:', error);
          }
        } else if (cachedDetails) {
          setBoardDetails(details);
        }
      } catch (error) {
        console.error('Failed to load board details for preview:', error);
        // Try to set slug URL even if loading fails
        const savedAngle = config.angle || 40;
        const layouts = boardConfigs.layouts[config.board as BoardName] || [];
        const sizes = boardConfigs.sizes[`${config.board}-${config.layoutId}`] || [];
        const sets = boardConfigs.sets[`${config.board}-${config.layoutId}-${config.sizeId}`] || [];
        const layout = layouts.find((l) => l.id === config.layoutId);
        const size = sizes.find((s) => s.id === config.sizeId);
        const setNames = sets.filter((s) => config.setIds.includes(s.id)).map((s) => s.name);

        if (layout && size && setNames.length > 0) {
          setBoardUrl(constructClimbListWithSlugs(config.board, layout.name, size.name, size.description, setNames, savedAngle));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBoardDetails();
  }, [config, boardConfigs]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(config.name);
  };

  if (isLoading) {
    return (
      <Card hoverable size="small" style={{ minWidth: 0 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  if (!boardDetails) {
    return (
      <Link href={boardUrl} style={{ textDecoration: 'none', minWidth: 0 }}>
        <Card
          hoverable
          size="small"
          style={{ minWidth: 0 }}
          extra={isEditMode ? <Button type="text" icon={<DeleteOutlined />} onClick={handleDelete} danger size="small" /> : undefined}
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
      </Link>
    );
  }

  return (
    <Link href={boardUrl} style={{ textDecoration: 'none', minWidth: 0 }}>
      <Card
        hoverable
        size="small"
        style={{ minWidth: 0 }}
        cover={
          <BoardRenderer
            litUpHoldsMap={{}} // Empty holds map - just show the board
            mirrored={false}
            boardDetails={boardDetails}
            thumbnail={true}
          />
        }
        extra={isEditMode ? <Button type="text" icon={<DeleteOutlined />} onClick={handleDelete} danger size="small" /> : undefined}
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
    </Link>
  );
}

'use client';

import React from 'react';
import { Card, Button, Tag, Popconfirm, Typography } from 'antd';
import Stack from '@mui/material/Stack';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import type { MoonBoardClimb } from '@boardsesh/moonboard-ocr/browser';
import type { LitUpHoldsMap } from '../board-renderer/types';
import styles from './moonboard-import-card.module.css';

const { Text, Paragraph } = Typography;

interface MoonBoardImportCardProps {
  climb: MoonBoardClimb;
  layoutFolder: string;
  holdSetImages: string[];
  litUpHoldsMap: LitUpHoldsMap;
  onEdit: () => void;
  onRemove: () => void;
}

export default function MoonBoardImportCard({
  climb,
  layoutFolder,
  holdSetImages,
  litUpHoldsMap,
  onEdit,
  onRemove,
}: MoonBoardImportCardProps) {
  const totalHolds = climb.holds.start.length + climb.holds.hand.length + climb.holds.finish.length;

  return (
    <Card
      className={styles.card}
      cover={
        <div className={styles.boardPreview}>
          <MoonBoardRenderer
            layoutFolder={layoutFolder}
            holdSetImages={holdSetImages}
            litUpHoldsMap={litUpHoldsMap}
          />
        </div>
      }
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={onEdit}>
          Edit
        </Button>,
        <Popconfirm
          key="delete"
          title="Remove this climb?"
          description="This climb will not be imported."
          onConfirm={onRemove}
          okText="Remove"
          cancelText="Cancel"
        >
          <Button type="text" danger icon={<DeleteOutlined />}>
            Remove
          </Button>
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={
          <div className={styles.titleRow}>
            <Text strong ellipsis={{ tooltip: climb.name }}>
              {climb.name || 'Unnamed Climb'}
            </Text>
            {climb.isBenchmark && (
              <Tag color="orange" className={styles.benchmarkTag}>
                B
              </Tag>
            )}
          </div>
        }
        description={
          <div className={styles.metadata}>
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} className={styles.setter}>
              by {climb.setter || 'Unknown'}
            </Paragraph>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Tag color="blue">{climb.userGrade || 'No grade'}</Tag>
              <Tag>{climb.angle}°</Tag>
              <Tag>{totalHolds} holds</Tag>
            </Stack>
          </div>
        }
      />
    </Card>
  );
}

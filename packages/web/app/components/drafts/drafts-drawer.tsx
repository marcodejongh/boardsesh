'use client';

import React, { useMemo } from 'react';
import { Drawer, List, Button, Empty, Typography, Popconfirm, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDrafts, DraftClimb } from './drafts-context';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { BoardDetails } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import styles from './drafts-drawer.module.css';

const { Text, Paragraph } = Typography;

interface DraftsDrawerProps {
  open: boolean;
  onClose: () => void;
  boardDetails: BoardDetails;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function DraftItem({
  draft,
  boardDetails,
  onEdit,
  onDelete,
}: {
  draft: DraftClimb;
  boardDetails: BoardDetails;
  onEdit: (draft: DraftClimb) => void;
  onDelete: (uuid: string) => void;
}) {
  const holdCount = Object.keys(draft.litUpHoldsMap).length;

  return (
    <List.Item className={styles.draftItem}>
      <Row gutter={[12, 8]} align="middle" style={{ width: '100%' }}>
        {/* Thumbnail */}
        <Col span={6}>
          <div className={styles.thumbnail}>
            <BoardRenderer
              boardDetails={boardDetails}
              litUpHoldsMap={draft.litUpHoldsMap}
              mirrored={false}
              thumbnail
            />
          </div>
        </Col>

        {/* Content */}
        <Col span={12}>
          <div className={styles.draftContent}>
            <Text strong className={styles.draftName}>
              {draft.name || 'Untitled'}
            </Text>
            <div className={styles.draftMeta}>
              <Text type="secondary">
                {holdCount} holds · {draft.angle}°
              </Text>
              <Text type="secondary" className={styles.timestamp}>
                {formatRelativeTime(draft.updatedAt)}
              </Text>
            </div>
          </div>
        </Col>

        {/* Actions */}
        <Col span={6}>
          <div className={styles.draftActions}>
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(draft)}
            >
              Resume
            </Button>
            <Popconfirm
              title="Delete draft?"
              description="This cannot be undone."
              onConfirm={() => onDelete(draft.uuid)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </div>
        </Col>
      </Row>
    </List.Item>
  );
}

export function DraftsDrawer({ open, onClose, boardDetails }: DraftsDrawerProps) {
  const router = useRouter();
  const { drafts, isLoading, deleteDraft } = useDrafts();

  // Filter drafts to only show those matching the current board configuration
  const filteredDrafts = useMemo(() => {
    return drafts.filter(
      (draft) =>
        draft.boardName === boardDetails.board_name &&
        draft.layoutId === boardDetails.layout_id &&
        draft.sizeId === boardDetails.size_id,
    );
  }, [drafts, boardDetails]);

  const handleEdit = (draft: DraftClimb) => {
    // Navigate to the create page with the draft ID
    let createUrl: string;

    if (draft.layoutName && draft.sizeName && draft.setNames) {
      // Use stored names for proper slug-based URL
      createUrl = `/${draft.boardName}/${generateLayoutSlug(draft.layoutName)}/${generateSizeSlug(draft.sizeName)}/${generateSetSlug(draft.setNames)}/${draft.angle}/create?draftId=${draft.uuid}`;
    } else {
      // Fallback to ID-based URL (older drafts)
      createUrl = `/${draft.boardName}/${draft.layoutId}/${draft.sizeId}/${draft.setIds.join(',')}/${draft.angle}/create?draftId=${draft.uuid}`;
    }

    router.push(createUrl);
    onClose();
  };

  const handleDelete = async (uuid: string) => {
    try {
      await deleteDraft(uuid);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  return (
    <Drawer
      title="Draft Climbs"
      placement="right"
      onClose={onClose}
      open={open}
      width={420}
    >
      {filteredDrafts.length === 0 && !isLoading ? (
        <Empty
          description={
            <Paragraph type="secondary">
              No drafts yet. Start creating a climb and it will be automatically saved here.
            </Paragraph>
          }
        />
      ) : (
        <List
          loading={isLoading}
          dataSource={filteredDrafts}
          renderItem={(draft) => (
            <DraftItem
              draft={draft}
              boardDetails={boardDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        />
      )}
    </Drawer>
  );
}

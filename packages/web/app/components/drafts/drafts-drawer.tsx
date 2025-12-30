'use client';

import React from 'react';
import { Drawer, List, Button, Empty, Typography, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDrafts, DraftClimb } from './drafts-context';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import styles from './drafts-drawer.module.css';

const { Text, Paragraph } = Typography;

interface DraftsDrawerProps {
  open: boolean;
  onClose: () => void;
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
  onEdit,
  onDelete,
}: {
  draft: DraftClimb;
  onEdit: (draft: DraftClimb) => void;
  onDelete: (uuid: string) => void;
}) {
  const holdCount = Object.keys(draft.litUpHoldsMap).length;
  const boardNameCapitalized = draft.boardName.charAt(0).toUpperCase() + draft.boardName.slice(1);

  return (
    <List.Item
      className={styles.draftItem}
      actions={[
        <Button
          key="edit"
          type="text"
          icon={<EditOutlined />}
          onClick={() => onEdit(draft)}
        >
          Resume
        </Button>,
        <Popconfirm
          key="delete"
          title="Delete draft?"
          description="This cannot be undone."
          onConfirm={() => onDelete(draft.uuid)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text strong>{draft.name || 'Untitled'}</Text>
            <Tag color="blue">{boardNameCapitalized}</Tag>
          </Space>
        }
        description={
          <div className={styles.draftMeta}>
            <Text type="secondary">
              {holdCount} holds at {draft.angle}°
            </Text>
            <Text type="secondary" className={styles.timestamp}>
              {formatRelativeTime(draft.updatedAt)}
            </Text>
          </div>
        }
      />
    </List.Item>
  );
}

export function DraftsDrawer({ open, onClose }: DraftsDrawerProps) {
  const router = useRouter();
  const { drafts, isLoading, deleteDraft } = useDrafts();

  const handleEdit = (draft: DraftClimb) => {
    // Navigate to the create page with the draft ID
    const createUrl = `/${draft.boardName}/${generateLayoutSlug(String(draft.layoutId))}/${generateSizeSlug(String(draft.sizeId))}/${generateSetSlug(draft.setIds.map(String))}/${draft.angle}/create?draftId=${draft.uuid}`;
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
      width={400}
    >
      {drafts.length === 0 && !isLoading ? (
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
          dataSource={drafts}
          renderItem={(draft) => (
            <DraftItem draft={draft} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        />
      )}
    </Drawer>
  );
}

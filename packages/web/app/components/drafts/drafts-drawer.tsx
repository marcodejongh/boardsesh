'use client';

import React, { useMemo, useCallback } from 'react';
import { Drawer, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useDrafts, DraftClimb } from './drafts-context';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { BoardDetails } from '@/app/lib/types';
import { ClimbsList, ClimbsListItemProps } from '../climbs-list';
import { themeTokens } from '@/app/theme/theme-config';

const { Paragraph } = Typography;

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

export function DraftsDrawer({ open, onClose, boardDetails }: DraftsDrawerProps) {
  const router = useRouter();
  const { drafts, isLoading, deleteDraft, reorderDrafts } = useDrafts();

  // Filter drafts to only show those matching the current board configuration
  const filteredDrafts = useMemo(() => {
    return drafts.filter(
      (draft) =>
        draft.boardName === boardDetails.board_name &&
        draft.layoutId === boardDetails.layout_id &&
        draft.sizeId === boardDetails.size_id,
    );
  }, [drafts, boardDetails]);

  const handleEdit = useCallback(
    (draft: DraftClimb) => {
      let createUrl: string;

      if (draft.layoutName && draft.sizeName && draft.setNames) {
        createUrl = `/${draft.boardName}/${generateLayoutSlug(draft.layoutName)}/${generateSizeSlug(draft.sizeName)}/${generateSetSlug(draft.setNames)}/${draft.angle}/create?draftId=${draft.uuid}`;
      } else {
        createUrl = `/${draft.boardName}/${draft.layoutId}/${draft.sizeId}/${draft.setIds.join(',')}/${draft.angle}/create?draftId=${draft.uuid}`;
      }

      router.push(createUrl);
      onClose();
    },
    [router, onClose],
  );

  const handleDelete = useCallback(
    async (uuid: string) => {
      try {
        await deleteDraft(uuid);
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
    },
    [deleteDraft],
  );

  const handleReorder = useCallback(
    (reorderedDrafts: DraftClimb[]) => {
      reorderDrafts(reorderedDrafts);
    },
    [reorderDrafts],
  );

  const renderItem = useCallback(
    (draft: DraftClimb, index: number): ClimbsListItemProps<DraftClimb> => {
      const holdCount = Object.keys(draft.litUpHoldsMap).length;

      return {
        item: draft,
        index,
        boardDetails,
        litUpHoldsMap: draft.litUpHoldsMap,
        mirrored: false,
        title: draft.name || 'Untitled',
        subtitle: `${holdCount} holds · ${draft.angle}° · ${formatRelativeTime(draft.updatedAt)}`,
        draggable: true,
        menuItems: [
          {
            key: 'resume',
            label: 'Resume',
            icon: <EditOutlined />,
            onClick: () => handleEdit(draft),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDelete(draft.uuid),
          },
        ],
        swipeLeftAction: {
          icon: <DeleteOutlined style={{ color: 'white', fontSize: 20 }} />,
          color: themeTokens.colors.error,
          onSwipe: () => handleDelete(draft.uuid),
        },
        swipeRightAction: {
          icon: <EditOutlined style={{ color: 'white', fontSize: 20 }} />,
          color: themeTokens.colors.primary,
          onSwipe: () => handleEdit(draft),
        },
        onDoubleClick: () => handleEdit(draft),
      };
    },
    [boardDetails, handleEdit, handleDelete],
  );

  return (
    <Drawer title="Draft Climbs" placement="right" onClose={onClose} open={open} width={420}>
      <ClimbsList
        items={filteredDrafts}
        boardDetails={boardDetails}
        loading={isLoading}
        emptyText={
          <Paragraph type="secondary">
            No drafts yet. Start creating a climb and it will be automatically saved here.
          </Paragraph>
        }
        renderItem={renderItem}
        onReorder={handleReorder}
      />
    </Drawer>
  );
}

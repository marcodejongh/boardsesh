'use client';

import React, { useEffect } from 'react';
import { Flex, Empty, Spin, Typography } from 'antd';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import ClimbsListItem from './climbs-list-item';
import { ClimbsListProps, ClimbsListItem as ClimbsListItemType } from './types';

const { Paragraph } = Typography;

function ClimbsList<T extends ClimbsListItemType>({
  items,
  boardDetails: _boardDetails,
  loading = false,
  emptyText = 'No items',
  renderItem,
  onReorder,
}: ClimbsListProps<T>) {
  // Monitor for drag-and-drop events
  useEffect(() => {
    if (!onReorder) return;

    const cleanup = monitorForElements({
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceIndex = Number(source.data.index);
        const targetIndex = Number(target.data.index);

        if (isNaN(sourceIndex) || isNaN(targetIndex)) return;

        // Skip if dropping on itself
        if (sourceIndex === targetIndex) return;

        const edge = extractClosestEdge(target.data);
        let finalIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;

        // Adjust for the fact that removing the source item shifts indices
        if (sourceIndex < finalIndex) {
          finalIndex = finalIndex - 1;
        }

        // Skip if final position is the same
        if (sourceIndex === finalIndex) return;

        const newItems = reorder({
          list: items,
          startIndex: sourceIndex,
          finishIndex: finalIndex,
        });

        onReorder(newItems);
      },
    });

    return cleanup;
  }, [items, onReorder]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ padding: '40px 0' }}>
        <Spin />
      </Flex>
    );
  }

  if (items.length === 0) {
    return (
      <Empty
        description={
          typeof emptyText === 'string' ? (
            <Paragraph type="secondary">{emptyText}</Paragraph>
          ) : (
            emptyText
          )
        }
      />
    );
  }

  return (
    <Flex vertical>
      {items.map((item, index) => {
        const itemProps = renderItem(item, index);
        return <ClimbsListItem key={item.uuid} {...itemProps} />;
      })}
    </Flex>
  );
}

export default ClimbsList;

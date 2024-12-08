import React, { useEffect, useRef, useState } from 'react';
import { List, Row, Col, Typography } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DragHandleButton } from '@atlaskit/pragmatic-drag-and-drop-react-accessibility/drag-handle-button';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ClimbQueueItem } from './types';
import ClimbThumbnail from '../climb-card/climb-thumbnail';

const { Text } = Typography;

type QueueListItemProps = {
  item: ClimbQueueItem;
  index: number;
  isCurrent: boolean;
  isHistory: boolean;
  viewOnlyMode: boolean;
  boardDetails: BoardDetails;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
};

const QueueListItem: React.FC<QueueListItemProps> = ({
  item,
  index,
  isCurrent,
  isHistory,
  boardDetails,
  setCurrentClimbQueueItem,
}) => {
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = itemRef.current;

    if (element) {
      return combine(
        draggable({
          element,
          getInitialData: () => ({ index, id: item.uuid }),
        }),
        dropTargetForElements({
          element,
          getData: ({ input }) =>
            attachClosestEdge(
              { index, id: item.uuid },
              {
                element,
                input,
                allowedEdges: ['top', 'bottom'],
              },
            ),
          onDrag({ self }) {
            const edge = extractClosestEdge(self.data);
            setClosestEdge(edge);
          },
          onDragLeave() {
            setClosestEdge(null);
          },
          onDrop() {
            setClosestEdge(null);
          },
        }),
      );
    }
  }, [index, item.uuid]);

  return (
    <div ref={itemRef}>
      <List.Item
        style={{
          backgroundColor: isCurrent ? '#eeffff' : isHistory ? '#f5f5f5' : 'inherit',
          opacity: isHistory ? 0.6 : 1,
          cursor: 'grab',
          position: 'relative',
          WebkitUserSelect: 'none', // Add these properties
          MozUserSelect: 'none', // to prevent text
          msUserSelect: 'none', // selection on
          userSelect: 'none', // different browsers
        }}
        onClick={() => setCurrentClimbQueueItem(item)}
      >
        <Row style={{ width: '100%' }} gutter={16} align="middle">
          <Col xs={5}>
            <ClimbThumbnail boardDetails={boardDetails} currentClimb={item.climb} />
          </Col>
          <Col xs={17}>
            <List.Item.Meta
              title={
                <Text
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 'bold',
                  }}
                >
                  {item.climb.name}
                </Text>
              }
              description={
                <Text
                  type={isHistory ? 'secondary' : undefined}
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {`${item.climb.difficulty} ${item.climb.quality_average}★`}
                </Text>
              }
            />
          </Col>
          <Col xs={1}>
            <DragHandleButton label={`Reorder ${item.climb.name}`}>
              <HolderOutlined />
            </DragHandleButton>
          </Col>
        </Row>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </List.Item>
    </div>
  );
};

export default QueueListItem;

import React, { useEffect, useRef, useState } from 'react';
import { List, Row, Col, Typography } from 'antd';
import { HolderOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DragHandleButton } from '@atlaskit/pragmatic-drag-and-drop-react-accessibility/drag-handle-button';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ClimbQueueItem } from './types';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { useBoardProvider } from '../board-provider/board-provider-context';

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
  const { logbook, boardName } = useBoardProvider();

  const ascentsForClimb = logbook.filter((ascent) => ascent.climb_uuid === item.climb.uuid);

  const hasSuccessfulAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && !is_mirror);
  const hasSuccessfulMirroredAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && is_mirror);
  const hasAttempts = ascentsForClimb.length > 0;
  const supportsMirroring = boardName === 'tension';

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

  const renderAscentStatus = () => {
    if (!hasAttempts) return null;

    if (supportsMirroring) {
      return (
        <div style={{ position: 'relative', width: '16px', height: '16px' }}>
          {/* Regular ascent icon */}
          {hasSuccessfulAscent ? <CheckOutlined style={{ color: '#52c41a', position: 'absolute' }} /> : null}
          {/* Mirrored ascent icon */}
          {hasSuccessfulMirroredAscent ? (
            <div
              style={{
                position: 'absolute',
                transform: 'scaleX(-1)',
                left: '2px',
                top: '-4px',
              }}
            >
              <CheckOutlined style={{ color: '#52c41a' }} />
            </div>
          ) : null}
          {!hasSuccessfulMirroredAscent && !hasSuccessfulAscent ? (
            <CloseOutlined style={{ color: '#ff4d4f', position: 'absolute' }} />
          ) : null}
        </div>
      );
    }

    // Single icon for non-mirroring boards
    return hasSuccessfulAscent ? (
      <CheckOutlined style={{ color: '#52c41a' }} />
    ) : (
      <CloseOutlined style={{ color: '#ff4d4f' }} />
    );
  };

  return (
    <div ref={itemRef}>
      <List.Item
        style={{
          backgroundColor: isCurrent ? '#eeffff' : isHistory ? '#f5f5f5' : 'inherit',
          opacity: isHistory ? 0.6 : 1,
          cursor: 'grab',
          position: 'relative',
<<<<<<< HEAD
          WebkitUserSelect: 'none', // Add these properties
          MozUserSelect: 'none', // to prevent text
          msUserSelect: 'none', // selection on
          userSelect: 'none', // different browsers
=======
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
>>>>>>> c510862 (Implement checkboxes in queuelist)
        }}
        onDoubleClick={() => setCurrentClimbQueueItem(item)}
      >
        <Row style={{ width: '100%' }} gutter={16} align="middle">
          <Col xs={5}>
            <ClimbThumbnail boardDetails={boardDetails} currentClimb={item.climb} />
          </Col>
          <Col xs={16}>
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  {renderAscentStatus()}
                </div>
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

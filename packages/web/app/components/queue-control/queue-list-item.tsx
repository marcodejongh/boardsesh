import React, { useEffect, useRef, useState } from 'react';
import { List, Row, Col, Typography, Avatar, Tooltip } from 'antd';
import { HolderOutlined, CheckOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { BoardDetails, ClimbUuid } from '@/app/lib/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { DragHandleButton } from '@atlaskit/pragmatic-drag-and-drop-react-accessibility/drag-handle-button';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { ClimbQueueItem } from './types';
import { TickButton } from '../logbook/tick-button';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { CopyrightOutlined } from '@ant-design/icons';

const { Text } = Typography;

type QueueListItemProps = {
  item: ClimbQueueItem;
  index: number;
  isCurrent: boolean;
  isHistory: boolean;
  viewOnlyMode: boolean;
  boardDetails: BoardDetails;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
  onClimbNavigate?: () => void;
};

export const AscentStatus = ({ climbUuid }: { climbUuid: ClimbUuid }) => {
  const { logbook, boardName } = useBoardProvider();

  const ascentsForClimb = logbook.filter((ascent) => ascent.climb_uuid === climbUuid);

  const hasSuccessfulAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && !is_mirror);
  const hasSuccessfulMirroredAscent = ascentsForClimb.some(({ is_ascent, is_mirror }) => is_ascent && is_mirror);
  const hasAttempts = ascentsForClimb.length > 0;
  const supportsMirroring = boardName === 'tension';

  if (!hasAttempts) return null;

  if (supportsMirroring) {
    return (
      <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center' }}>
        {/* Regular ascent icon */}
        {hasSuccessfulAscent ? (
          <div style={{ position: 'absolute', left: 0 }}>
            <CheckOutlined style={{ color: '#52c41a' }} />
          </div>
        ) : null}
        {/* Mirrored ascent icon */}
        {hasSuccessfulMirroredAscent ? (
          <div
            style={{
              position: 'absolute',
              transform: 'scaleX(-1)',
              left: '2px',
            }}
          >
            <CheckOutlined style={{ color: '#52c41a' }} />
          </div>
        ) : null}
        {!hasSuccessfulMirroredAscent && !hasSuccessfulAscent ? (
          <CloseOutlined style={{ color: '#ff4d4f', position: 'absolute', left: 0 }} />
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

const QueueListItem: React.FC<QueueListItemProps> = ({
  item,
  index,
  isCurrent,
  isHistory,
  boardDetails,
  setCurrentClimbQueueItem,
  onClimbNavigate,
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
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
        }}
        onDoubleClick={() => setCurrentClimbQueueItem(item)}
      >
        <Row style={{ width: '100%' }} gutter={[8, 8]} align="middle" wrap={false}>
          <Col xs={2} sm={1}>
            <DragHandleButton label={`Reorder ${item.climb?.name || 'climb'}`}>
              <HolderOutlined />
            </DragHandleButton>
          </Col>
          <Col xs={5} sm={5}>
            <ClimbThumbnail
              boardDetails={boardDetails}
              currentClimb={item.climb}
              enableNavigation={true}
              onNavigate={onClimbNavigate}
            />
          </Col>
          <Col xs={item.addedByUser ? 12 : 14} sm={item.addedByUser ? 14 : 16}>
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
                    {item.climb?.name}
                  </Text>
                  <AscentStatus climbUuid={item.climb?.uuid} />
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
                  {item.climb?.difficulty && item.climb?.quality_average
                    ? `${item.climb?.difficulty} ${item.climb?.quality_average}★ @ ${item.climb?.angle}°`
                    : `project @ ${item.climb?.angle}°`}
                  {item.climb?.benchmark_difficulty && <CopyrightOutlined style={{ marginLeft: 4 }} />}
                </Text>
              }
            />
          </Col>
          {item.addedByUser && (
            <Col xs={2} sm={2}>
              <Tooltip title={item.addedByUser.username}>
                <Avatar size="small" src={item.addedByUser.avatarUrl} icon={<UserOutlined />} />
              </Tooltip>
            </Col>
          )}
          <Col xs={3} sm={2}>
            <TickButton currentClimb={item.climb} angle={item.climb?.angle} boardDetails={boardDetails} />
          </Col>
        </Row>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </List.Item>
    </div>
  );
};

export default QueueListItem;

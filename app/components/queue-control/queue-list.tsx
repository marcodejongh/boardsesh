'use client';
import React, { useEffect } from 'react';
import { List, Divider, Row, Col, Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQueueContext } from './queue-context';
import { Climb, BoardDetails } from '@/app/lib/types';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import QueueListItem from './queue-list-item';
import ClimbThumbnail from '../climb-card/climb-thumbnail';

const { Text } = Typography;

type QueueListProps = {
  boardDetails: BoardDetails;
  onClimbNavigate?: () => void;
};

const QueueList: React.FC<QueueListProps> = ({ boardDetails, onClimbNavigate }) => {
  const {
    viewOnlyMode,
    currentClimbQueueItem,
    queue,
    climbSearchResults,
    setCurrentClimbQueueItem,
    setQueue,
    addToQueue,
  } = useQueueContext();

  // Monitor for drag-and-drop events
  useEffect(() => {
    const cleanup = monitorForElements({
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceIndex = Number(source.data.index);
        const targetIndex = Number(target.data.index);

        if (isNaN(sourceIndex) || isNaN(targetIndex)) return;

        const edge = extractClosestEdge(target.data);
        const finalIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;

        const newQueue = reorder({
          list: queue,
          startIndex: sourceIndex,
          finishIndex: finalIndex,
        });

        setQueue(newQueue);
      },
    });

    return cleanup; // Cleanup listener on component unmount
  }, [queue, setQueue]);

  return (
    <>
      <List
        dataSource={queue}
        renderItem={(climbQueueItem, index) => {
          const isCurrent = currentClimbQueueItem?.uuid === climbQueueItem.uuid;
          const isHistory =
            queue.findIndex((item) => item.uuid === currentClimbQueueItem?.uuid) >
            queue.findIndex((item) => item.uuid === climbQueueItem.uuid);

          return (
            <QueueListItem
              key={climbQueueItem.uuid}
              item={climbQueueItem}
              index={index}
              isCurrent={isCurrent}
              isHistory={isHistory}
              viewOnlyMode={viewOnlyMode}
              boardDetails={boardDetails}
              setCurrentClimbQueueItem={setCurrentClimbQueueItem}
              onClimbNavigate={onClimbNavigate}
            />
          );
        }}
      />
      {!viewOnlyMode && (
        <>
          <Divider>Suggested Items</Divider>
          <List
            dataSource={(climbSearchResults || []).filter(
              (item) => !queue.find(({ climb: { uuid } }) => item.uuid === uuid),
            )}
            renderItem={(climb: Climb) => (
              <List.Item>
                <Row gutter={8} align="middle" wrap={false}>
                  <Col xs={2} sm={1}>
                    {/* Empty space to maintain layout consistency */}
                  </Col>
                  <Col xs={5} sm={4}>
                    <ClimbThumbnail 
                      boardDetails={boardDetails} 
                      currentClimb={climb} 
                      enableNavigation={true}
                      onNavigate={onClimbNavigate}
                    />
                  </Col>
                  <Col xs={14} sm={16}>
                    <List.Item.Meta
                      title={<Text ellipsis strong>{climb.name}</Text>}
                      description={
                        <Text type="secondary" ellipsis>
                          {climb.difficulty && climb.quality_average ? (
                            `${climb.difficulty} ${climb.quality_average}★ @ ${climb.angle}°`
                          ) : (
                            `project @ ${climb.angle}°`
                          )}
                        </Text>
                      }
                    />
                  </Col>
                  <Col xs={3} sm={3}>
                    <Button
                      type="default"
                      icon={<PlusOutlined />}
                      onClick={() => addToQueue(climb)}
                    />
                  </Col>
                </Row>
              </List.Item>
            )}
          />
        </>
      )}
    </>
  );
};

export default QueueList;

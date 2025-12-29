'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Divider, Row, Col, Button, Flex, Drawer, Space, Typography } from 'antd';
import { PlusOutlined, LoginOutlined } from '@ant-design/icons';
import { useQueueContext } from '../graphql-queue';
import { Climb, BoardDetails } from '@/app/lib/types';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import QueueListItem from './queue-list-item';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { themeTokens } from '@/app/theme/theme-config';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { LogbookDrawer } from '../logbook/logbook-drawer';
import AuthModal from '../auth/auth-modal';

const { Text, Paragraph } = Typography;

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
    removeFromQueue,
  } = useQueueContext();

  const { isAuthenticated } = useBoardProvider();

  // Tick drawer state
  const [tickDrawerVisible, setTickDrawerVisible] = useState(false);
  const [tickClimb, setTickClimb] = useState<Climb | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleTickClick = useCallback((climb: Climb) => {
    setTickClimb(climb);
    setTickDrawerVisible(true);
  }, []);

  const closeTickDrawer = useCallback(() => {
    setTickDrawerVisible(false);
    setTickClimb(null);
  }, []);

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
        let finalIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;

        // Adjust for the fact that removing the source item shifts indices
        if (sourceIndex < finalIndex) {
          finalIndex = finalIndex - 1;
        }

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

  const suggestedClimbs = (climbSearchResults || []).filter(
    (item) => !queue.find((queueItem) => queueItem.climb?.uuid === item.uuid),
  );

  return (
    <>
      <Flex vertical>
        {queue.map((climbQueueItem, index) => {
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
              removeFromQueue={removeFromQueue}
              onTickClick={handleTickClick}
              onClimbNavigate={onClimbNavigate}
            />
          );
        })}
      </Flex>
      {!viewOnlyMode && (
        <>
          <Divider>Suggested Items</Divider>
          <Flex vertical>
            {suggestedClimbs.map((climb: Climb) => (
              <div
                key={climb.uuid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 8px',
                  borderBottom: `1px solid ${themeTokens.neutral[200]}`,
                }}
              >
                <Row style={{ width: '100%' }} gutter={[8, 8]} align="middle" wrap={false}>
                  <Col xs={6} sm={5}>
                    <ClimbThumbnail
                      boardDetails={boardDetails}
                      currentClimb={climb}
                      enableNavigation={true}
                      onNavigate={onClimbNavigate}
                    />
                  </Col>
                  <Col xs={15} sm={17}>
                    <ClimbTitle climb={climb} showAngle centered />
                  </Col>
                  <Col xs={3} sm={2}>
                    <Button type="default" icon={<PlusOutlined />} onClick={() => addToQueue(climb)} />
                  </Col>
                </Row>
              </div>
            ))}
          </Flex>
        </>
      )}

      {/* Tick drawer - now works with just NextAuth authentication */}
      {isAuthenticated ? (
        <LogbookDrawer
          drawerVisible={tickDrawerVisible}
          closeDrawer={closeTickDrawer}
          currentClimb={tickClimb}
          boardDetails={boardDetails}
        />
      ) : (
        <Drawer
          title="Sign In Required"
          placement="bottom"
          onClose={closeTickDrawer}
          open={tickDrawerVisible}
          styles={{ wrapper: { height: '50%' } }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', padding: '24px 0' }}>
            <Text strong style={{ fontSize: 16 }}>Sign in to record ticks</Text>
            <Paragraph type="secondary">
              Create a Boardsesh account to log your climbs and track your progress.
            </Paragraph>
            <Button type="primary" icon={<LoginOutlined />} onClick={() => setShowAuthModal(true)} block>
              Sign In
            </Button>
          </Space>
        </Drawer>
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to record ticks"
        description="Create an account to log your climbs and track your progress."
      />
    </>
  );
};

export default QueueList;

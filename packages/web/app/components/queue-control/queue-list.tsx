'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Divider, Row, Col, Button, Flex, Drawer, Space, Typography, Skeleton } from 'antd';
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
import { SUGGESTIONS_THRESHOLD } from '../board-page/constants';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { LogAscentDrawer } from '../logbook/log-ascent-drawer';
import AuthModal from '../auth/auth-modal';
import InstagramDrawer from '../instagram-drawer/instagram-drawer';

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
    suggestedClimbs,
    hasMoreResults,
    isFetchingClimbs,
    isFetchingNextPage,
    fetchMoreClimbs,
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

  // Instagram drawer state
  const [instagramDrawerVisible, setInstagramDrawerVisible] = useState(false);
  const [instagramClimb, setInstagramClimb] = useState<Climb | null>(null);

  const handleTickClick = useCallback((climb: Climb) => {
    setTickClimb(climb);
    setTickDrawerVisible(true);
  }, []);

  const closeTickDrawer = useCallback(() => {
    setTickDrawerVisible(false);
    setTickClimb(null);
  }, []);

  const handleInstagramClick = useCallback((climb: Climb) => {
    setInstagramClimb(climb);
    setInstagramDrawerVisible(true);
  }, []);

  const closeInstagramDrawer = useCallback(() => {
    setInstagramDrawerVisible(false);
    setInstagramClimb(null);
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

  // Ref for the intersection observer sentinel element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer callback for infinite scroll
  // Skip if suggestions are below threshold - proactive fetch in QueueContext handles that case
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (
        target.isIntersecting &&
        hasMoreResults &&
        !isFetchingNextPage &&
        suggestedClimbs.length >= SUGGESTIONS_THRESHOLD
      ) {
        fetchMoreClimbs();
      }
    },
    [hasMoreResults, isFetchingNextPage, fetchMoreClimbs, suggestedClimbs.length],
  );

  // Set up Intersection Observer for infinite scroll
  // Using root: null (viewport) is more robust than querying for specific DOM elements
  // and works correctly with any scrollable ancestor
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || viewOnlyMode) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver, viewOnlyMode]);

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
              onInstagramClick={handleInstagramClick}
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
          {/* Sentinel element for Intersection Observer - only render when needed */}
          {/* Include isFetchingClimbs to show skeleton during initial page load */}
          {(suggestedClimbs.length > 0 || isFetchingClimbs || isFetchingNextPage || hasMoreResults) && (
            <div
              ref={loadMoreRef}
              style={{ minHeight: themeTokens.spacing[5], marginTop: themeTokens.spacing[2] }}
            >
              {(isFetchingClimbs || isFetchingNextPage) && (
                <Flex vertical gap={themeTokens.spacing[2]} style={{ padding: themeTokens.spacing[2] }}>
                  {[1, 2, 3].map((i) => (
                    <Row key={i} gutter={[8, 8]} align="middle" wrap={false}>
                      <Col xs={6} sm={5}>
                        <Skeleton.Image active style={{ width: '100%', height: 60 }} />
                      </Col>
                      <Col xs={15} sm={17}>
                        <Skeleton active paragraph={{ rows: 1 }} title={false} />
                      </Col>
                      <Col xs={3} sm={2}>
                        <Skeleton.Button active size="small" />
                      </Col>
                    </Row>
                  ))}
                </Flex>
              )}
              {!hasMoreResults && !isFetchingClimbs && suggestedClimbs.length > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: themeTokens.spacing[4],
                    color: themeTokens.neutral[400],
                  }}
                >
                  No more suggestions
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Tick drawer - now works with just NextAuth authentication */}
      {isAuthenticated ? (
        <LogAscentDrawer
          open={tickDrawerVisible}
          onClose={closeTickDrawer}
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

      {/* Instagram Drawer for Beta Videos */}
      <InstagramDrawer
        open={instagramDrawerVisible}
        onClose={closeInstagramDrawer}
        climb={instagramClimb}
        boardName={boardDetails.board_name}
      />
    </>
  );
};

export default QueueList;

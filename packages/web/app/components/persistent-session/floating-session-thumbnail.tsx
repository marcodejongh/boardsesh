'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Modal, Tooltip, Typography } from 'antd';
import { CloseOutlined, TeamOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { usePersistentSession, useIsOnBoardRoute } from './persistent-session-context';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';

const { Text } = Typography;

const FloatingSessionThumbnail: React.FC = () => {
  const router = useRouter();
  const isOnBoardRoute = useIsOnBoardRoute();
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const {
    activeSession,
    currentClimbQueueItem,
    users,
    hasConnected,
    isConnecting,
    deactivateSession,
    // Local queue state
    localQueue,
    localCurrentClimbQueueItem,
    localBoardPath,
    localBoardDetails,
    clearLocalQueue,
  } = usePersistentSession();

  // Determine if we have a local queue to show
  const hasLocalQueue = !activeSession && localBoardPath && (localQueue.length > 0 || localCurrentClimbQueueItem);

  // Don't show if no active session AND no local queue
  if (!activeSession && !hasLocalQueue) {
    return null;
  }

  // Don't show on board routes (including setup wizard)
  if (isOnBoardRoute) {
    return null;
  }

  // Determine which mode we're in and get appropriate values
  const isPartyMode = !!activeSession;

  // Get board details and current climb based on mode
  const boardDetails = isPartyMode ? activeSession.boardDetails : localBoardDetails;
  const currentClimb = isPartyMode ? currentClimbQueueItem?.climb : localCurrentClimbQueueItem?.climb;
  const queueLength = isPartyMode ? 0 : localQueue.length; // We don't track queue length for party mode in this context

  // Build navigation URL
  let boardUrl: string;
  if (isPartyMode) {
    const { parsedParams, sessionId } = activeSession;
    boardUrl = boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
      ? `${constructClimbListWithSlugs(
          boardDetails.board_name,
          boardDetails.layout_name,
          boardDetails.size_name,
          boardDetails.size_description,
          boardDetails.set_names,
          parsedParams.angle,
        )}?session=${sessionId}`
      : `${activeSession.boardPath}?session=${sessionId}`;
  } else {
    // Local mode - just navigate to the board path
    boardUrl = localBoardPath || '/';
  }

  const handleNavigateBack = () => {
    router.push(boardUrl);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPartyMode) {
      // For party mode, leave session directly
      deactivateSession();
    } else {
      // For local mode, show confirmation
      setShowClearConfirmation(true);
    }
  };

  const handleConfirmClear = () => {
    clearLocalQueue();
    setShowClearConfirmation(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirmation(false);
  };

  const connectionStatus = isConnecting ? 'connecting' : hasConnected ? 'connected' : 'disconnected';
  const statusColor = connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'orange' : 'red';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        {/* Session info card */}
        <div
          onClick={handleNavigateBack}
          style={{
            background: 'var(--ant-color-bg-elevated, #1f1f1f)',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            border: '1px solid var(--ant-color-border, #303030)',
            maxWidth: 200,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          }}
        >
          {/* Header with close button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            {isPartyMode ? (
              <Tooltip title={`${users.length} user${users.length !== 1 ? 's' : ''} connected`}>
                <Badge
                  count={users.length}
                  size="small"
                  style={{ backgroundColor: statusColor }}
                >
                  <TeamOutlined style={{ fontSize: 16, color: 'var(--ant-color-text-secondary)' }} />
                </Badge>
              </Tooltip>
            ) : (
              <Tooltip title={`${queueLength} climb${queueLength !== 1 ? 's' : ''} in queue`}>
                <Badge
                  count={queueLength}
                  size="small"
                  style={{ backgroundColor: 'var(--ant-color-primary)' }}
                >
                  <UnorderedListOutlined style={{ fontSize: 16, color: 'var(--ant-color-text-secondary)' }} />
                </Badge>
              </Tooltip>
            )}
            <Tooltip title={isPartyMode ? 'Leave session' : 'Clear queue'}>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleClose}
                style={{ color: 'var(--ant-color-text-secondary)' }}
              />
            </Tooltip>
          </div>

          {/* Board thumbnail */}
          {boardDetails && (
            <div
              style={{
                width: 120,
                height: 'auto',
                marginBottom: 8,
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--ant-color-bg-container, #141414)',
              }}
            >
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHoldsMap={currentClimb?.litUpHoldsMap}
                mirrored={!!currentClimb?.mirrored}
                thumbnail
              />
            </div>
          )}

          {/* Climb name */}
          <Text
            style={{
              fontSize: 12,
              color: 'var(--ant-color-text)',
              display: 'block',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {currentClimb?.name || 'No climb selected'}
          </Text>

          {/* Tap to return hint */}
          <Text
            type="secondary"
            style={{
              fontSize: 10,
              display: 'block',
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            Tap to return
          </Text>
        </div>
      </div>

      {/* Confirmation modal for clearing local queue */}
      <Modal
        title="Clear queue?"
        open={showClearConfirmation}
        onOk={handleConfirmClear}
        onCancel={handleCancelClear}
        okText="Clear"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to clear your queue? This will remove all {queueLength} climb{queueLength !== 1 ? 's' : ''} from your queue.</p>
      </Modal>
    </>
  );
};

export default FloatingSessionThumbnail;

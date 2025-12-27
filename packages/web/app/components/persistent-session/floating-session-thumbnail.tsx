'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Tooltip, Typography } from 'antd';
import { CloseOutlined, TeamOutlined } from '@ant-design/icons';
import { usePersistentSession, useIsOnBoardRoute } from './persistent-session-context';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';

const { Text } = Typography;

const FloatingSessionThumbnail: React.FC = () => {
  const router = useRouter();
  const isOnBoardRoute = useIsOnBoardRoute();
  const {
    activeSession,
    currentClimbQueueItem,
    users,
    hasConnected,
    isConnecting,
    deactivateSession,
  } = usePersistentSession();

  // Don't show if no active session
  if (!activeSession) {
    return null;
  }

  // Don't show on board routes (including setup wizard)
  if (isOnBoardRoute) {
    return null;
  }

  const { boardDetails, parsedParams, sessionId } = activeSession;
  const currentClimb = currentClimbQueueItem?.climb;

  // Construct the URL to navigate back to the board
  const boardUrl = boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
    ? `${constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.size_description,
        boardDetails.set_names,
        parsedParams.angle,
      )}?session=${sessionId}`
    : `${activeSession.boardPath}?session=${sessionId}`;

  const handleNavigateBack = () => {
    router.push(boardUrl);
  };

  const handleLeaveSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    deactivateSession();
  };

  const connectionStatus = isConnecting ? 'connecting' : hasConnected ? 'connected' : 'disconnected';
  const statusColor = connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'orange' : 'red';

  return (
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
          <Tooltip title={`${users.length} user${users.length !== 1 ? 's' : ''} connected`}>
            <Badge
              count={users.length}
              size="small"
              style={{ backgroundColor: statusColor }}
            >
              <TeamOutlined style={{ fontSize: 16, color: 'var(--ant-color-text-secondary)' }} />
            </Badge>
          </Tooltip>
          <Tooltip title="Leave session">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleLeaveSession}
              style={{ color: 'var(--ant-color-text-secondary)' }}
            />
          </Tooltip>
        </div>

        {/* Board thumbnail */}
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
  );
};

export default FloatingSessionThumbnail;

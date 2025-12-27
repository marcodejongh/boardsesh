'use client';
import React, { useState } from 'react';
import { Button, Row, Col, Card, Drawer, Space, Popconfirm } from 'antd';
import { SyncOutlined, DeleteOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { useQueueContext } from '../graphql-queue';
import NextClimbButton from './next-climb-button';
import { usePathname } from 'next/navigation';
import PreviousClimbButton from './previous-climb-button';
import { BoardName, BoardDetails, Angle } from '@/app/lib/types';
import QueueList from './queue-list';
import { TickButton } from '../logbook/tick-button';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import ClimbTitle from '../climb-card/climb-title';
import { AscentStatus } from './queue-list-item';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './queue-control-bar.module.css';

export interface QueueControlBar {
  boardDetails: BoardDetails;
  board: BoardName;
  angle: Angle;
}

const QueueControlBar: React.FC<QueueControlBar> = ({ boardDetails, angle }: QueueControlBar) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const pathname = usePathname();

  const isViewPage = pathname.includes('/view/');
  const isListPage = pathname.includes('/list');
  const { currentClimb, mirrorClimb, queue, setQueue, isLeader, isSessionActive } = useQueueContext();

  const handleClearQueue = () => {
    setQueue([]);
    track('Queue Cleared', {
      boardLayout: boardDetails.layout_name || '',
      itemsCleared: queue.length,
    });
  };

  const toggleQueueDrawer = () => {
    // Don't open drawer on desktop when on list page (queue is in sidebar)
    if (isListPage && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const newState = !isQueueOpen;
    setIsQueueOpen(newState);
    track('Queue Drawer Toggled', {
      action: newState ? 'opened' : 'closed',
      boardLayout: boardDetails.layout_name || '',
    });
  };

  return (
    <div className="queue-bar-shadow" style={{ flexShrink: 0, width: '100%', backgroundColor: '#fff' }}>
      {/* Main Control Bar */}
      <Card
        bordered={false}
        styles={{
          body: {
            padding: '4px 12px 0px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        }}
        style={{
          width: '100%',
          borderRadius: 0,
          margin: 0,
          borderTop: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
          <Col xs={4}>
            {/* Board preview */}
            <div style={boardPreviewContainerStyle}>
              <ClimbThumbnail
                boardDetails={boardDetails}
                currentClimb={currentClimb}
                enableNavigation={true}
                onNavigate={() => setIsQueueOpen(false)}
              />
            </div>
          </Col>

          {/* Clickable main body for opening the queue */}
          <Col xs={11} style={{ textAlign: 'center' }}>
            <div onClick={toggleQueueDrawer} className={`${styles.queueToggle} ${isListPage ? styles.listPage : ''}`}>
              <ClimbTitle
                climb={currentClimb}
                showAngle
                centered
                nameAddon={currentClimb?.name && <AscentStatus climbUuid={currentClimb.uuid} />}
              />
            </div>
          </Col>

          {/* Button cluster */}
          <Col xs={9} style={{ textAlign: 'right' }}>
            <Space>
              {boardDetails.supportsMirroring ? (
                <Button
                  id="button-mirror"
                  onClick={() => {
                    mirrorClimb();
                    track('Mirror Climb Toggled', {
                      boardLayout: boardDetails.layout_name || '',
                      mirrored: !currentClimb?.mirrored,
                    });
                  }}
                  type={currentClimb?.mirrored ? 'primary' : 'default'}
                  style={
                    currentClimb?.mirrored
                      ? { backgroundColor: themeTokens.colors.purple, borderColor: themeTokens.colors.purple }
                      : undefined
                  }
                  icon={<SyncOutlined />}
                />
              ) : null}
              <PreviousClimbButton navigate={isViewPage} boardDetails={boardDetails} />
              <NextClimbButton navigate={isViewPage} boardDetails={boardDetails} />
              <TickButton currentClimb={currentClimb} angle={angle} boardDetails={boardDetails} />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Drawer for showing the queue */}
      <Drawer
        title="Queue"
        placement="bottom"
        height="70%" // Adjust as per design preference
        open={isQueueOpen}
        onClose={toggleQueueDrawer}
        styles={{ body: { padding: 0 } }}
        extra={
          queue.length > 0 && (!isSessionActive || isLeader) && (
            <Popconfirm
              title="Clear queue"
              description="Are you sure you want to clear all items from the queue?"
              onConfirm={handleClearQueue}
              okText="Clear"
              cancelText="Cancel"
            >
              <Button type="text" icon={<DeleteOutlined />} style={{ color: themeTokens.neutral[400] }}>
                Clear
              </Button>
            </Popconfirm>
          )
        }
      >
        <QueueList boardDetails={boardDetails} onClimbNavigate={() => setIsQueueOpen(false)} />
      </Drawer>
    </div>
  );
};

const boardPreviewContainerStyle = {
  width: '100%', // Using 100% width for flexibility
  height: 'auto', // Auto height to maintain aspect ratio
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
};

export default QueueControlBar;

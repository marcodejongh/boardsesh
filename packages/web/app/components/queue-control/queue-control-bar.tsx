'use client';
import React, { useState } from 'react';
import { Button, Typography, Row, Col, Card, Drawer, Space } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { useQueueContext } from '../graphql-queue';
import NextClimbButton from './next-climb-button';
import { usePathname } from 'next/navigation';
import PreviousClimbButton from './previous-climb-button';
import { BoardName, BoardDetails, Angle } from '@/app/lib/types';
import QueueList from './queue-list';
import { TickButton } from '../logbook/tick-button';
import ClimbThumbnail from '../climb-card/climb-thumbnail';
import { AscentStatus } from './queue-list-item';
import { CopyrightOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './queue-control-bar.module.css';

const { Title, Text } = Typography;

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
  const { currentClimb, mirrorClimb } = useQueueContext();

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
    <div style={{ flexShrink: 0, width: '100%' }}>
      {/* Main Control Bar */}
      <Card
        bordered={false}
        styles={{
          body: {
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        }}
        style={{
          width: '100%',
          boxShadow: themeTokens.shadows.lg,
          borderRadius: 0,
          margin: 0,
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Title
                  level={5}
                  style={{
                    marginBottom: 0,
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentClimb && currentClimb.name ? currentClimb.name : 'No climb selected'}
                </Title>
                {currentClimb && currentClimb.name && <AscentStatus climbUuid={currentClimb.uuid} />}
              </div>
              <Text
                style={{
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentClimb ? (
                  <>
                    {currentClimb.difficulty && currentClimb.quality_average ? (
                      `${currentClimb.difficulty} ${currentClimb.quality_average}★ @ ${currentClimb.angle}°`
                    ) : (
                      <span style={{ fontWeight: 400, fontStyle: 'italic' }}>project @ {currentClimb.angle}°</span>
                    )}
                    {currentClimb.benchmark_difficulty && <CopyrightOutlined style={{ marginLeft: 4 }} />}
                  </>
                ) : null}
              </Text>
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

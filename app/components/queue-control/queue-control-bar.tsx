'use client';
import React, { useState } from 'react';
import { Button, Typography, Row, Col, Card, Drawer, Space } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useQueueContext } from './queue-context';
import NextClimbButton from './next-climb-button';
import { usePathname } from 'next/navigation';
import PreviousClimbButton from './previous-climb-button';
import { BoardName, BoardDetails, Angle } from '@/app/lib/types';
import QueueList from './queue-list';
import { TickButton } from './tick-button';
import ClimbThumbnail from '../climb-card/climb-thumbnail';

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
  const { currentClimb, mirrorClimb } = useQueueContext();

  const toggleQueueDrawer = () => setIsQueueOpen(!isQueueOpen);

  return (
    <>
      {/* Main Control Bar */}
      <Card
        bodyStyle={{
          padding: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        style={{
          width: '100%',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', // Add subtle shadow for separation
        }}
      >
        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
          <Col xs={4}>
            {/* Board preview */}
            <div style={boardPreviewContainerStyle}>
              <ClimbThumbnail boardDetails={boardDetails} currentClimb={currentClimb} />
            </div>
          </Col>

          {/* Clickable main body for opening the queue */}
          <Col xs={10} style={{ textAlign: 'center' }}>
            <div onClick={toggleQueueDrawer} style={{ cursor: 'pointer' }}>
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
              <Text
                style={{
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentClimb
                  ? `${currentClimb.difficulty} ${currentClimb.quality_average}★ @ ${currentClimb.angle}°`
                  : 'No climb selected'}
              </Text>
            </div>
          </Col>

          {/* Button cluster */}
          <Col xs={10} style={{ textAlign: 'right' }}>
            <Space>
              {boardDetails.board_name === 'tension' ? (
                <Button id="button-mirror" onClick={mirrorClimb} type="default" icon={<SyncOutlined />} />
              ) : null}
              <PreviousClimbButton navigate={isViewPage} />
              <NextClimbButton navigate={isViewPage} />
              <TickButton currentClimb={currentClimb} angle={angle} />
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
        <QueueList boardDetails={boardDetails} />
      </Drawer>
    </>
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

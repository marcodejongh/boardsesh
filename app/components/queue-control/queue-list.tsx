'use client';
import React from 'react';
import { List, Row, Col, Typography, Divider } from 'antd';
import { Climb, BoardDetails } from '@/app/lib/types';
import { ClimbQueueItem, useQueueContext } from './queue-context';
import ClimbThumbnail from '../climb-card/climb-thumbnail';

const { Text } = Typography;

type QueueListProps = {
  boardDetails: BoardDetails;
};

const QueueList: React.FC<QueueListProps> = ({ boardDetails }) => {
  const { currentClimbQueueItem, queue, climbSearchResults, setCurrentClimbQueueItem, setCurrentClimb } = useQueueContext(); // Include climbSearchResults from context

  return (
    <>
      {/* Render Queue Items */}
      <List
        dataSource={queue} // Assuming `queue` is an array of ClimbQueueItem
        renderItem={(climbQueueItem: ClimbQueueItem) => {
          const { uuid, climb } = climbQueueItem;
          const isCurrent = currentClimbQueueItem?.uuid === uuid;
          const isHistory =
            queue.findIndex((item) => item.uuid === currentClimbQueueItem?.uuid) >
            queue.findIndex((item) => item.uuid === uuid);

          return (
            <List.Item
              style={{
                backgroundColor: isCurrent ? '#eeffff' : isHistory ? '#f5f5f5' : 'inherit', // Blue for current, grey for history
                opacity: isHistory ? 0.6 : 1, 
                cursor: 'pointer'
              }}
              onClick={() => setCurrentClimbQueueItem(climbQueueItem)}
            >
              <Row style={{ width: '100%' }} gutter={16}>
                {/* Column for the BoardPreview */}
                <Col xs={6}>
                  <ClimbThumbnail boardDetails={boardDetails} currentClimb={climb} />
                </Col>

                {/* Column for the metadata */}
                <Col xs={18}>
                  <List.Item.Meta
                    title={
                      <Text
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 'bold',
                        }}
                      >
                        {climb.name}
                      </Text>
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
                        {`${climb.difficulty} ${climb.quality_average}★`}
                      </Text>
                    }
                  />
                </Col>
              </Row>
            </List.Item>
          );
        }}
      />

      {/* Divider between queue and suggestions */}
      <Divider>Suggested Items</Divider>

      {/* Render Suggested Items (climbSearchResults) */}
      <List
        dataSource={(climbSearchResults || []).filter((item) => !queue.find(({ climb: { uuid }}) => item.uuid === uuid ) )} 
        renderItem={(climb: Climb) => (
          <List.Item style={{ cursor: 'pointer' }} onClick={() => { setCurrentClimb(climb) }}>
            <Row style={{ width: '100%' }} gutter={16}>
              {/* Column for the BoardPreview */}
              <Col xs={6}>
                <ClimbThumbnail boardDetails={boardDetails} currentClimb={climb} />
              </Col>

              {/* Column for the metadata */}
              <Col xs={18}>
                <List.Item.Meta
                  title={
                    <Text
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {climb.name}
                    </Text>
                  }
                  description={
                    <Text
                      type="secondary"
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {`${climb.difficulty} ${climb.quality_average}★`}
                    </Text>
                  }
                />
              </Col>
            </Row>
          </List.Item>
        )}
      />
    </>
  );
};

export default QueueList;

'use client';
import React from 'react';
import { List, Row, Col, Typography, Divider } from 'antd';
import { BoardName, BoulderProblem, BoardDetails } from '@/app/lib/types';
import { BoardPreview } from './history-control-bar';
import { ClimbQueueItem, useQueueContext } from './queue-context';

const { Text } = Typography;

type QueueListProps = {
  board: BoardName;
  boardDetails: BoardDetails;
};

const QueueList: React.FC<QueueListProps> = ({ board, boardDetails }) => {
  const { currentClimbQueueItem, queue, climbSearchResults } = useQueueContext(); // Include climbSearchResults from context
  
  const currentItemPositionInSearchResults = (climbSearchResults || []).findIndex(
    ({ uuid }) => uuid === currentClimbQueueItem?.climb.uuid,
  );

  return (
    <>
      {/* Render Queue Items */}
      <List
        dataSource={queue} // Assuming `queue` is an array of ClimbQueueItem
        renderItem={({ uuid, climb }: ClimbQueueItem) => {
          const isCurrent = currentClimbQueueItem?.uuid === uuid;
          const isHistory =
            queue.findIndex((item) => item.uuid === currentClimbQueueItem?.uuid) >
            queue.findIndex((item) => item.uuid === uuid);

          return (
            <List.Item
              style={{
                backgroundColor: isCurrent ? '#eeffff' : isHistory ? '#f5f5f5' : 'inherit', // Blue for current, grey for history
                opacity: isHistory ? 0.6 : 1, // Slightly reduce opacity for historical items
              }}
            >
              <Row style={{ width: '100%' }} gutter={16}>
                {/* Column for the BoardPreview */}
                <Col xs={6}>
                  <BoardPreview boardDetails={boardDetails} board={board} currentClimb={climb} />
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
        dataSource={(climbSearchResults || []).filter((item, index) => 
          index > currentItemPositionInSearchResults
        )} // Assuming climbSearchResults contains BoulderProblems
        renderItem={(climb: BoulderProblem) => (
          <List.Item>
            <Row style={{ width: '100%' }} gutter={16}>
              {/* Column for the BoardPreview */}
              <Col xs={6}>
                <BoardPreview boardDetails={boardDetails} board={board} currentClimb={climb} />
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

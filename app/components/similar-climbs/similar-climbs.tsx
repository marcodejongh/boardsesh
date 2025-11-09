'use client';

import React from 'react';
import { Collapse, Row, Col, Typography, Empty } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import ClimbCard from '../climb-card/climb-card';
import { SimilarClimb } from '@/app/lib/db/queries/climbs/similar-climbs';
import { PlusCircleOutlined, FireOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Text } = Typography;

interface SimilarClimbsProps {
  boardDetails: BoardDetails;
  similarClimbs: SimilarClimb[];
  currentClimbName?: string;
}

const SimilarClimbs: React.FC<SimilarClimbsProps> = ({ boardDetails, similarClimbs, currentClimbName }) => {
  return (
    <Collapse defaultActiveKey={['similar-climbs']} style={{ marginBottom: 16 }}>
      <Panel
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span>Similar Climbs</span>
            {similarClimbs.length > 0 && <Text type="secondary">({similarClimbs.length})</Text>}
          </div>
        }
        key="similar-climbs"
      >
        {similarClimbs.length === 0 ? (
          <Empty
            description="No similar climbs found. Similar climbs are versions of this climb that use all the same holds plus additional holds."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                These climbs use all the holds from{' '}
                <Text strong>{currentClimbName || 'this climb'}</Text> plus additional holds.
                They may be versions created for larger board sizes.
              </Text>
            </div>
            <Row gutter={[16, 16]}>
              {similarClimbs.map((climb) => (
                <Col xs={24} sm={12} md={8} lg={6} key={climb.uuid}>
                  <ClimbCard
                    climb={climb}
                    boardDetails={boardDetails}
                    actions={[<PlusCircleOutlined key="plus" />, <FireOutlined key="fire" />]}
                  />
                </Col>
              ))}
            </Row>
          </>
        )}
      </Panel>
    </Collapse>
  );
};

export default SimilarClimbs;

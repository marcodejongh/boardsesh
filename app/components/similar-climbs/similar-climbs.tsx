'use client';

import React, { useState, useEffect } from 'react';
import { Collapse, Row, Col, Typography, Empty, Spin } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { BoardDetails, ParsedBoardRouteParametersWithUuid } from '@/app/lib/types';
import ClimbCard from '../climb-card/climb-card';
import { SimilarClimb } from '@/app/lib/db/queries/climbs/similar-climbs';
import { PlusCircleOutlined, FireOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Text } = Typography;

interface SimilarClimbsProps {
  boardDetails: BoardDetails;
  params: ParsedBoardRouteParametersWithUuid;
  currentClimbName?: string;
}

const SimilarClimbs: React.FC<SimilarClimbsProps> = ({ boardDetails, params, currentClimbName }) => {
  const [similarClimbs, setSimilarClimbs] = useState<SimilarClimb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Only fetch when the panel is expanded and we haven't fetched yet
    if (isExpanded && similarClimbs.length === 0 && !loading) {
      fetchSimilarClimbs();
    }
  }, [isExpanded]);

  const fetchSimilarClimbs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        board_name: params.board_name,
        layout_id: params.layout_id.toString(),
        size_id: params.size_id.toString(),
        set_ids: params.set_ids.join(','),
        angle: params.angle.toString(),
        climb_uuid: params.climb_uuid,
      });

      const response = await fetch(`/api/internal/similar-climbs?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch similar climbs');
      }

      const data = await response.json();
      setSimilarClimbs(data.climbs || []);
    } catch (err) {
      console.error('Error fetching similar climbs:', err);
      setError('Failed to load similar climbs');
    } finally {
      setLoading(false);
    }
  };

  const handleCollapseChange = (key: string | string[]) => {
    setIsExpanded(Array.isArray(key) ? key.length > 0 : !!key);
  };

  return (
    <Collapse onChange={handleCollapseChange} style={{ marginBottom: 16 }}>
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : similarClimbs.length === 0 ? (
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

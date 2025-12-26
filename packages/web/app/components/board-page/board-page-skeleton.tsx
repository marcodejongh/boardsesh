import React from 'react';
import { Row, Col, Skeleton, Card } from 'antd';

/**
 * Skeleton loading UI for the board page, matching the ClimbsList grid layout.
 * Used as a fallback for Suspense boundaries.
 */
const ClimbCardSkeleton = () => (
  <Card
    size="small"
    styles={{ header: { paddingTop: 8, paddingBottom: 6 }, body: { padding: 6 } }}
    title={<Skeleton.Input active size="small" style={{ width: 200 }} />}
  >
    <Skeleton.Image active style={{ width: '100%', height: 200 }} />
  </Card>
);

const BoardPageSkeleton = () => {
  return (
    <Row gutter={[8, 8]}>
      {Array.from({ length: 10 }, (_, i) => (
        <Col xs={24} lg={12} xl={12} key={i}>
          <ClimbCardSkeleton />
        </Col>
      ))}
    </Row>
  );
};

export default BoardPageSkeleton;

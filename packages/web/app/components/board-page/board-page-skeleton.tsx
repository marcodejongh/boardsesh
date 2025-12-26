'use client';

import React from 'react';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import Flex from 'antd/es/flex';
import Card from 'antd/es/card';
import Skeleton from 'antd/es/skeleton';
import { InfoCircleOutlined, ForkOutlined, HeartOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';

/**
 * Skeleton that mimics the ClimbCard title structure (horizontal layout with V grade)
 */
const ClimbCardTitleSkeleton = () => (
  <Flex gap={12} align="center">
    {/* Left side: Name and info stacked */}
    <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Skeleton.Input active size="small" style={{ width: '60%', minWidth: 80 }} />
      <Skeleton.Input active size="small" style={{ width: '80%', minWidth: 100, height: 14 }} />
    </Flex>
    {/* Right side: V grade placeholder */}
    <Skeleton.Avatar active shape="square" size={32} />
  </Flex>
);

/**
 * Skeleton that mimics the BoardRenderer - square placeholder for the board image
 */
const BoardRendererSkeleton = () => (
  <Skeleton.Node
    active
    style={{
      width: '100%',
      height: 0,
      paddingBottom: '110%', // Matches aspectRatio 1/1.1
    }}
  >
    <span />
  </Skeleton.Node>
);

/**
 * Skeleton loading UI for ClimbCard, matching the card structure with muted action icons.
 */
const ClimbCardSkeleton = () => (
  <Card
    size="small"
    style={{
      backgroundColor: themeTokens.semantic.surface,
    }}
    styles={{
      header: { paddingTop: 8, paddingBottom: 6 },
      body: { padding: 6 },
    }}
    title={<ClimbCardTitleSkeleton />}
    actions={[
      <InfoCircleOutlined key="info" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <ForkOutlined key="fork" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <HeartOutlined key="heart" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <PlusCircleOutlined key="plus" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
    ]}
  >
    <BoardRendererSkeleton />
  </Card>
);

/**
 * Skeleton loading UI for the board page, matching the ClimbsList grid layout.
 */
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

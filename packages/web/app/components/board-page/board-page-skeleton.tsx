'use client';

import React from 'react';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import Flex from 'antd/es/flex';
import Card from 'antd/es/card';
import { InfoCircleOutlined, ForkOutlined, HeartOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';

/**
 * Skeleton that mimics the ClimbCard title structure (horizontal layout with V grade)
 */
const ClimbCardTitleSkeleton = () => (
  <Flex gap={12} align="center">
    {/* Left side: Name and info stacked */}
    <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
      {/* Name placeholder */}
      <div
        style={{
          height: 14,
          width: '60%',
          backgroundColor: 'var(--ant-color-fill-secondary)',
          borderRadius: 4,
        }}
      />
      {/* Quality/setter placeholder */}
      <div
        style={{
          height: 12,
          width: '80%',
          backgroundColor: 'var(--ant-color-fill-tertiary)',
          borderRadius: 4,
        }}
      />
    </Flex>
    {/* Right side: V grade placeholder */}
    <div
      style={{
        width: 32,
        height: 32,
        backgroundColor: 'var(--ant-color-fill-secondary)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  </Flex>
);

/**
 * Skeleton that mimics the BoardRenderer - just a placeholder area
 */
const BoardRendererSkeleton = () => (
  <div
    style={{
      width: '100%',
      aspectRatio: '1 / 1.1',
      backgroundColor: 'var(--ant-color-fill-quaternary)',
      borderRadius: 4,
    }}
  />
);

/**
 * Skeleton loading UI for the board page, matching the ClimbsList grid layout.
 * Uses the same Card structure as ClimbCard with muted action icons.
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

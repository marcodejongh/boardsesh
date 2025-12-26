'use client';

import React from 'react';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import Flex from 'antd/es/flex';
import Card from 'antd/es/card';
import { themeTokens } from '@/app/theme/theme-config';

/**
 * Skeleton that mimics the ClimbCard title structure (horizontal layout with V grade)
 */
const ClimbCardTitleSkeleton = () => (
  <Flex gap={12} align="center">
    {/* Left side: Name and info stacked */}
    <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
      {/* Name placeholder */}
      <div
        style={{
          height: 16,
          width: '70%',
          backgroundColor: 'var(--ant-color-fill-tertiary)',
          borderRadius: 4,
        }}
      />
      {/* Quality/setter placeholder */}
      <div
        style={{
          height: 12,
          width: '50%',
          backgroundColor: 'var(--ant-color-fill-quaternary)',
          borderRadius: 4,
        }}
      />
    </Flex>
    {/* Right side: V grade placeholder */}
    <div
      style={{
        width: 36,
        height: 36,
        backgroundColor: 'var(--ant-color-fill-tertiary)',
        borderRadius: 6,
      }}
    />
  </Flex>
);

/**
 * Skeleton that mimics the BoardRenderer with board background and hold circles
 */
const BoardRendererSkeleton = () => (
  <div
    style={{
      width: '100%',
      aspectRatio: '1 / 1.2',
      backgroundColor: 'var(--ant-color-fill-quaternary)',
      borderRadius: 4,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Simulated hold circles scattered on the board */}
    {[
      { top: '15%', left: '30%', size: 16 },
      { top: '25%', left: '60%', size: 14 },
      { top: '35%', left: '45%', size: 18 },
      { top: '45%', left: '25%', size: 14 },
      { top: '55%', left: '70%', size: 16 },
      { top: '65%', left: '40%', size: 14 },
      { top: '75%', left: '55%', size: 18 },
      { top: '85%', left: '35%', size: 16 },
    ].map((hold, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: hold.top,
          left: hold.left,
          width: hold.size,
          height: hold.size,
          borderRadius: '50%',
          border: '3px solid var(--ant-color-fill-secondary)',
          opacity: 0.6,
        }}
      />
    ))}
  </div>
);

/**
 * Card action button placeholders
 */
const CardActionsSkeleton = () => (
  <Flex justify="space-around" style={{ padding: '8px 0' }}>
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        style={{
          width: 20,
          height: 20,
          backgroundColor: 'var(--ant-color-fill-tertiary)',
          borderRadius: 4,
        }}
      />
    ))}
  </Flex>
);

/**
 * Skeleton loading UI for the board page, matching the ClimbsList grid layout.
 * Used as a fallback for Suspense boundaries.
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
      actions: { borderTop: '1px solid var(--ant-color-border-secondary)' },
    }}
    title={<ClimbCardTitleSkeleton />}
    actions={[<CardActionsSkeleton key="actions" />]}
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

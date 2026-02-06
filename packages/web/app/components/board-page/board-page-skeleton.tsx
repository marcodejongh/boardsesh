'use client';

import React from 'react';
import Flex from 'antd/es/flex';
import Card from 'antd/es/card';
import Skeleton from 'antd/es/skeleton';
import { InfoCircleOutlined, ForkOutlined, HeartOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './board-page-skeleton.module.css';

type BoardPageSkeletonProps = {
  aspectRatio?: number; // width/height ratio from boardDetails
};

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
 * Skeleton that mimics the BoardRenderer - placeholder for the board image.
 * Uses the actual board's aspect ratio to prevent layout shift when content loads.
 */
const BoardRendererSkeleton = ({ aspectRatio }: { aspectRatio?: number }) => (
  <Skeleton.Node
    active
    style={{
      width: '100%',
      minHeight: '40vh',
      aspectRatio: aspectRatio ? `${aspectRatio}` : '1 / 1.1',
    }}
  >
    <span />
  </Skeleton.Node>
);

/**
 * Skeleton loading UI for ClimbCard, matching the card structure with muted action icons.
 */
const ClimbCardSkeleton = ({ aspectRatio }: { aspectRatio?: number }) => (
  <Card
    size="small"
    style={{
      backgroundColor: themeTokens.semantic.surface,
    }}
    styles={{
      header: { paddingTop: 8, paddingBottom: 6 },
      body: { padding: 6, display: 'flex', justifyContent: 'center' },
    }}
    title={<ClimbCardTitleSkeleton />}
    actions={[
      <InfoCircleOutlined key="info" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <ForkOutlined key="fork" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <HeartOutlined key="heart" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
      <PlusCircleOutlined key="plus" style={{ color: 'var(--ant-color-text-quaternary)' }} />,
    ]}
  >
    <BoardRendererSkeleton aspectRatio={aspectRatio} />
  </Card>
);

/**
 * Skeleton that mimics the ClimbListItem layout (~60px rows with thumbnail, text, and grade).
 */
const ClimbListItemSkeleton = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: `${themeTokens.spacing[2]}px ${themeTokens.spacing[3]}px`,
      gap: themeTokens.spacing[3],
      backgroundColor: themeTokens.semantic.surface,
      borderBottom: `1px solid ${themeTokens.neutral[200]}`,
      borderLeft: '3px solid transparent',
    }}
  >
    {/* Thumbnail placeholder */}
    <Skeleton.Avatar active shape="square" size={48} style={{ flexShrink: 0 }} />

    {/* Center: Name and setter lines */}
    <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Skeleton.Input active size="small" style={{ width: '55%', minWidth: 80, height: 16 }} />
      <Skeleton.Input active size="small" style={{ width: '35%', minWidth: 60, height: 12 }} />
    </Flex>

    {/* Right: Grade placeholder */}
    <Skeleton.Input active size="small" style={{ width: 32, minWidth: 32, height: 24, flexShrink: 0 }} />

    {/* Ellipsis dot placeholder */}
    <Skeleton.Avatar active shape="circle" size={16} style={{ flexShrink: 0 }} />
  </div>
);

/**
 * Skeleton loading UI for the board page.
 * Defaults to list mode skeletons since SSR default is 'list'.
 * Includes a sidebar placeholder on desktop (min-width: 768px) to prevent layout shift.
 */
const BoardPageSkeleton = (_props: BoardPageSkeletonProps) => {
  return (
    <>
      {/* Main content - always visible, defaults to list mode (SSR default) */}
      <div className={styles.skeletonMain}>
        {Array.from({ length: 10 }, (_, i) => (
          <ClimbListItemSkeleton key={i} />
        ))}
      </div>

      {/* Sidebar placeholder - only visible on desktop via CSS to reserve space */}
      <div className={styles.skeletonSider} />
    </>
  );
};

export default BoardPageSkeleton;
export { ClimbCardSkeleton, ClimbListItemSkeleton };

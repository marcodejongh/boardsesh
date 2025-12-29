'use client';

import React from 'react';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import Flex from 'antd/es/flex';
import Card from 'antd/es/card';
import Skeleton from 'antd/es/skeleton';
import Layout from 'antd/es/layout';
import Tabs from 'antd/es/tabs';
import Divider from 'antd/es/divider';
import { InfoCircleOutlined, ForkOutlined, HeartOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './board-page-skeleton.module.css';

const { Sider } = Layout;

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
    <BoardRendererSkeleton aspectRatio={aspectRatio} />
  </Card>
);

/**
 * Skeleton that mimics the BasicSearchForm structure.
 */
const SearchFormSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    {/* Search Section */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Climb Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton.Input active size="small" style={{ width: 80 }} />
        <Skeleton.Input active style={{ width: '100%' }} />
      </div>

      {/* Grade Range */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton.Input active size="small" style={{ width: 90 }} />
        <Row gutter={8}>
          <Col span={12}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
          <Col span={12}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </Col>
        </Row>
      </div>

      {/* Setter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton.Input active size="small" style={{ width: 50 }} />
        <Skeleton.Input active style={{ width: '100%' }} />
      </div>
    </div>

    <Divider style={{ margin: '16px 0' }} />

    {/* Quality Filters Section */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton.Input active size="small" style={{ width: 100 }} />
      <Row gutter={[12, 12]}>
        <Col span={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton.Input active size="small" style={{ width: 80 }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
        </Col>
        <Col span={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton.Input active size="small" style={{ width: 70 }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
        </Col>
      </Row>

      {/* Switches */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
          padding: '4px 0',
          marginTop: 8,
        }}
      >
        {[1, 2].map((i) => (
          <Flex key={i} justify="space-between" align="center" style={{ padding: '10px 12px' }}>
            <Skeleton.Input active size="small" style={{ width: 100 }} />
            <Skeleton.Button active size="small" style={{ width: 40, minWidth: 40 }} />
          </Flex>
        ))}
      </div>
    </div>

    <Divider style={{ margin: '16px 0' }} />

    {/* Sort Section */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Skeleton.Input active size="small" style={{ width: 60 }} />
      <Row gutter={8}>
        <Col span={14}>
          <Skeleton.Input active style={{ width: '100%' }} />
        </Col>
        <Col span={10}>
          <Skeleton.Input active style={{ width: '100%' }} />
        </Col>
      </Row>
    </div>

    <Divider style={{ margin: '16px 0' }} />

    {/* Personal Progress Section */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton.Input active size="small" style={{ width: 130 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
          padding: '4px 0',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Flex key={i} justify="space-between" align="center" style={{ padding: '10px 12px' }}>
            <Skeleton.Input active size="small" style={{ width: 100 }} />
            <Skeleton.Button active size="small" style={{ width: 40, minWidth: 40 }} />
          </Flex>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton for the search results footer.
 */
const SearchFooterSkeleton = () => (
  <div
    style={{
      padding: '12px 16px',
      background: 'linear-gradient(to top, #FFFFFF, #F9FAFB)',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <Skeleton.Input active size="small" style={{ width: 100 }} />
    <Skeleton.Button active size="small" style={{ width: 60 }} />
  </div>
);

/**
 * Skeleton for the desktop sidebar with tabs.
 */
const SidebarSkeleton = () => {
  const tabItems = [
    { key: 'queue', label: 'Queue' },
    { key: 'search', label: 'Search' },
    { key: 'holds', label: 'Search by Hold' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        defaultActiveKey="search"
        items={tabItems.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: null,
        }))}
        style={{ padding: '0 16px' }}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px 16px' }}>
        <SearchFormSkeleton />
      </div>
      <SearchFooterSkeleton />
    </div>
  );
};

/**
 * Skeleton for the main climb cards grid.
 */
const ClimbCardsGridSkeleton = ({ aspectRatio }: { aspectRatio?: number }) => (
  <Row gutter={[8, 8]}>
    {Array.from({ length: 10 }, (_, i) => (
      <Col xs={24} lg={12} xl={12} key={i}>
        <ClimbCardSkeleton aspectRatio={aspectRatio} />
      </Col>
    ))}
  </Row>
);

/**
 * Skeleton loading UI for the board page, matching the ClimbsList grid layout.
 * Accepts an optional aspectRatio to match the actual board dimensions.
 * Includes a sidebar skeleton on desktop (min-width: 768px).
 */
const BoardPageSkeleton = ({ aspectRatio }: BoardPageSkeletonProps) => {
  return (
    <>
      {/* Main content - always visible */}
      <div className={styles.skeletonMain}>
        <ClimbCardsGridSkeleton aspectRatio={aspectRatio} />
      </div>

      {/* Sidebar - only visible on desktop via CSS */}
      <div className={styles.skeletonSider}>
        <Sider width={400} theme="light" className={styles.sider} style={{ padding: '0 8px 20px 8px' }}>
          <SidebarSkeleton />
        </Sider>
      </div>
    </>
  );
};

export default BoardPageSkeleton;

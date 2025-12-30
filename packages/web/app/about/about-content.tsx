'use client';

import React from 'react';
import { Layout, Card, Typography, Space, Alert } from 'antd';
import {
  GithubOutlined,
  WarningOutlined,
  LockOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { Header } from 'antd/es/layout/layout';
import styles from './about.module.css';

const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography;

export default function AboutContent() {
  return (
    <Layout className={styles.pageLayout}>
      <Header className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Title level={4} className={styles.headerTitle}>
          About
        </Title>
      </Header>

      <Content className={styles.content}>
        <Card>
          <Space direction="vertical" size="large" className={styles.cardContent}>
            {/* Hero Section */}
            <div className={styles.heroSection}>
              <Logo size="lg" linkToHome={false} />
              <Title level={2} className={styles.heroTitle}>
                Why We Built Boardsesh
              </Title>
              <Text type="secondary" className={styles.heroSubtitle}>
                An open source alternative for LED climbing board control
              </Text>
            </div>

            {/* The Problem */}
            <section>
              <Title level={3}>
                <WarningOutlined className={`${styles.sectionIcon} ${styles.warningIcon}`} />
                The Problem
              </Title>
              <Paragraph>
                LED climbing boards like Moonboard, Kilter, Tension, Decoy, and Grasshopper have
                become incredibly popular in the climbing community. These boards represent a
                significant investment—a 7x10 Kilter homewall with mainline holds runs around
                $10,000, plus another $2,000 or so for the LED lighting system.
              </Paragraph>
              <Paragraph>
                Here&apos;s the thing: those climbing holds will work forever. No apps, no
                licensing, no connectivity required. But to use the LED system that makes these
                boards truly interactive, we&apos;re all dependent on Moon Climbing or Aurora
                Climbing. Each company servicing a large part of the market without
                cross-compatibility.
              </Paragraph>

              <Alert
                className={styles.alert}
                type="warning"
                showIcon
                icon={<LockOutlined />}
                message="Single Vendor Risk"
                description="Thousands of dollars worth of climbing equipment relies on software from two small companies. If that software stops working, your expensive LED system becomes unusable."
              />

              <Paragraph className={styles.additionalParagraph}>
                You&apos;re also at the mercy of the whims of the owners of these companies. Not too
                long ago Moon Board tried to block creation of new problems on one of their older
                boards:{' '}
                <Link
                  href="https://www.reddit.com/r/climbing/s/VqKGxWSfDT"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  see this Reddit discussion
                </Link>
                . This was rolled back, but there are no guarantees this won&apos;t happen again.
                Either of these companies could also change owners. What if a future owner wants to
                introduce a subscription model?
              </Paragraph>
            </section>

            {/* Development Stagnation */}
            <section>
              <Title level={3}>
                <ThunderboltOutlined className={`${styles.sectionIcon} ${styles.errorIcon}`} />
                Development Has Stalled
              </Title>
              <Paragraph>
                Instead of spending their time building great app experiences, both companies have
                implemented app attest which blocks external access to the climb data. However, the
                climb data isn&apos;t theirs—it&apos;s the users&apos;.
              </Paragraph>
            </section>

            {/* Our Solution */}
            <section>
              <Title level={3}>
                <TeamOutlined className={`${styles.sectionIcon} ${styles.successIcon}`} />
                Our Solution: Open Source
              </Title>
              <Paragraph>
                Frustrated with the lack of development and anxious about being locked into a single
                vendor, we built Boardsesh—an open source alternative that anyone can use, modify,
                and host themselves.
              </Paragraph>
              <Paragraph>With Boardsesh, you get:</Paragraph>
              <ul className={styles.featureList}>
                <li>
                  <Text strong>Queue management</Text> — Coordinate climbs when training with others
                </li>
                <li>
                  <Text strong>Real-time collaboration</Text> — Share sessions with friends via
                  Party Mode
                </li>
                <li>
                  <Text strong>Active development</Text> — New features and bug fixes from the
                  community
                </li>
                <li>
                  <Text strong>No lock-in</Text> — Self-host if you want complete control
                </li>
                <li>
                  <Text strong>Transparency</Text> — See exactly how your data is used
                </li>
              </ul>
            </section>

            {/* Open Source */}
            <section>
              <Title level={3}>
                <GithubOutlined className={styles.sectionIcon} />
                Open Source
              </Title>
              <Paragraph>
                Boardsesh is completely open source under the Apache license. You can view the code,
                contribute features, report bugs, or fork it entirely to run your own instance.
              </Paragraph>
              <Paragraph>
                <Link
                  href="https://github.com/marcodejongh/boardsesh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </Link>
              </Paragraph>
            </section>

            {/* Collaboration */}
            <section>
              <Title level={3}>
                <HeartOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                Open to Collaboration
              </Title>
              <Paragraph>
                We would welcome collaboration with the official app vendors and would love to
                integrate through more official means. Unfortunately, so far Aurora has been hostile
                to any collaboration attempts.
              </Paragraph>
            </section>

            {/* Call to Action */}
            <section className={styles.callToAction}>
              <Paragraph type="secondary">
                Your expensive climbing board shouldn&apos;t stop working because a single app goes
                down. Together, we can build something better—software that belongs to the climbing
                community.
              </Paragraph>
            </section>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}

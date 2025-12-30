import React from 'react';
import { Metadata } from 'next';
import { Layout, Card, Typography, Divider, Space, Alert } from 'antd';
import {
  GithubOutlined,
  WarningOutlined,
  LockOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import Logo from '@/app/components/brand/logo';
import AboutHeader from './about-header';
import styles from './about.module.css';

const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography;

export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description:
    'Why we built Boardsesh - an open source alternative for LED climbing board control',
};

export default function AboutPage() {
  return (
    <Layout className={styles.pageLayout}>
      <AboutHeader />

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

            <Divider />

            {/* The Problem */}
            <section>
              <Title level={3}>
                <WarningOutlined className={`${styles.sectionIcon} ${styles.warningIcon}`} />
                The Problem
              </Title>
              <Paragraph>
                LED climbing boards like Kilter, Tension, Decoy, and Grasshopper have become
                incredibly popular in the climbing community. These boards represent a significant
                investment—a 7x10 Kilter homewall with mainline holds runs around $15,000 AUD
                ($10,000 USD), plus another $2,000 or so for the LED lighting system.
              </Paragraph>
              <Paragraph>
                Here&apos;s the thing: those climbing holds will work forever. No apps, no
                licensing, no connectivity required. But to use the LED system that makes these
                boards truly interactive, we&apos;re all dependent on{' '}
                <Link href="https://auroraclimbing.com/" target="_blank" rel="noopener noreferrer">
                  Aurora Climbing
                </Link>
                —the company that develops the app and control system for most major board brands.
              </Paragraph>

              <Alert
                className={styles.alert}
                type="warning"
                showIcon
                icon={<LockOutlined />}
                message="Single Vendor Risk"
                description="Thousands of dollars worth of climbing equipment relies on software from a single small company. If that software stops working, your expensive LED system becomes unusable."
              />
            </section>

            <Divider />

            {/* Development Stagnation */}
            <section>
              <Title level={3}>
                <ThunderboltOutlined className={`${styles.sectionIcon} ${styles.errorIcon}`} />
                Development Has Stalled
              </Title>
              <Paragraph>
                The problems with this dependency are already showing. The Aurora app&apos;s last
                feature update was back in September 2023—a filter for side climbs (which,
                ironically, doesn&apos;t work properly). Meanwhile, the community has been asking
                for quality-of-life improvements and bug fixes that never arrive.
              </Paragraph>
              <Paragraph>
                And it&apos;s not just Aurora. Moon Board has already moved to block third-party
                access entirely, locking users into their official app with no alternatives. This
                pattern of vendor lock-in puts every board owner at risk.
              </Paragraph>
            </section>

            <Divider />

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

            <Divider />

            {/* Open Source */}
            <section>
              <Title level={3}>
                <GithubOutlined className={styles.sectionIcon} />
                Open Source
              </Title>
              <Paragraph>
                Boardsesh is completely open source under the MIT license. You can view the code,
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

            <Divider />

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

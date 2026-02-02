'use client';

import React from 'react';
import { Layout, Card, Typography, Space } from 'antd';
import {
  GithubOutlined,
  TeamOutlined,
  HeartOutlined,
  ApiOutlined,
  RocketOutlined,
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
          <Space orientation="vertical" size="large" className={styles.cardContent}>
            {/* Hero Section */}
            <div className={styles.heroSection}>
              <Logo size="lg" linkToHome={false} />
              <Title level={2} className={styles.heroTitle}>
                Track, Train, and Climb Together
              </Title>
              <Text type="secondary" className={styles.heroSubtitle}>
                A centralized hub for all your LED climbing board training
              </Text>
            </div>

            {/* Our Vision */}
            <section>
              <Title level={3}>
                <RocketOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                Our Vision
              </Title>
              <Paragraph>
                LED climbing boards like Kilter, Tension, Moonboard, Decoy, and Grasshopper have
                revolutionized indoor training. We believe the climbing community deserves a
                centralized platform that brings all these boards together—making it easier to
                track progress, train with friends, and get the most out of your board.
              </Paragraph>
              <Paragraph>
                Boardsesh is a unified experience that works across different board types, helping
                you focus on what matters most—climbing.
              </Paragraph>
            </section>

            {/* Features */}
            <section>
              <Title level={3}>
                <TeamOutlined className={`${styles.sectionIcon} ${styles.successIcon}`} />
                What Boardsesh Offers
              </Title>
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
                  <Text strong>Multi-board support</Text> — One app for Kilter, Tension, and more
                </li>
                <li>
                  <Text strong>Active development</Text> — New features and improvements from the
                  community
                </li>
                <li>
                  <Text strong>Self-hosting option</Text> — Run your own instance if you prefer
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

            {/* API Documentation */}
            <section>
              <Title level={3}>
                <ApiOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                API Documentation
              </Title>
              <Paragraph>
                Building something cool with climbing data? We provide a public API that developers
                can use to access climb information and build their own integrations.
              </Paragraph>
              <Paragraph>
                <Link href="/docs">Explore the API Documentation →</Link>
              </Paragraph>
            </section>

            {/* Collaboration */}
            <section>
              <Title level={3}>
                <HeartOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                Join the Community
              </Title>
              <Paragraph>
                We&apos;re always looking to collaborate with climbers, developers, and anyone
                passionate about improving the board climbing experience. Whether you want to
                contribute code, suggest features, or just say hello—we&apos;d love to hear from
                you.
              </Paragraph>
            </section>

            {/* Call to Action */}
            <section className={styles.callToAction}>
              <Paragraph type="secondary">
                Together, we can build the best training companion for board climbers everywhere.
              </Paragraph>
            </section>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}

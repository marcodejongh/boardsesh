'use client';

import React from 'react';
import { Typography } from 'antd';
import { Header } from 'antd/es/layout/layout';
import BackButton from '@/app/components/back-button';
import Logo from '@/app/components/brand/logo';
import styles from './about.module.css';

const { Title } = Typography;

export default function AboutHeader() {
  return (
    <Header className={styles.header}>
      <BackButton fallbackUrl="/" />
      <Logo size="sm" showText={false} />
      <Title level={4} className={styles.headerTitle}>
        About
      </Title>
    </Header>
  );
}

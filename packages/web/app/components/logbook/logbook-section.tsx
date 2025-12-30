'use client';

import React from 'react';
import { Typography } from 'antd';
import { LogbookView } from './logbook-view';
import { Climb } from '@/app/lib/types';

const { Title } = Typography;

interface LogbookSectionProps {
  climb: Climb;
}

export const LogbookSection: React.FC<LogbookSectionProps> = ({ climb }) => {
  return (
    <>
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Your Logbook
      </Title>
      <LogbookView currentClimb={climb} />
    </>
  );
};

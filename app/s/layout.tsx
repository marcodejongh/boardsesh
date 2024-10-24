import React from 'react';
import BoardSelection from '@/c/setup-wizard/board-selection';
import { Form } from 'antd';
export default function ClimbsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Form layout="vertical">
      <BoardSelection />
      {children}
    </Form>
    
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Select, Button, Typography, Form } from 'antd';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';

const { Title } = Typography;
const { Option } = Select;

const BoardSelection = () => {
  const router = useRouter();
  const [selectedBoard, setSelectedBoard] = React.useState<string>('kilter');

  const handleBoardChange = (value: string) => {
    setSelectedBoard(value);
  };

  const handleNext = () => {
    router.push(`/${selectedBoard}`);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Title level={4}>Select a board</Title>
      <Form layout="vertical">
        <Form.Item label="Board">
          <Select value={selectedBoard} onChange={handleBoardChange}>
            {SUPPORTED_BOARDS.map((board_name) => (
              <Option key={board_name} value={board_name}>
                {board_name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
      <Button type="primary" block style={{ marginTop: '16px' }} onClick={handleNext}>
        Next
      </Button>
    </div>
  );
};

export default BoardSelection;

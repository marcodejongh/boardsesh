'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Select, Button, Typography, Form } from 'antd';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName } from '@/app/lib/types';

const { Title } = Typography;
const { Option } = Select;

const AngleSelection = ({ board_name }: { board_name: BoardName }) => {
  const router = useRouter();
  const [angle, setAngle] = React.useState(40);

  const handleAngleChange = (value: string) => {
    setAngle(Number(value));
  };

  const handleNext = () => {
    router.push(`${window.location.pathname}/${angle}/list`);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Title level={4}>Select an angle</Title>
      <Form layout="vertical">
        <Form.Item label="Angle">
          <Select value={angle.toString()} onChange={handleAngleChange}>
            {ANGLES[board_name].map((angle) => (
              <Option key={angle} value={angle}>
                {angle}
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

export default AngleSelection;

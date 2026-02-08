'use client';
import React, { useState } from 'react';
import { Button, Form, Select, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { LayoutRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';

const { Option } = Select;
const { Title } = Typography;

const LayoutSelection = ({ layouts = [] }: { layouts: LayoutRow[]; boardName: BoardName }) => {
  const router = useRouter();
  const [selectedLayout, setSelectedLayout] = useState<number>();

  const onLayoutChange = (value: number) => {
    setSelectedLayout(value);
  };

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedLayout}`);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Title level={4}>Select a layout</Title>
      <Form layout="vertical">
        <Form.Item label="Layout" required tooltip="Choose the layout you want to work with">
          <Select onChange={onLayoutChange}>
            {layouts.map(({ id: layoutId, name: layoutName }) => (
              <Option key={layoutId} value={layoutId}>
                {layoutName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Button type="primary" block style={{ marginTop: '16px' }} onClick={handleNext} disabled={!selectedLayout}>
          Next
        </Button>
      </Form>
    </div>
  );
};

export default LayoutSelection;

'use client';
import React, { useState } from 'react';
import { Button, Form, Select, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { SetRow } from '@/app/lib/data/queries';
import { themeTokens } from '@/app/theme/theme-config';

const { Option } = Select;
const { Title } = Typography;

const SetsSelection = ({ sets = [] }: { sets: SetRow[] }) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number>();

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedSize}`);
  };

  return (
    <div style={{ padding: '24px', background: themeTokens.semantic.background, borderRadius: '8px' }}>
      <Title level={4}>Select Hold Sets</Title>
      <Form layout="vertical">
        <Form.Item label="Sets" required tooltip="Select hold types">
          <Select mode="multiple" value={selectedSize} onChange={(value) => setSelectedSize(value)}>
            {sets.map(({ id, name }) => (
              <Option key={id} value={id}>
                {`${name}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Button
          type="primary"
          block
          style={{ marginTop: '16px' }}
          onClick={handleNext}
          disabled={!selectedSize} // Disable the button if no size is selected
        >
          Next
        </Button>
      </Form>
    </div>
  );
};

export default SetsSelection;

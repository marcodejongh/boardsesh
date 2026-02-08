'use client';
import React, { useState } from 'react';
import { Form, Select } from 'antd';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { SizeRow } from '@/app/lib/data/queries';

const { Option } = Select;

const SizeSelection = ({ sizes = [] }: { sizes: SizeRow[] }) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number>();

  const handleNext = () => {
    if (selectedSize) {
      router.push(`${window.location.pathname}/${selectedSize}`);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select a size</Typography>
      <Form layout="vertical">
        <Form.Item label="Size" required tooltip="Choose your current board size">
          <Select placeholder="Choose a size" value={selectedSize} onChange={(value) => setSelectedSize(value)}>
            {sizes.map(({ id, name, description }) => (
              <Option key={id} value={id}>
                {`${name} ${description}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Button
          variant="contained"
          fullWidth
          sx={{ marginTop: '16px' }}
          onClick={handleNext}
          disabled={!selectedSize}
        >
          Next
        </Button>
      </Form>
    </div>
  );
};

export default SizeSelection;

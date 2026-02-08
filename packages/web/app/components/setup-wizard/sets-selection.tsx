'use client';
import React, { useState } from 'react';
import { Form, Select } from 'antd';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { SetRow } from '@/app/lib/data/queries';

const { Option } = Select;

const SetsSelection = ({ sets = [] }: { sets: SetRow[] }) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number>();

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedSize}`);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--semantic-background)', borderRadius: '8px' }}>
      <Typography variant="h4">Select Hold Sets</Typography>
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

export default SetsSelection;

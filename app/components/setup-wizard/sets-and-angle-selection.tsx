'use client';

import React, { useState } from 'react';
import { Button, Form, Select, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { SetRow } from '@/app/lib/data/queries';
import SelectionFormItem from './selection-form-item';
import { ParsedBoardRouteParameters } from '@/app/lib/types';
import { ANGLES } from '@/app/lib/board-data';

const { Option } = Select;
 
type SetsSelectionProps = { sets: SetRow[], parsedBoardRouteParameters: ParsedBoardRouteParameters };

const SetsSelection = ({ sets = [], parsedBoardRouteParameters: { board_name, layout_id, size_id} }: SetsSelectionProps ) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<number>();

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedSize}`);
  };
  console.log('!!!!!')
  return (
    <>
      <Form.Item label="Sets">
        <Select mode="multiple" value={selectedSize} onChange={(value) => setSelectedSize(value)}>
          {sets.map(({ id, name }) => (
            <Option key={id} value={id}>
              {`${name}`}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <SelectionFormItem 
        entityName={'Angle'} 
        label={'Angle'}
        items={ANGLES[board_name].map((value) => ({ value }))}
        urlPrefix={`/s/${board_name}/${layout_id}/${size_id}`}
        navigate={false} />
      <Button type="primary" block style={{ marginTop: '16px' }} onClick={handleNext}>
        Climb!
      </Button>
    </>
  );
};

export default SetsSelection;

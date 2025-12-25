import React from 'react';
import Button from 'antd/es/button';
import { ClearOutlined } from '@ant-design/icons';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';

const ClearButton = () => {
  const { clearClimbSearchParams } = useUISearchParams();

  return (
    <Button type="text" icon={<ClearOutlined />} onClick={clearClimbSearchParams}>
      Clear All
    </Button>
  );
};

export default ClearButton;

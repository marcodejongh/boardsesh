import React from 'react';
import Button from 'antd/es/button';
import { useUISearchParams } from '@/c/board-control/ui-searchparams-provider';

const ClearButton = () => {
  const { clearClimbSearchParams } = useUISearchParams();

  return (
    <Button onClick={clearClimbSearchParams} >Clear Filter</Button>
  );
}

export default ClearButton;
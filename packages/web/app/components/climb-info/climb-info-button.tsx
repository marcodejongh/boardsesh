'use client';

import React, { useState } from 'react';
import { Button, Drawer } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import ClimbInfo from './climb-info';

const ClimbInfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="default" icon={<InfoCircleOutlined />} onClick={() => setIsOpen(true)} />
      <Drawer title="Climb Info" placement="right" styles={{ wrapper: { width: '80%' } }} open={isOpen} onClose={() => setIsOpen(false)}>
        <ClimbInfo />
      </Drawer>
    </>
  );
};

export default ClimbInfoButton;

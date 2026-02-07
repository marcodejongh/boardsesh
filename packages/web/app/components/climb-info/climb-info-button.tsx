'use client';

import React, { useState } from 'react';
import { Button } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { InfoCircleOutlined } from '@ant-design/icons';
import ClimbInfo from './climb-info';

const ClimbInfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="default" icon={<InfoCircleOutlined />} onClick={() => setIsOpen(true)} />
      <SwipeableDrawer title="Climb Info" placement="right" styles={{ wrapper: { width: '80%' } }} open={isOpen} onClose={() => setIsOpen(false)}>
        <ClimbInfo />
      </SwipeableDrawer>
    </>
  );
};

export default ClimbInfoButton;

'use client';

import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ClimbInfo from './climb-info';

const ClimbInfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton onClick={() => setIsOpen(true)}>
        <InfoOutlined />
      </IconButton>
      <SwipeableDrawer title="Climb Info" placement="right" styles={{ wrapper: { width: '80%' } }} open={isOpen} onClose={() => setIsOpen(false)}>
        <ClimbInfo />
      </SwipeableDrawer>
    </>
  );
};

export default ClimbInfoButton;

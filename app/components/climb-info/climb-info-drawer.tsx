'use client';

import React from 'react';
import ClimbInfo from './climb-info';
import { Grid } from 'antd';

const { useBreakpoint } = Grid;

const ClimbInfoColumn = () => {
  const screens = useBreakpoint();

  // Sidebar for desktop view
  const desktopSidebar = <ClimbInfo />;

  // Conditionally render based on screen size
  return screens.md ? desktopSidebar : null;
};

export default ClimbInfoColumn;

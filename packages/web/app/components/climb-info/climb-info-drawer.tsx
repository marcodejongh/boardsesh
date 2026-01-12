'use client';

import React from 'react';
import ClimbInfo from './climb-info';
import styles from './climb-info-drawer.module.css';

const ClimbInfoColumn = () => {
  return (
    <div className={styles.desktopOnly}>
      <ClimbInfo />
    </div>
  );
};

export default ClimbInfoColumn;

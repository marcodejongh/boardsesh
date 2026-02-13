'use client';

import React from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import styles from './board-scroll.module.css';

interface CreateBoardCardProps {
  onClick: () => void;
  label?: string;
  size?: 'default' | 'small';
}

export default function CreateBoardCard({ onClick, label = 'New Board', size = 'default' }: CreateBoardCardProps) {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 24 : 32;

  return (
    <div className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''}`} onClick={onClick}>
      <div className={`${styles.cardSquare} ${styles.createSquare}`}>
        <AddOutlined sx={{ fontSize: iconSize }} />
        <span className={styles.createLabel}>{label}</span>
      </div>
    </div>
  );
}

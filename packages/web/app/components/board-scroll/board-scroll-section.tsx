'use client';

import React from 'react';
import Skeleton from '@mui/material/Skeleton';
import styles from './board-scroll.module.css';

interface BoardScrollSectionProps {
  title?: string;
  loading?: boolean;
  size?: 'default' | 'small';
  children: React.ReactNode;
}

export default function BoardScrollSection({ title, loading, size = 'default', children }: BoardScrollSectionProps) {
  const isSmall = size === 'small';

  return (
    <div className={`${styles.scrollSection} ${isSmall ? styles.scrollSectionSmall : ''}`}>
      {title && <div className={styles.sectionTitle}>{title}</div>}
      <div className={`${styles.scrollContainer} ${isSmall ? styles.scrollContainerSmall : ''}`}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${styles.cardScroll} ${isSmall ? styles.cardScrollSmall : ''}`}>
                <Skeleton variant="rounded" className={styles.skeletonSquare} />
                <Skeleton variant="text" width="80%" className={styles.skeletonText} />
                <Skeleton variant="text" width="50%" className={styles.skeletonText} />
              </div>
            ))
          : children}
      </div>
    </div>
  );
}

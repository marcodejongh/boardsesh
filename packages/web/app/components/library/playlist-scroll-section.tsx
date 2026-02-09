'use client';

import React from 'react';
import Skeleton from '@mui/material/Skeleton';
import styles from './library.module.css';

type PlaylistScrollSectionProps = {
  title: string;
  loading?: boolean;
  children: React.ReactNode;
};

export default function PlaylistScrollSection({
  title,
  loading,
  children,
}: PlaylistScrollSectionProps) {
  if (loading) {
    return (
      <div className={styles.scrollSection}>
        <div className={styles.sectionTitle}>{title}</div>
        <div className={styles.scrollContainer}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.cardScroll}>
              <Skeleton variant="rounded" className={styles.skeletonSquare} />
              <Skeleton variant="text" width="80%" className={styles.skeletonText} />
              <Skeleton variant="text" width="50%" className={styles.skeletonText} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scrollSection}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.scrollContainer}>
        {children}
      </div>
    </div>
  );
}

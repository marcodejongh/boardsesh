'use client';

import React from 'react';
import CollapsibleSection from '@/app/components/collapsible-section/collapsible-section';
import type { CollapsibleSectionConfig } from '@/app/components/collapsible-section/collapsible-section';
import styles from './climb-detail-shell.module.css';

interface ClimbDetailShellClientProps {
  mode: 'play' | 'info';
  aboveFold: React.ReactNode;
  sections: CollapsibleSectionConfig[];
  desktopRightColumn?: React.ReactNode | null;
}

export default function ClimbDetailShellClient({
  mode,
  aboveFold,
  sections,
  desktopRightColumn,
}: ClimbDetailShellClientProps) {
  if (mode === 'play') {
    return (
      <div className={styles.mobileScrollLayout}>
        <div className={styles.aboveFold}>{aboveFold}</div>
        <div className={styles.belowFold}>
          <CollapsibleSection sections={sections} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.infoPageLayout}>
      <div>
        {aboveFold}
        <div className={styles.mobileOnly}>
          <CollapsibleSection sections={sections} />
        </div>
      </div>
      <div className={styles.desktopOnly}>
        {desktopRightColumn ?? <CollapsibleSection sections={sections} />}
      </div>
    </div>
  );
}

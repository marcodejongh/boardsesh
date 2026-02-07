import React from 'react';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import ClimbTitle from './climb-title';
import styles from './climb-list-item.module.css';

type DrawerClimbHeaderProps = {
  climb: Climb;
  boardDetails: BoardDetails;
};

export default function DrawerClimbHeader({ climb, boardDetails }: DrawerClimbHeaderProps) {
  return (
    <div className={styles.drawerHeader}>
      <div style={{ flexShrink: 0, maxWidth: 56 }}>
        <ClimbThumbnail boardDetails={boardDetails} currentClimb={climb} maxHeight="80px" />
      </div>
      <ClimbTitle climb={climb} layout="horizontal" titleScale={1.4} showSetterInfo />
    </div>
  );
}

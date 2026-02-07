import React from 'react';
import { Typography } from 'antd';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbThumbnail from './climb-thumbnail';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './climb-list-item.module.css';

const { Text } = Typography;

type DrawerClimbHeaderProps = {
  climb: Climb;
  boardDetails: BoardDetails;
};

export default function DrawerClimbHeader({ climb, boardDetails }: DrawerClimbHeaderProps) {
  const hasQuality = climb.quality_average && climb.quality_average !== '0';

  return (
    <div className={styles.drawerHeader}>
      <div style={{ flexShrink: 0, maxWidth: 100 }}>
        <ClimbThumbnail boardDetails={boardDetails} currentClimb={climb} maxHeight="150px" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text
          strong
          style={{
            display: 'block',
            fontSize: themeTokens.typography.fontSize.sm * 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {climb.name}
        </Text>
        <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.xs * 1.4 }}>
          {climb.difficulty} {hasQuality ? `${climb.quality_average}★` : ''}
        </Text>
      </div>
    </div>
  );
}

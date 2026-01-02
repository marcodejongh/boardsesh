'use client';

import React from 'react';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import BackButton from '@/app/components/back-button';
import styles from './playlist-view-actions.module.css';

type PlaylistViewActionsProps = {
  boardDetails: BoardDetails;
  angle: number;
  isOwner: boolean;
  onEditClick: () => void;
};

const PlaylistViewActions = ({ boardDetails, angle, isOwner, onEditClick }: PlaylistViewActionsProps) => {
  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    // Use slug-based URL construction if slug names are available
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    // Fallback to numeric format
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  return (
    <div className={styles.container}>
      {/* Mobile view */}
      <div className={styles.mobileActions}>
        <div className={styles.mobileLeft}>
          <BackButton fallbackUrl={getBackToListUrl()} />
        </div>

        {isOwner && (
          <div className={styles.mobileRight}>
            <Button icon={<EditOutlined />} onClick={onEditClick}>
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Desktop view */}
      <div className={styles.desktopActions}>
        <BackButton fallbackUrl={getBackToListUrl()} className={styles.backButton} />

        {isOwner && (
          <div className={styles.actionButtons}>
            <Button icon={<EditOutlined />} onClick={onEditClick}>
              Edit Playlist
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistViewActions;

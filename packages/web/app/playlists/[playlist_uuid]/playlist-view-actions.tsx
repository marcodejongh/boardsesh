'use client';

import React from 'react';
import { Button } from 'antd';
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import styles from './playlist-view-actions.module.css';

type PlaylistViewActionsProps = {
  boardDetails: BoardDetails;
  isOwner: boolean;
  onEditClick: () => void;
  onBackClick: () => void;
};

const PlaylistViewActions = ({ boardDetails, isOwner, onEditClick, onBackClick }: PlaylistViewActionsProps) => {
  return (
    <div className={styles.container}>
      {/* Mobile view */}
      <div className={styles.mobileActions}>
        <div className={styles.mobileLeft}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBackClick}>
            Back
          </Button>
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
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBackClick} className={styles.backButton}>
          Back to Playlists
        </Button>

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

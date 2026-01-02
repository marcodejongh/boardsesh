'use client';

import React, { useState } from 'react';
import { Button } from 'antd';
import { EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import BackButton from '@/app/components/back-button';
import { PlaylistGeneratorDrawer } from '@/app/components/playlist-generator';
import styles from './playlist-view-actions.module.css';

type PlaylistViewActionsProps = {
  boardDetails: BoardDetails;
  angle: number;
  isOwner: boolean;
  playlistUuid: string;
  onEditClick: () => void;
  onPlaylistUpdated?: () => void;
};

const PlaylistViewActions = ({
  boardDetails,
  angle,
  isOwner,
  playlistUuid,
  onEditClick,
  onPlaylistUpdated,
}: PlaylistViewActionsProps) => {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    // Use slug-based URL construction if slug names are available
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    // Fallback to numeric format
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  const handleGeneratorSuccess = () => {
    onPlaylistUpdated?.();
  };

  return (
    <>
      <div className={styles.container}>
        {/* Mobile view */}
        <div className={styles.mobileActions}>
          <div className={styles.mobileLeft}>
            <BackButton fallbackUrl={getBackToListUrl()} />
          </div>

          {isOwner && (
            <div className={styles.mobileRight}>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => setGeneratorOpen(true)}
              >
                Generate
              </Button>
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
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => setGeneratorOpen(true)}
              >
                Generate Playlist
              </Button>
              <Button icon={<EditOutlined />} onClick={onEditClick}>
                Edit Playlist
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Playlist Generator Drawer */}
      <PlaylistGeneratorDrawer
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        playlistUuid={playlistUuid}
        boardDetails={boardDetails}
        angle={angle}
        onSuccess={handleGeneratorSuccess}
      />
    </>
  );
};

export default PlaylistViewActions;

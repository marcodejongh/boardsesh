'use client';

import React, { useState } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { EditOutlined, ElectricBoltOutlined, AddOutlined } from '@mui/icons-material';
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
  onAddAllToQueue: () => void;
  isAddingToQueue: boolean;
  climbCount: number;
};

const PlaylistViewActions = ({
  boardDetails,
  angle,
  isOwner,
  playlistUuid,
  onEditClick,
  onPlaylistUpdated,
  onAddAllToQueue,
  isAddingToQueue,
  climbCount,
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

  const addAllButton = (
    <MuiButton
      variant="outlined"
      startIcon={isAddingToQueue ? <CircularProgress size={16} /> : <AddOutlined />}
      onClick={onAddAllToQueue}
      disabled={climbCount === 0 || isAddingToQueue}
    >
      {isAddingToQueue ? 'Adding...' : 'Queue All'}
    </MuiButton>
  );

  return (
    <>
      <div className={styles.container}>
        {/* Mobile view */}
        <div className={styles.mobileActions}>
          <div className={styles.mobileLeft}>
            <BackButton fallbackUrl={getBackToListUrl()} />
          </div>

          <div className={styles.mobileRight}>
            {addAllButton}
            {isOwner && (
              <>
                <MuiButton
                  variant="outlined"
                  startIcon={<ElectricBoltOutlined />}
                  onClick={() => setGeneratorOpen(true)}
                >
                  Generate
                </MuiButton>
                <MuiButton variant="outlined" startIcon={<EditOutlined />} onClick={onEditClick}>
                  Edit
                </MuiButton>
              </>
            )}
          </div>
        </div>

        {/* Desktop view */}
        <div className={styles.desktopActions}>
          <BackButton fallbackUrl={getBackToListUrl()} className={styles.backButton} />

          <div className={styles.actionButtons}>
            {addAllButton}
            {isOwner && (
              <>
                <MuiButton
                  variant="outlined"
                  startIcon={<ElectricBoltOutlined />}
                  onClick={() => setGeneratorOpen(true)}
                >
                  Generate Playlist
                </MuiButton>
                <MuiButton variant="outlined" startIcon={<EditOutlined />} onClick={onEditClick}>
                  Edit Playlist
                </MuiButton>
              </>
            )}
          </div>
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

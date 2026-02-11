'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { Instagram, PersonOutlined, ExpandLessOutlined } from '@mui/icons-material';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import { EmptyState } from '@/app/components/ui/empty-state';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { themeTokens } from '@/app/theme/theme-config';

interface BetaVideosProps {
  betaLinks: BetaLink[];
}

const BetaVideos: React.FC<BetaVideosProps> = ({ betaLinks }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BetaLink | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [showAllVideos, setShowAllVideos] = useState(false);

  const getInstagramEmbedUrl = (link: string) => {
    const instagramRegex = /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/;
    const match = link.match(instagramRegex);

    if (match && match[1]) {
      return `https://www.instagram.com/p/${match[1]}/embed`;
    }

    return null;
  };

  const handleVideoClick = (betaLink: BetaLink) => {
    setSelectedVideo(betaLink);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setIframeKey((prev) => prev + 1);
    setModalVisible(false);
    setSelectedVideo(null);
  };

  const renderVideoCard = (betaLink: BetaLink) => {
    const embedUrl = getInstagramEmbedUrl(betaLink.link);

    return (
      <Box sx={{ width: '100%' }} key={betaLink.link}>
        <Card
          sx={{ '&:hover': { boxShadow: 3 }, cursor: 'pointer' }}
          onClick={() => handleVideoClick(betaLink)}
        >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {embedUrl ? (
            <Box
              sx={{
                position: 'relative',
                paddingBottom: '100%',
                overflow: 'hidden',
                borderRadius: `${themeTokens.borderRadius.md}px ${themeTokens.borderRadius.md}px 0 0`,
              }}
            >
              <iframe
                src={embedUrl}
                style={{
                  position: 'absolute',
                  top: '-20%',
                  left: 0,
                  width: '100%',
                  height: '140%',
                  border: 'none',
                  pointerEvents: 'none',
                }}
                scrolling="no"
                title={`Beta video by ${betaLink.foreign_username || 'unknown'}`}
              />
            </Box>
          ) : (
            <Box
              sx={{
                padding: `${themeTokens.spacing[8]}px`,
                textAlign: 'center',
                background: 'var(--neutral-100)',
              }}
            >
              <Instagram sx={{ fontSize: 32, color: 'var(--neutral-400)' }} />
              <Box component="p" sx={{ margin: `${themeTokens.spacing[2]}px 0 0`, color: 'var(--neutral-500)' }}>
                Unable to load video
              </Box>
            </Box>
          )}
          <Box
            sx={{
              padding: `${themeTokens.spacing[3]}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid var(--neutral-100)`,
            }}
          >
            {betaLink.foreign_username && (
              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.sm }}>
                <PersonOutlined sx={{ marginRight: 4, fontSize: 'inherit', verticalAlign: 'middle' }} />@{betaLink.foreign_username}
                {betaLink.angle && <Box component="span" sx={{ marginLeft: 8 }}>{betaLink.angle}&deg;</Box>}
              </Typography>
            )}
            <Box
              component="a"
              href={betaLink.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: themeTokens.colors.primary,
                fontSize: themeTokens.typography.fontSize.sm,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Instagram sx={{ fontSize: 'inherit' }} /> View
            </Box>
          </Box>
        </CardContent>
        </Card>
      </Box>
    );
  };

  if (betaLinks.length === 0) {
    return <EmptyState description="No beta videos available" />;
  }

  const visibleVideos = showAllVideos ? betaLinks : betaLinks.slice(0, 1);
  const hasMoreVideos = betaLinks.length > 1;

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {visibleVideos.map((betaLink) => renderVideoCard(betaLink))}
      </Box>
      {hasMoreVideos && (
        <Button
          variant="text"
          onClick={() => setShowAllVideos(!showAllVideos)}
          fullWidth
          sx={{
            marginTop: `${themeTokens.spacing[3]}px`,
            color: themeTokens.colors.primary,
          }}
          startIcon={showAllVideos ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
        >
          {showAllVideos ? 'Show less' : `Show ${betaLinks.length - 1} more video${betaLinks.length - 1 !== 1 ? 's' : ''}`}
        </Button>
      )}

      {modalVisible && (
        <Dialog
          open={modalVisible}
          onClose={handleModalClose}
          maxWidth="sm"
          fullWidth
          sx={{ '& .MuiDialog-paper': { maxWidth: '500px', width: '90%' } }}
        >
          <DialogTitle>
            {selectedVideo?.foreign_username ? `Beta by @${selectedVideo.foreign_username}` : 'Beta Video'}
          </DialogTitle>
          <DialogContent>
            {selectedVideo && (
              <Box
                sx={{
                  position: 'relative',
                  paddingBottom: '140%',
                  overflow: 'hidden',
                  borderRadius: themeTokens.borderRadius.md,
                }}
              >
                <iframe
                  key={iframeKey}
                  src={getInstagramEmbedUrl(selectedVideo.link) || ''}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  scrolling="no"
                  title="Beta video"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Box
              component="a"
              href={selectedVideo?.link}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: themeTokens.colors.primary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Instagram sx={{ fontSize: 'inherit' }} /> View on Instagram
            </Box>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default BetaVideos;

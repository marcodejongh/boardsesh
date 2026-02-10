'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import { Instagram, PersonOutlined } from '@mui/icons-material';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { themeTokens } from '@/app/theme/theme-config';

const THUMB_SIZE = themeTokens.spacing[16]; // 64px

function getInstagramEmbedUrl(link: string): string | null {
  const instagramRegex = /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/;
  const match = link.match(instagramRegex);
  if (match && match[1]) {
    return `https://www.instagram.com/p/${match[1]}/embed`;
  }
  return null;
}

interface PlayViewBetaSliderProps {
  boardName: string;
  climbUuid: string | undefined;
}

const PlayViewBetaSlider: React.FC<PlayViewBetaSliderProps> = ({ boardName, climbUuid }) => {
  const [betaLinks, setBetaLinks] = useState<BetaLink[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<BetaLink | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (!climbUuid) {
      setBetaLinks([]);
      return;
    }

    let cancelled = false;

    const fetchBeta = async () => {
      try {
        const res = await fetch(`/api/v1/${boardName}/beta/${climbUuid}`);
        if (!res.ok) return;
        const data: BetaLink[] = await res.json();
        if (!cancelled) setBetaLinks(data);
      } catch (error) {
        console.error('Failed to fetch beta links:', error);
      }
    };

    fetchBeta();
    return () => { cancelled = true; };
  }, [boardName, climbUuid]);

  if (betaLinks.length === 0) return null;

  const handleClose = () => {
    setIframeKey((prev) => prev + 1);
    setSelectedVideo(null);
  };

  return (
    <>
      <Box sx={{ px: `${themeTokens.spacing[3]}px`, pb: `${themeTokens.spacing[2]}px` }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mb: `${themeTokens.spacing[1]}px`,
            fontWeight: themeTokens.typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: themeTokens.typography.fontSize.xs,
          }}
        >
          <VideocamOutlined sx={{ fontSize: themeTokens.typography.fontSize.sm }} />
          Beta ({betaLinks.length})
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: `${themeTokens.spacing[2]}px`,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            pb: `${themeTokens.spacing[1]}px`,
          }}
        >
          {betaLinks.map((link) => (
            <Box
              key={link.link}
              onClick={() => setSelectedVideo(link)}
              sx={{
                width: THUMB_SIZE,
                minWidth: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: `${themeTokens.borderRadius.md}px`,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                bgcolor: 'var(--neutral-100)',
                border: '1px solid var(--neutral-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: `border-color ${themeTokens.transitions.fast}`,
                '&:hover': {
                  borderColor: themeTokens.colors.primary,
                },
              }}
            >
              {link.thumbnail ? (
                <Box
                  component="img"
                  src={link.thumbnail}
                  alt={`Beta by ${link.foreign_username || 'unknown'}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Instagram sx={{ fontSize: themeTokens.typography.fontSize['2xl'], color: 'var(--neutral-400)' }} />
              )}
              {/* Play overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: themeTokens.semantic.overlayLight,
                  opacity: 0,
                  transition: `opacity ${themeTokens.transitions.fast}`,
                  '&:hover': { opacity: 1 },
                }}
              >
                <PlayArrowOutlined sx={{ color: 'white', fontSize: themeTokens.typography.fontSize['2xl'] }} />
              </Box>
              {/* Username chip */}
              {link.foreign_username && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: themeTokens.semantic.overlayDark,
                    color: 'white',
                    fontSize: themeTokens.typography.fontSize.xs,
                    px: 0.5,
                    py: '1px',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}
                >
                  @{link.foreign_username}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Video modal */}
      {selectedVideo && (
        <Dialog
          open
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          sx={{ '& .MuiDialog-paper': { maxWidth: 500, width: '90%' } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedVideo.foreign_username && (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonOutlined sx={{ fontSize: themeTokens.typography.fontSize.base }} />
                  @{selectedVideo.foreign_username}
                </Typography>
              )}
              {selectedVideo.angle && (
                <Typography variant="caption" color="text.secondary">
                  {selectedVideo.angle}&deg;
                </Typography>
              )}
            </Box>
            <IconButton size="small" onClick={handleClose}>
              <CloseOutlined fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box
              sx={{
                position: 'relative',
                paddingBottom: '140%',
                overflow: 'hidden',
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
          </DialogContent>
          <DialogActions>
            <Box
              component="a"
              href={selectedVideo.link}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: themeTokens.colors.primary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: themeTokens.typography.fontSize.sm,
                textDecoration: 'none',
              }}
            >
              <Instagram sx={{ fontSize: themeTokens.typography.fontSize.base }} /> View on Instagram
            </Box>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default PlayViewBetaSlider;

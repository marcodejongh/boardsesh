'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import type { Gym } from '@boardsesh/shared-schema';
import { themeTokens } from '@/app/theme/theme-config';
import StatItem from '@/app/components/ui/stat-item';

interface GymCardProps {
  gym: Gym;
  onClick?: (gym: Gym) => void;
}

export default function GymCard({ gym, onClick }: GymCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: `${themeTokens.borderRadius.lg}px`,
        borderColor: 'var(--neutral-200)',
        '&:hover': { borderColor: 'var(--neutral-300)' },
        transition: themeTokens.transitions.fast,
      }}
    >
      <CardActionArea onClick={() => onClick?.(gym)} disabled={!onClick}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MuiTypography
                variant="subtitle1"
                sx={{
                  fontWeight: themeTokens.typography.fontWeight.semibold,
                  lineHeight: themeTokens.typography.lineHeight.tight,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {gym.name}
              </MuiTypography>
              {gym.address && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <LocationOnOutlined sx={{ fontSize: 14, color: 'var(--neutral-400)' }} />
                  <MuiTypography
                    variant="body2"
                    color="text.secondary"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {gym.address}
                  </MuiTypography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
            <StatItem icon={<FitnessCenterOutlined sx={{ fontSize: 14 }} />} value={gym.boardCount} label="boards" />
            <StatItem icon={<PersonOutlined sx={{ fontSize: 14 }} />} value={gym.memberCount} label="members" />
            <StatItem icon={<PeopleOutlined sx={{ fontSize: 14 }} />} value={gym.followerCount} label="followers" />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}


'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MuiTypography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import AddOutlined from '@mui/icons-material/AddOutlined';
import useSWR from 'swr';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_MY_GYMS,
  type GetMyGymsQueryVariables,
  type GetMyGymsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { Gym } from '@boardsesh/shared-schema';
import CreateGymForm from './create-gym-form';

interface GymSelectorProps {
  selectedGymUuid: string | null;
  onSelect: (gymUuid: string | null) => void;
}

export default function GymSelector({ selectedGymUuid, onSelect }: GymSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { token } = useWsAuthToken();

  const { data, isLoading, mutate } = useSWR(
    token ? ['myGyms', token] : null,
    async () => {
      const client = createGraphQLHttpClient(token!);
      const response = await client.request<GetMyGymsQueryResponse, GetMyGymsQueryVariables>(
        GET_MY_GYMS,
        { input: { limit: 50 } },
      );
      return response.myGyms.gyms;
    },
    { revalidateOnFocus: false },
  );

  const gyms = data ?? [];

  const handleGymCreated = (gym: Gym) => {
    mutate((prev) => (prev ? [gym, ...prev] : [gym]), false);
    onSelect(gym.uuid);
    setShowCreateForm(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <MuiTypography variant="body2" color="text.secondary">Loading gyms...</MuiTypography>
      </Box>
    );
  }

  if (showCreateForm) {
    return (
      <CreateGymForm
        onSuccess={handleGymCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <Box>
      <MuiTypography variant="body2" sx={{ mb: 1 }}>
        Link to a gym
      </MuiTypography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="No gym"
          variant={selectedGymUuid === null ? 'filled' : 'outlined'}
          color={selectedGymUuid === null ? 'primary' : 'default'}
          onClick={() => onSelect(null)}
          size="small"
        />
        {gyms.map((gym) => (
          <Chip
            key={gym.uuid}
            label={gym.name}
            variant={selectedGymUuid === gym.uuid ? 'filled' : 'outlined'}
            color={selectedGymUuid === gym.uuid ? 'primary' : 'default'}
            onClick={() => onSelect(gym.uuid)}
            size="small"
          />
        ))}
        <Chip
          icon={<AddOutlined />}
          label="Create new"
          variant="outlined"
          onClick={() => setShowCreateForm(true)}
          size="small"
        />
      </Box>
    </Box>
  );
}

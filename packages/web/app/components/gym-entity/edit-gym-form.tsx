'use client';

import React, { useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  UPDATE_GYM,
  type UpdateGymMutationVariables,
  type UpdateGymMutationResponse,
} from '@/app/lib/graphql/operations';
import type { Gym } from '@boardsesh/shared-schema';
import GymForm, { type GymFormFieldValues } from './gym-form';

interface EditGymFormProps {
  gym: Gym;
  onSuccess?: (gym: Gym) => void;
  onCancel?: () => void;
}

export default function EditGymForm({ gym, onSuccess, onCancel }: EditGymFormProps) {
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleSubmit = useCallback(
    async (values: GymFormFieldValues) => {
      if (!token) {
        showMessage('You must be signed in', 'error');
        return;
      }

      if (!values.name) {
        showMessage('Gym name is required', 'error');
        return;
      }

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<UpdateGymMutationResponse, UpdateGymMutationVariables>(
          UPDATE_GYM,
          {
            input: {
              gymUuid: gym.uuid,
              name: values.name,
              slug: values.slug || undefined,
              description: values.description || undefined,
              address: values.address || undefined,
              contactEmail: values.contactEmail || undefined,
              contactPhone: values.contactPhone || undefined,
              isPublic: values.isPublic,
            },
          },
        );

        showMessage('Gym updated!', 'success');
        onSuccess?.(data.updateGym);
      } catch (error) {
        console.error('Failed to update gym:', error);
        showMessage('Failed to update gym', 'error');
      }
    },
    [token, gym.uuid, showMessage, onSuccess],
  );

  return (
    <GymForm
      title="Edit Gym"
      submitLabel="Save Changes"
      initialValues={{
        name: gym.name,
        slug: gym.slug ?? '',
        description: gym.description ?? '',
        address: gym.address ?? '',
        contactEmail: gym.contactEmail ?? '',
        contactPhone: gym.contactPhone ?? '',
        isPublic: gym.isPublic,
      }}
      showSlugField
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}

'use client';

import React, { useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  CREATE_GYM,
  type CreateGymMutationVariables,
  type CreateGymMutationResponse,
} from '@/app/lib/graphql/operations';
import type { Gym } from '@boardsesh/shared-schema';
import GymForm, { type GymFormFieldValues } from './gym-form';

interface CreateGymFormProps {
  boardUuid?: string;
  onSuccess?: (gym: Gym) => void;
  onCancel?: () => void;
}

export default function CreateGymForm({
  boardUuid,
  onSuccess,
  onCancel,
}: CreateGymFormProps) {
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleSubmit = useCallback(
    async (values: GymFormFieldValues) => {
      if (!token) {
        showMessage('You must be signed in to create a gym', 'error');
        return;
      }

      if (!values.name) {
        showMessage('Gym name is required', 'error');
        return;
      }

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<CreateGymMutationResponse, CreateGymMutationVariables>(
          CREATE_GYM,
          {
            input: {
              name: values.name,
              description: values.description || undefined,
              address: values.address || undefined,
              contactEmail: values.contactEmail || undefined,
              contactPhone: values.contactPhone || undefined,
              isPublic: values.isPublic,
              boardUuid,
            },
          },
        );

        showMessage(`Gym "${data.createGym.name}" created!`, 'success');
        onSuccess?.(data.createGym);
      } catch (error) {
        console.error('Failed to create gym:', error);
        showMessage('Failed to create gym', 'error');
      }
    },
    [token, boardUuid, showMessage, onSuccess],
  );

  return (
    <GymForm
      title="Create Gym"
      submitLabel="Create Gym"
      initialValues={{
        name: '',
        description: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        isPublic: true,
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}

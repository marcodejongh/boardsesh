'use client';

import React, { useCallback } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useEntityMutation } from '@/app/hooks/use-entity-mutation';
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
  const { showMessage } = useSnackbar();

  const { execute } = useEntityMutation<CreateGymMutationResponse, CreateGymMutationVariables>(
    CREATE_GYM,
    {
      errorMessage: 'Failed to create gym',
      authRequiredMessage: 'You must be signed in to create a gym',
    },
  );

  const handleSubmit = useCallback(
    async (values: GymFormFieldValues) => {
      if (!values.name) {
        showMessage('Gym name is required', 'error');
        return;
      }

      const data = await execute({
        input: {
          name: values.name,
          description: values.description || undefined,
          address: values.address || undefined,
          contactEmail: values.contactEmail || undefined,
          contactPhone: values.contactPhone || undefined,
          isPublic: values.isPublic,
          boardUuid,
        },
      });

      if (data) {
        showMessage(`Gym "${data.createGym.name}" created!`, 'success');
        onSuccess?.(data.createGym);
      }
    },
    [execute, boardUuid, showMessage, onSuccess],
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

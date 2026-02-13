'use client';

import React, { useCallback } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useEntityMutation } from '@/app/hooks/use-entity-mutation';
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
  const { showMessage } = useSnackbar();

  const { execute } = useEntityMutation<UpdateGymMutationResponse, UpdateGymMutationVariables>(
    UPDATE_GYM,
    {
      successMessage: 'Gym updated!',
      errorMessage: 'Failed to update gym',
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
          gymUuid: gym.uuid,
          name: values.name,
          slug: values.slug || undefined,
          description: values.description || undefined,
          address: values.address || undefined,
          contactEmail: values.contactEmail || undefined,
          contactPhone: values.contactPhone || undefined,
          isPublic: values.isPublic,
        },
      });

      if (data) {
        onSuccess?.(data.updateGym);
      }
    },
    [execute, gym.uuid, showMessage, onSuccess],
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

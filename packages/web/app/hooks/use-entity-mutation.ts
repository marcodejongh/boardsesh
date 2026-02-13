'use client';

import { useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { Variables } from 'graphql-request';

interface UseEntityMutationOptions {
  successMessage?: string;
  errorMessage: string;
  authRequiredMessage?: string;
}

export function useEntityMutation<TResponse, TVariables extends Variables = Variables>(
  mutation: TypedDocumentNode | string,
  { successMessage, errorMessage, authRequiredMessage = 'You must be signed in' }: UseEntityMutationOptions,
) {
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const execute = useCallback(
    async (variables: TVariables): Promise<TResponse | null> => {
      if (!token) {
        showMessage(authRequiredMessage, 'error');
        return null;
      }

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<TResponse>(mutation, variables as Variables);
        if (successMessage) {
          showMessage(successMessage, 'success');
        }
        return data;
      } catch (error) {
        console.error(errorMessage, error);
        showMessage(errorMessage, 'error');
        return null;
      }
    },
    [token, mutation, successMessage, errorMessage, authRequiredMessage, showMessage],
  );

  return { execute, token };
}

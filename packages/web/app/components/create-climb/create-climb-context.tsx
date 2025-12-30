'use client';

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface CreateClimbActions {
  onPublish: () => void;
  onCancel: () => void;
}

interface CreateClimbContextValue {
  // State
  canPublish: boolean;
  isPublishing: boolean;
  // Actions (stable references via refs)
  onPublish: () => void;
  onCancel: () => void;
  // Registration (called by form to set up the actions)
  registerActions: (actions: CreateClimbActions) => void;
  setCanPublish: (can: boolean) => void;
  setIsPublishing: (is: boolean) => void;
}

const CreateClimbContext = createContext<CreateClimbContextValue | null>(null);

CreateClimbContext.displayName = 'CreateClimbContext';

export function CreateClimbProvider({ children }: { children: ReactNode }) {
  const [canPublish, setCanPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Use refs for callbacks to avoid storing functions in state
  const actionsRef = useRef<CreateClimbActions>({
    onPublish: () => {},
    onCancel: () => {},
  });

  const registerActions = useCallback((newActions: CreateClimbActions) => {
    actionsRef.current = newActions;
  }, []);

  // Stable wrapper functions that delegate to refs
  const onPublish = useCallback(() => {
    actionsRef.current.onPublish();
  }, []);

  const onCancel = useCallback(() => {
    actionsRef.current.onCancel();
  }, []);

  return (
    <CreateClimbContext.Provider
      value={{
        canPublish,
        isPublishing,
        onPublish,
        onCancel,
        registerActions,
        setCanPublish,
        setIsPublishing,
      }}
    >
      {children}
    </CreateClimbContext.Provider>
  );
}

CreateClimbProvider.displayName = 'CreateClimbProvider';

export function useCreateClimbContext() {
  return useContext(CreateClimbContext);
}

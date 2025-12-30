'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CreateClimbContextValue {
  // State
  canPublish: boolean;
  isPublishing: boolean;
  // Actions
  onPublish: () => void;
  onCancel: () => void;
  // Registration (called by form to set up the actions)
  registerActions: (actions: { onPublish: () => void; onCancel: () => void }) => void;
  setCanPublish: (can: boolean) => void;
  setIsPublishing: (is: boolean) => void;
}

const CreateClimbContext = createContext<CreateClimbContextValue | null>(null);

export function CreateClimbProvider({ children }: { children: ReactNode }) {
  const [canPublish, setCanPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actions, setActions] = useState<{ onPublish: () => void; onCancel: () => void }>({
    onPublish: () => {},
    onCancel: () => {},
  });

  const registerActions = useCallback((newActions: { onPublish: () => void; onCancel: () => void }) => {
    setActions(newActions);
  }, []);

  return (
    <CreateClimbContext.Provider
      value={{
        canPublish,
        isPublishing,
        onPublish: actions.onPublish,
        onCancel: actions.onCancel,
        registerActions,
        setCanPublish,
        setIsPublishing,
      }}
    >
      {children}
    </CreateClimbContext.Provider>
  );
}

export function useCreateClimbContext() {
  const context = useContext(CreateClimbContext);
  return context;
}

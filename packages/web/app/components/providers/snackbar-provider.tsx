'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { AlertColor } from '@mui/material/Alert';

type SnackbarMessage = {
  key: number;
  text: string;
  severity: AlertColor;
};

type SnackbarContextValue = {
  showMessage: (text: string, severity: AlertColor) => void;
};

const SnackbarContext = createContext<SnackbarContextValue>({
  showMessage: () => {},
});

export const useSnackbar = () => useContext(SnackbarContext);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const showMessage = useCallback((text: string, severity: AlertColor) => {
    setMessages((prev) => [...prev, { key: Date.now(), text, severity }]);
  }, []);

  const handleClose = useCallback((key: number) => {
    setMessages((prev) => prev.filter((m) => m.key !== key));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showMessage }}>
      {children}
      {messages.map((msg) => (
        <Snackbar
          key={msg.key}
          open
          autoHideDuration={3000}
          onClose={() => handleClose(msg.key)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => handleClose(msg.key)}
            severity={msg.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {msg.text}
          </Alert>
        </Snackbar>
      ))}
    </SnackbarContext.Provider>
  );
}

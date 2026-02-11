'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { lightTheme, darkTheme } from '@/app/theme/mui-theme';
import { ColorModeContext, type ColorMode } from '@/app/hooks/use-color-mode';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';

const PREFERENCE_KEY = 'colorMode';

export default function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('dark');

  // Load saved preference on mount
  useEffect(() => {
    getPreference<ColorMode>(PREFERENCE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
        document.documentElement.setAttribute('data-theme', saved);
      }
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ColorMode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      setPreference(PREFERENCE_KEY, next);
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

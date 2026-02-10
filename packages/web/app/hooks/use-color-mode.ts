'use client';

import { useContext, createContext } from 'react';

export type ColorMode = 'light' | 'dark';

export interface ColorModeContextValue {
  mode: ColorMode;
  toggleMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'dark',
  toggleMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

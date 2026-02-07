// Design tokens for Boardsesh
// This file defines the design system used throughout the application

export const themeTokens = {
  // Brand colors - Neutral grey with subtle warm red accent
  colors: {
    primary: '#8C4A52', // Muted dusty rose - warm grey-red
    primaryHover: '#7A3F47', // Darker rose
    primaryActive: '#6B353D', // Deep dark rose
    secondary: '#6B7280', // Neutral grey for info/secondary
    success: '#6B9080', // Muted sage green
    successBg: '#EFF5F2',
    warning: '#C4943C', // Muted amber
    warningBg: '#FAF5EC',
    error: '#B8524C', // Muted brick red
    errorBg: '#F9EFEE',
    purple: '#7C3AED', // For mirror button
    purpleHover: '#6D28D9',
  },

  // Neutral palette
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic colors
  semantic: {
    selected: '#F7F2F3', // Very light warm grey with subtle rose tint
    selectedLight: 'rgba(140, 74, 82, 0.06)', // Very subtle rose highlight
    selectedBorder: '#8C4A52', // Matches primary
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceOverlay: 'rgba(255, 255, 255, 0.95)', // Semi-transparent overlay
  },

  // Syntax highlighting colors (VS Code dark theme inspired)
  syntax: {
    keyword: '#569cd6',
    type: '#4ec9b0',
    string: '#ce9178',
    comment: '#6a9955',
    parameter: '#9cdcfe',
    default: '#d4d4d4',
  },

  // Shadows
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },

  // Typography
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing scale
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },

  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
} as const;

// Type exports for use in components
export type ThemeTokens = typeof themeTokens;
export type ColorTokens = typeof themeTokens.colors;
export type NeutralTokens = typeof themeTokens.neutral;
export type SyntaxTokens = typeof themeTokens.syntax;

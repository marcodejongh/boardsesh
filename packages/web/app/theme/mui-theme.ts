import { createTheme, type ThemeOptions, type Components, type Theme } from '@mui/material/styles';
import { themeTokens, darkTokens } from './theme-config';

// Shared component overrides used by both light and dark themes
const sharedComponents: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.md,
        fontWeight: themeTokens.typography.fontWeight.medium,
        textTransform: 'none' as const,
        '&:not(:disabled):not(.MuiButton-text):hover': {
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-sm)',
        },
        '&:not(:disabled):active': {
          transform: 'translateY(0)',
        },
      },
      sizeMedium: {
        height: 40,
        padding: `0 ${themeTokens.spacing[4]}px`,
      },
      sizeSmall: {
        height: 32,
      },
      sizeLarge: {
        height: 48,
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.lg,
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        userSelect: 'none' as const,
        '&:hover': {
          boxShadow: 'var(--shadow-md)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: themeTokens.borderRadius.md,
        },
      },
    },
    defaultProps: {
      variant: 'outlined' as const,
      size: 'small',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.md,
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.md,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: themeTokens.borderRadius.lg,
      },
      paperAnchorBottom: {
        borderRadius: `${themeTokens.borderRadius.lg}px ${themeTokens.borderRadius.lg}px 0 0`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      },
      paperAnchorLeft: {
        borderRadius: `0 ${themeTokens.borderRadius.lg}px ${themeTokens.borderRadius.lg}px 0`,
      },
      paperAnchorRight: {
        borderRadius: `${themeTokens.borderRadius.lg}px 0 0 ${themeTokens.borderRadius.lg}px`,
      },
      paperAnchorTop: {
        borderRadius: `0 0 ${themeTokens.borderRadius.lg}px ${themeTokens.borderRadius.lg}px`,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: themeTokens.borderRadius.lg,
      },
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.md,
        '&:before': {
          display: 'none',
        },
      },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        fontWeight: themeTokens.typography.fontWeight.medium,
        backgroundColor: 'var(--neutral-50)',
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        backgroundColor: themeTokens.colors.primary,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: themeTokens.typography.fontWeight.medium,
        '&.Mui-selected': {
          color: themeTokens.colors.primary,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: themeTokens.borderRadius.sm,
        fontWeight: themeTokens.typography.fontWeight.medium,
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: themeTokens.typography.fontWeight.semibold,
        boxShadow: '0 0 0 2px var(--semantic-surface)',
      },
    },
  },
  MuiRating: {
    styleOverrides: {
      iconFilled: {
        color: themeTokens.colors.amber,
      },
      icon: {
        transition: 'transform 0.15s ease',
        '&:hover': {
          transform: 'scale(1.1)',
        },
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      html: {
        touchAction: 'manipulation',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--neutral-300) var(--neutral-100)',
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: themeTokens.borderRadius.md,
      },
    },
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: themeTokens.borderRadius.md,
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      label: {
        fontSize: '10px',
        marginTop: '2px',
        lineHeight: 1,
        '&.Mui-selected': {
          fontSize: '10px',
        },
      },
    },
  },
  MuiSkeleton: {
    styleOverrides: {
      root: {
        backgroundColor: 'var(--neutral-100)',
      },
    },
  },
};

// Shared options for both themes (typography, shape, transitions)
const sharedOptions: Partial<ThemeOptions> = {
  typography: {
    fontFamily: themeTokens.typography.fontFamily,
    fontSize: themeTokens.typography.fontSize.base,
    h1: { fontWeight: themeTokens.typography.fontWeight.bold },
    h2: { fontWeight: themeTokens.typography.fontWeight.bold },
    h3: { fontWeight: themeTokens.typography.fontWeight.semibold },
    h4: { fontWeight: themeTokens.typography.fontWeight.semibold },
    h5: { fontWeight: themeTokens.typography.fontWeight.semibold },
    h6: { fontWeight: themeTokens.typography.fontWeight.medium },
    body1: {
      fontSize: themeTokens.typography.fontSize.base,
      lineHeight: themeTokens.typography.lineHeight.normal,
    },
    body2: {
      fontSize: themeTokens.typography.fontSize.sm,
      lineHeight: themeTokens.typography.lineHeight.normal,
    },
  },
  shape: {
    borderRadius: themeTokens.borderRadius.md,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 150,
      short: 200,
      standard: 200,
      complex: 300,
      enteringScreen: 200,
      leavingScreen: 200,
    },
  },
};

const lightShadows = [
  'none',
  themeTokens.shadows.xs,
  themeTokens.shadows.sm,
  themeTokens.shadows.sm,
  themeTokens.shadows.md,
  themeTokens.shadows.md,
  themeTokens.shadows.lg,
  themeTokens.shadows.lg,
  themeTokens.shadows.xl,
  ...Array(16).fill(themeTokens.shadows.xl),
] as unknown as typeof createTheme extends (o: { shadows?: infer S }) => unknown ? S : never;

const darkShadows = [
  'none',
  darkTokens.shadows.xs,
  darkTokens.shadows.sm,
  darkTokens.shadows.sm,
  darkTokens.shadows.md,
  darkTokens.shadows.md,
  darkTokens.shadows.lg,
  darkTokens.shadows.lg,
  darkTokens.shadows.xl,
  ...Array(16).fill(darkTokens.shadows.xl),
] as unknown as typeof createTheme extends (o: { shadows?: infer S }) => unknown ? S : never;

export const lightTheme = createTheme({
  ...sharedOptions,
  palette: {
    mode: 'light',
    primary: {
      main: themeTokens.colors.primary,
      dark: themeTokens.colors.primaryActive,
    },
    secondary: {
      main: themeTokens.colors.secondary,
    },
    success: {
      main: themeTokens.colors.success,
      dark: themeTokens.colors.successHover,
      light: themeTokens.colors.successBg,
    },
    warning: {
      main: themeTokens.colors.warning,
      light: themeTokens.colors.warningBg,
    },
    error: {
      main: themeTokens.colors.error,
      light: themeTokens.colors.errorBg,
    },
    info: {
      main: themeTokens.neutral[500],
    },
    background: {
      default: themeTokens.semantic.surface,
      paper: themeTokens.semantic.surface,
    },
    text: {
      primary: themeTokens.neutral[800],
      secondary: themeTokens.neutral[500],
      disabled: themeTokens.neutral[400],
    },
    divider: themeTokens.neutral[200],
    action: {
      hover: themeTokens.semantic.selectedLight,
      selected: themeTokens.semantic.selected,
    },
  },
  shadows: lightShadows,
  components: sharedComponents,
});

export const darkTheme = createTheme({
  ...sharedOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: themeTokens.colors.primary,
      dark: themeTokens.colors.primaryActive,
    },
    secondary: {
      main: themeTokens.colors.secondary,
    },
    success: {
      main: themeTokens.colors.success,
      dark: themeTokens.colors.successHover,
      light: darkTokens.statusBg.success,
    },
    warning: {
      main: themeTokens.colors.warning,
      light: darkTokens.statusBg.warning,
    },
    error: {
      main: themeTokens.colors.error,
      light: darkTokens.statusBg.error,
    },
    info: {
      main: darkTokens.neutral[500],
    },
    background: {
      default: darkTokens.semantic.surface,
      paper: darkTokens.semantic.surfaceElevated,
    },
    text: {
      primary: darkTokens.neutral[800],
      secondary: darkTokens.neutral[500],
      disabled: darkTokens.neutral[400],
    },
    divider: darkTokens.neutral[200],
    action: {
      hover: darkTokens.semantic.selectedLight,
      selected: darkTokens.semantic.selected,
    },
  },
  shadows: darkShadows,
  components: sharedComponents,
});

// Backward compat — existing imports of `muiTheme` continue to work
export const muiTheme = lightTheme;

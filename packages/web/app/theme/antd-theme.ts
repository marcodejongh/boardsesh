import type { ThemeConfig } from 'antd';
import { themeTokens } from './theme-config';

export const antdTheme: ThemeConfig = {
  token: {
    // Primary colors
    colorPrimary: themeTokens.colors.primary,
    colorSuccess: themeTokens.colors.success,
    colorWarning: themeTokens.colors.warning,
    colorError: themeTokens.colors.error,
    colorInfo: themeTokens.neutral[500],

    // Typography
    fontFamily: themeTokens.typography.fontFamily,
    fontSize: themeTokens.typography.fontSize.base,

    // Border radius
    borderRadius: themeTokens.borderRadius.md,
    borderRadiusLG: themeTokens.borderRadius.lg,
    borderRadiusSM: themeTokens.borderRadius.sm,

    // Shadows
    boxShadow: themeTokens.shadows.sm,
    boxShadowSecondary: themeTokens.shadows.md,

    // Background colors
    colorBgContainer: themeTokens.semantic.surface,
    colorBgLayout: themeTokens.semantic.background,
    colorBgElevated: themeTokens.semantic.surfaceElevated,

    // Text colors
    colorText: themeTokens.neutral[800],
    colorTextSecondary: themeTokens.neutral[500],
    colorTextTertiary: themeTokens.neutral[400],
    colorTextQuaternary: themeTokens.neutral[300],

    // Border colors
    colorBorder: themeTokens.neutral[200],
    colorBorderSecondary: themeTokens.neutral[100],

    // Link colors
    colorLink: themeTokens.colors.primary,
    colorLinkHover: themeTokens.colors.primaryHover,
    colorLinkActive: themeTokens.colors.primaryActive,

    // Control heights
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },

  components: {
    Button: {
      borderRadius: themeTokens.borderRadius.md,
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 48,
      paddingContentHorizontal: 16,
      fontWeight: themeTokens.typography.fontWeight.medium,
    },

    Card: {
      borderRadiusLG: themeTokens.borderRadius.lg,
      boxShadowTertiary: themeTokens.shadows.sm,
      paddingLG: 20,
    },

    Input: {
      borderRadius: themeTokens.borderRadius.md,
      controlHeight: 40,
      paddingInline: 12,
    },

    Select: {
      borderRadius: themeTokens.borderRadius.md,
      controlHeight: 40,
    },

    Drawer: {
      borderRadiusLG: themeTokens.borderRadius.lg,
    },

    Modal: {
      borderRadiusLG: themeTokens.borderRadius.lg,
    },

    Layout: {
      headerBg: themeTokens.semantic.surface,
      bodyBg: themeTokens.semantic.background,
      siderBg: themeTokens.semantic.surface,
    },

    Menu: {
      borderRadius: themeTokens.borderRadius.md,
      itemBorderRadius: themeTokens.borderRadius.sm,
    },

    Dropdown: {
      borderRadiusLG: themeTokens.borderRadius.md,
    },

    Form: {
      labelFontSize: themeTokens.typography.fontSize.sm,
      verticalLabelPadding: '0 0 8px',
    },

    Typography: {
      titleMarginBottom: '0.5em',
      titleMarginTop: 0,
    },

    Collapse: {
      borderRadiusLG: themeTokens.borderRadius.md,
      headerBg: themeTokens.neutral[50],
    },

    Tabs: {
      cardBg: themeTokens.neutral[50],
      itemSelectedColor: themeTokens.colors.primary,
    },

    Tag: {
      borderRadiusSM: themeTokens.borderRadius.sm,
    },

    Rate: {
      starColor: '#FBBF24', // Amber-400 for stars
    },
  },
};

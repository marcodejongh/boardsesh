'use client';

import React, { useMemo, useCallback } from 'react';
import MuiSwipeableDrawer from '@mui/material/SwipeableDrawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './swipeable-drawer.module.css';

type Placement = 'left' | 'right' | 'top' | 'bottom';

export interface SwipeableDrawerProps {
  swipeEnabled?: boolean;
  showDragHandle?: boolean;
  // Drawer props
  open?: boolean;
  onClose?: (e?: React.MouseEvent | React.KeyboardEvent) => void;
  placement?: Placement;
  title?: React.ReactNode;
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  onTransitionEnd?: (open: boolean) => void;
  styles?: {
    wrapper?: React.CSSProperties;
    body?: React.CSSProperties;
    header?: React.CSSProperties;
    footer?: React.CSSProperties;
    mask?: React.CSSProperties;
  };
  rootClassName?: string;
  className?: string;
  height?: string | number;
  width?: string | number;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
  disablePortal?: boolean;
  keepMounted?: boolean;
  children?: React.ReactNode;
}

const SwipeableDrawer: React.FC<SwipeableDrawerProps> = ({
  swipeEnabled,
  showDragHandle = true,
  placement = 'bottom',
  showCloseButton,
  onClose,
  onTransitionEnd: userOnTransitionEnd,
  styles: userStyles,
  rootClassName: userRootClassName,
  className,
  title: userTitle,
  height,
  width,
  extra,
  footer,
  disablePortal,
  keepMounted = true,
  disableBackdropClick,
  open,
  children,
}) => {
  // If swipeEnabled is explicitly passed, use it directly.
  // Otherwise, disable swipe when showCloseButton is explicitly false.
  const effectiveSwipeEnabled = swipeEnabled ?? (showCloseButton !== false);

  const rootClassName = userRootClassName
    ? `${styles.mobileHideClose} ${userRootClassName}`
    : className
      ? `${styles.mobileHideClose} ${className}`
      : styles.mobileHideClose;

  const isVerticalPlacement = placement === 'top' || placement === 'bottom';

  const horizontalDragHandle = useMemo(() => showDragHandle ? (
    <div className={styles.dragHandleZoneHorizontal}>
      <div className={styles.dragHandleBarHorizontal} />
    </div>
  ) : null, [showDragHandle]);

  const verticalDragHandle = useMemo(() => effectiveSwipeEnabled && showDragHandle ? (
    <div
      className={
        placement === 'left'
          ? styles.dragHandleZoneRight
          : styles.dragHandleZoneLeft
      }
    >
    </div>
  ) : null, [effectiveSwipeEnabled, showDragHandle, placement]);

  // For vertical placement (top/bottom) with a title:
  // Inject the drag handle into the title so it appears above the header content.
  const handleInHeader = isVerticalPlacement && userTitle !== undefined && userTitle !== null;

  // For top-placed drawers without a title, render drag handle below footer (always visible)
  const hasExternalBottomHandle = placement === 'top' && !handleInHeader && showDragHandle;

  // Build the header element if title is provided
  const headerElement = useMemo(() => {
    if (userTitle === undefined || userTitle === null) {
      return null;
    }

    const titleContent = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${themeTokens.spacing[4]}px ${themeTokens.spacing[6]}px`,
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
          ...userStyles?.header,
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: themeTokens.typography.fontWeight.semibold, fontSize: themeTokens.typography.fontSize.base }}>
          {userTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {extra}
        </Box>
      </Box>
    );

    if (!handleInHeader) return titleContent;

    if (placement === 'bottom') {
      return (
        <div className={styles.titleWithHandle}>
          {horizontalDragHandle}
          {titleContent}
        </div>
      );
    }
    // placement === 'top': handle below title
    return (
      <div className={styles.titleWithHandle}>
        {titleContent}
        {horizontalDragHandle}
      </div>
    );
  }, [userTitle, extra, placement, handleInHeader, horizontalDragHandle, userStyles?.header]);

  const wrappedChildren = useMemo(() => {
    if (handleInHeader) {
      return children;
    }

    // Handle in body for non-titled drawers or horizontal placements
    return (
      <>
        {(placement === 'bottom' || placement === 'left') && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
        {children}
        {(placement === 'right' || (placement === 'top' && !hasExternalBottomHandle)) && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
      </>
    );
  }, [placement, horizontalDragHandle, verticalDragHandle, handleInHeader, isVerticalPlacement, children, hasExternalBottomHandle]);

  // Compute paper dimensions from height/width/styles.wrapper
  const paperSx = useMemo(() => {
    const sx: Record<string, unknown> = {};

    // Apply wrapper styles (styles.wrapper → MUI PaperProps.sx)
    if (userStyles?.wrapper) {
      Object.assign(sx, userStyles.wrapper);
    }

    // height/width props take precedence if not already set
    if (height && !sx.height) {
      sx.height = height;
    }
    if (width && !sx.width) {
      sx.width = width;
    }

    return sx;
  }, [userStyles?.wrapper, height, width]);

  // SwipeableDrawer onClose handler
  const handleSwipeableClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Callback that controls whether swipe gestures are recognized
  const allowSwipeInChildren = useCallback(() => effectiveSwipeEnabled, [effectiveSwipeEnabled]);

  // No-op onOpen handler — we manage open state externally
  const handleOpen = useCallback(() => {
    // Intentionally empty: opening is controlled by parent state
  }, []);

  const slideProps = useMemo(() => ({
    onExited: () => userOnTransitionEnd?.(false),
    onEntered: () => userOnTransitionEnd?.(true),
  }), [userOnTransitionEnd]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const slotProps = useMemo(
    () => ({
      backdrop: {
        ...(userStyles?.mask ? { style: userStyles.mask } : {}),
        ...(disableBackdropClick ? { onClick: handleBackdropClick } : {}),
      },
    }),
    [userStyles?.mask, disableBackdropClick, handleBackdropClick],
  );

  const muiPaperProps = useMemo(
    () => ({ sx: paperSx }),
    [paperSx],
  );

  const bodyContent = (
    <>
      {headerElement}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'auto',
          padding: `${themeTokens.spacing[6]}px`,
          ...userStyles?.body,
        }}
      >
        {wrappedChildren}
      </Box>
      {footer && (
        <Box
          sx={{
            padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[4]}px`,
            borderTop: `1px solid ${themeTokens.neutral[200]}`,
            ...userStyles?.footer,
          }}
        >
          {footer}
        </Box>
      )}
      {hasExternalBottomHandle && horizontalDragHandle}
    </>
  );

  return (
    <MuiSwipeableDrawer
      anchor={placement}
      open={open ?? false}
      onClose={handleSwipeableClose}
      onOpen={handleOpen}
      className={rootClassName}
      disablePortal={disablePortal}
      keepMounted={keepMounted}
      disableSwipeToOpen
      disableDiscovery
      allowSwipeInChildren={allowSwipeInChildren}
      SlideProps={slideProps}
      slotProps={slotProps}
      PaperProps={muiPaperProps}
    >
      {bodyContent}
    </MuiSwipeableDrawer>
  );
};

export { SwipeableDrawer };
export default SwipeableDrawer;

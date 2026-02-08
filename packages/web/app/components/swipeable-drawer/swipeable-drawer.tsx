'use client';

import React, { useMemo, useCallback } from 'react';
import MuiDrawer from '@mui/material/Drawer';
import type { DrawerProps as MuiDrawerProps } from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { useSwipeToDismiss } from './use-swipe-to-dismiss';
import styles from './swipeable-drawer.module.css';

type Placement = 'left' | 'right' | 'top' | 'bottom';

export interface SwipeableDrawerProps {
  swipeRegion?: 'handle' | 'body' | 'scrollBody';
  swipeEnabled?: boolean;
  dismissThreshold?: number;
  dismissAnimationMs?: number;
  showDragHandle?: boolean;
  scrollBodyRef?: React.RefObject<HTMLElement | null>;
  // Mapped from AntD Drawer props
  open?: boolean;
  onClose?: (e?: React.MouseEvent | React.KeyboardEvent) => void;
  placement?: Placement;
  title?: React.ReactNode;
  closable?: boolean;
  maskClosable?: boolean;
  afterOpenChange?: (open: boolean) => void;
  styles?: {
    wrapper?: React.CSSProperties;
    body?: React.CSSProperties;
    header?: React.CSSProperties;
    footer?: React.CSSProperties;
    mask?: React.CSSProperties;
  };
  rootClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  width?: string | number;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
  getContainer?: false;
  push?: boolean;
  destroyOnClose?: boolean;
  children?: React.ReactNode;
  /** @deprecated Use zIndex on the MUI Drawer directly */
  zIndex?: number;
}

function mergeStyles(
  base: React.CSSProperties | undefined,
  override: React.CSSProperties | undefined,
): React.CSSProperties | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...override };
}

type DrawerStylesObject = Partial<Record<string, React.CSSProperties>>;

function mergeDrawerStyles(
  userStyles: SwipeableDrawerProps['styles'],
  hookStyles: DrawerStylesObject | undefined,
): SwipeableDrawerProps['styles'] {
  if (!userStyles && !hookStyles) return undefined;
  const u = (userStyles || {}) as DrawerStylesObject;
  const h = hookStyles || {};
  return {
    ...u,
    mask: mergeStyles(u.mask, h.mask),
    wrapper: mergeStyles(u.wrapper, h.wrapper),
    body: mergeStyles(u.body, h.body),
  };
}

const SwipeableDrawer: React.FC<SwipeableDrawerProps> = ({
  swipeRegion = 'handle',
  swipeEnabled,
  dismissThreshold,
  dismissAnimationMs,
  showDragHandle = true,
  scrollBodyRef,
  placement = 'bottom',
  closable,
  onClose,
  afterOpenChange: userAfterOpenChange,
  style: userStyle,
  styles: userStyles,
  rootClassName: userRootClassName,
  className,
  title: userTitle,
  height,
  width,
  extra,
  footer,
  getContainer,
  push: _push,
  destroyOnClose,
  maskClosable,
  open,
  zIndex,
  children,
}) => {
  // If swipeEnabled is explicitly passed, use it directly.
  // Otherwise, disable swipe when closable is explicitly false.
  const effectiveEnabled = swipeEnabled ?? (closable !== false);

  const {
    handleRegionProps,
    bodyRegionProps,
    getDrawerStyle,
    getDrawerStyles,
    afterOpenChange: hookAfterOpenChange,
  } = useSwipeToDismiss({
    placement,
    onClose: onClose ? () => onClose(undefined as unknown as React.MouseEvent) : undefined,
    dismissThreshold,
    dismissAnimationMs,
    enabled: effectiveEnabled,
    swipeRegion,
    scrollBodyRef,
  });

  const handleAfterOpenChange = useCallback((open: boolean) => {
    hookAfterOpenChange(open);
    userAfterOpenChange?.(open);
  }, [hookAfterOpenChange, userAfterOpenChange]);

  const hookDrawerStyle = getDrawerStyle();
  const hookDrawerStyles = getDrawerStyles();

  const mergedStyle = useMemo(
    () => mergeStyles(userStyle, hookDrawerStyle),
    [userStyle, hookDrawerStyle],
  );

  const mergedStyles = useMemo(
    () => mergeDrawerStyles(userStyles, hookDrawerStyles),
    [userStyles, hookDrawerStyles],
  );

  const rootClassName = userRootClassName
    ? `${styles.mobileHideClose} ${userRootClassName}`
    : className
      ? `${styles.mobileHideClose} ${className}`
      : styles.mobileHideClose;

  const isVerticalPlacement = placement === 'top' || placement === 'bottom';

  const horizontalDragHandle = useMemo(() => effectiveEnabled && showDragHandle ? (
    <div
      {...handleRegionProps}
      className={styles.dragHandleZoneHorizontal}
    >
      <div className={styles.dragHandleBarHorizontal} />
    </div>
  ) : null, [effectiveEnabled, showDragHandle, handleRegionProps]);

  const verticalDragHandle = useMemo(() => effectiveEnabled && showDragHandle ? (
    <div
      {...handleRegionProps}
      className={
        placement === 'left'
          ? styles.dragHandleZoneRight
          : styles.dragHandleZoneLeft
      }
    >
    </div>
  ) : null, [effectiveEnabled, showDragHandle, handleRegionProps, placement]);

  // For vertical placement (top/bottom) with a title:
  // Inject the drag handle into the title so it appears above the header content.
  const handleInHeader = isVerticalPlacement && userTitle !== undefined && userTitle !== null;

  // Build the header element if title is provided
  const headerElement = useMemo(() => {
    if (userTitle === undefined || userTitle === null) {
      // No title: check if we need close button
      if (closable !== false) {
        return null; // No header, but close will be handled differently
      }
      return null;
    }

    const titleContent = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--neutral-200, #e8e8e8)',
          ...mergedStyles?.header,
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '16px' }}>
          {userTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {extra}
          {closable !== false && (
            <IconButton onClick={(e) => onClose?.(e)} size="small">
              <CloseOutlined fontSize="small" />
            </IconButton>
          )}
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
  }, [userTitle, closable, extra, onClose, placement, handleInHeader, horizontalDragHandle, mergedStyles?.header]);

  const wrappedChildren = useMemo(() => {
    if (swipeRegion === 'body' && effectiveEnabled) {
      return (
        <div {...(bodyRegionProps || {})} className={styles.bodySwipeWrapper}>
          {!handleInHeader && placement === 'bottom' && horizontalDragHandle}
          {children}
          {!handleInHeader && placement === 'top' && horizontalDragHandle}
        </div>
      );
    }

    // For scrollBody mode: render like handle mode (drag handle + children, no touch-action wrapper)
    // Native touch events on scrollBodyRef handle the dismiss gesture
    // For handle mode: only render handle in body if NOT already in header
    if (handleInHeader) {
      return children;
    }

    // Handle/scrollBody mode without title, or horizontal placement: handle in body
    return (
      <>
        {(placement === 'bottom' || placement === 'left') && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
        {children}
        {(placement === 'top' || placement === 'right') && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
      </>
    );
  }, [swipeRegion, effectiveEnabled, bodyRegionProps, placement, horizontalDragHandle, verticalDragHandle, handleInHeader, isVerticalPlacement, children]);

  // Compute paper dimensions from height/width/styles.wrapper
  const paperSx = useMemo(() => {
    const sx: Record<string, unknown> = {};

    // Apply wrapper styles (AntD styles.wrapper → MUI PaperProps.sx)
    if (mergedStyles?.wrapper) {
      Object.assign(sx, mergedStyles.wrapper);
    }

    // height/width props take precedence if not already set
    if (height && !sx.height) {
      sx.height = height;
    }
    if (width && !sx.width) {
      sx.width = width;
    }

    // Apply transform from swipe hook
    if (mergedStyle?.transform) {
      sx.transform = `${mergedStyle.transform} !important`;
    }
    if (mergedStyle?.transition) {
      sx.transition = mergedStyle.transition;
    }

    return sx;
  }, [mergedStyles?.wrapper, height, width, mergedStyle?.transform, mergedStyle?.transition]);

  // Backdrop sx from mask styles
  const backdropSx = useMemo(() => {
    if (!mergedStyles?.mask) return undefined;
    return mergedStyles.mask;
  }, [mergedStyles?.mask]);

  const handleMuiClose: MuiDrawerProps['onClose'] = useCallback((_event: object, reason: string) => {
    if (reason === 'backdropClick' && maskClosable === false) {
      return;
    }
    onClose?.();
  }, [onClose, maskClosable]);

  return (
    <MuiDrawer
      anchor={placement}
      open={open}
      onClose={handleMuiClose}
      className={rootClassName}
      disablePortal={getContainer === false}
      keepMounted={!destroyOnClose}
      SlideProps={{
        onExited: () => handleAfterOpenChange(false),
        onEntered: () => handleAfterOpenChange(true),
      }}
      slotProps={{
        backdrop: backdropSx ? { sx: backdropSx } : undefined,
      }}
      PaperProps={{
        sx: paperSx,
      }}
      sx={zIndex ? { zIndex } : undefined}
    >
      {headerElement}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          ...mergedStyles?.body,
        }}
      >
        {wrappedChildren}
      </Box>
      {footer && (
        <Box
          sx={{
            padding: '10px 16px',
            borderTop: '1px solid var(--neutral-200, #e8e8e8)',
            ...mergedStyles?.footer,
          }}
        >
          {footer}
        </Box>
      )}
    </MuiDrawer>
  );
};

export { SwipeableDrawer };
export default SwipeableDrawer;

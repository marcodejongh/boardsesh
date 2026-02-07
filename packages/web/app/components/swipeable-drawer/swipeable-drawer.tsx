'use client';

import React, { useMemo } from 'react';
import { Drawer } from 'antd';
import type { DrawerProps } from 'antd';
import { useSwipeToDismiss } from './use-swipe-to-dismiss';
import styles from './swipeable-drawer.module.css';

export interface SwipeableDrawerProps extends DrawerProps {
  swipeRegion?: 'handle' | 'body';
  swipeEnabled?: boolean;
  dismissThreshold?: number;
  dismissAnimationMs?: number;
  showDragHandle?: boolean;
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
  userStyles: DrawerProps['styles'],
  hookStyles: DrawerStylesObject | undefined,
): DrawerProps['styles'] {
  if (!userStyles && !hookStyles) return undefined;
  const u = (typeof userStyles === 'function' ? {} : userStyles || {}) as DrawerStylesObject;
  const h = hookStyles || {};
  return {
    ...u,
    mask: mergeStyles(u.mask, h.mask),
    wrapper: mergeStyles(u.wrapper, h.wrapper),
    body: mergeStyles(u.body, h.body),
  } as DrawerProps['styles'];
}

const SwipeableDrawer: React.FC<SwipeableDrawerProps> = ({
  swipeRegion = 'handle',
  swipeEnabled,
  dismissThreshold,
  dismissAnimationMs,
  showDragHandle = true,
  placement = 'bottom',
  closable,
  onClose,
  afterOpenChange: userAfterOpenChange,
  style: userStyle,
  styles: userStyles,
  rootClassName: userRootClassName,
  title: userTitle,
  children,
  ...rest
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
    onClose: onClose as (() => void) | undefined,
    dismissThreshold,
    dismissAnimationMs,
    enabled: effectiveEnabled,
    swipeRegion,
  });

  const handleAfterOpenChange = (open: boolean) => {
    hookAfterOpenChange(open);
    userAfterOpenChange?.(open);
  };

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
    : styles.mobileHideClose;

  const isVerticalPlacement = placement === 'top' || placement === 'bottom';

  const horizontalDragHandle = effectiveEnabled && showDragHandle ? (
    <div
      {...handleRegionProps}
      className={styles.dragHandleZoneHorizontal}
    >
      <div className={styles.dragHandleBarHorizontal} />
    </div>
  ) : null;

  const verticalDragHandle = effectiveEnabled && showDragHandle ? (
    <div
      {...handleRegionProps}
      className={
        placement === 'left'
          ? styles.dragHandleZoneLeft
          : styles.dragHandleZoneRight
      }
    >
      <div className={styles.dragHandleBarVertical} />
    </div>
  ) : null;

  // For vertical placement (top/bottom) with a title:
  // Inject the drag handle into the title so it appears above the header content.
  // This applies to both handle and body modes — the AntD header always renders above the body.
  const handleInHeader = isVerticalPlacement && userTitle !== undefined && userTitle !== null;

  const drawerTitle = useMemo(() => {
    if (!handleInHeader) return userTitle;

    if (placement === 'bottom') {
      return (
        <div className={styles.titleWithHandle}>
          {horizontalDragHandle}
          <div className={styles.titleContent}>{userTitle}</div>
        </div>
      );
    }
    // placement === 'top': handle below title
    return (
      <div className={styles.titleWithHandle}>
        <div className={styles.titleContent}>{userTitle}</div>
        {horizontalDragHandle}
      </div>
    );
  }, [handleInHeader, userTitle, placement, horizontalDragHandle]);

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

    // For handle mode: only render handle in body if NOT already in header
    if (handleInHeader) {
      return children;
    }

    // Handle mode without title, or horizontal placement: handle in body
    return (
      <>
        {(placement === 'bottom' || placement === 'left') && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
        {children}
        {(placement === 'top' || placement === 'right') && (isVerticalPlacement ? horizontalDragHandle : verticalDragHandle)}
      </>
    );
  }, [swipeRegion, effectiveEnabled, bodyRegionProps, placement, horizontalDragHandle, verticalDragHandle, handleInHeader, isVerticalPlacement, children]);

  return (
    <Drawer
      placement={placement}
      closable={closable}
      onClose={onClose}
      afterOpenChange={handleAfterOpenChange}
      style={mergedStyle}
      styles={mergedStyles}
      rootClassName={rootClassName}
      title={drawerTitle}
      {...rest}
    >
      {wrappedChildren}
    </Drawer>
  );
};

export { SwipeableDrawer };
export default SwipeableDrawer;

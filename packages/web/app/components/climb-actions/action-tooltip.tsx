'use client';

import React from 'react';
import MuiTooltip from '@mui/material/Tooltip';
import type { TooltipProps as MuiTooltipProps } from '@mui/material/Tooltip';

type ActionTooltipProps = Pick<MuiTooltipProps, 'title' | 'placement' | 'children'>;

/**
 * A tooltip wrapper for action buttons that disables tooltips on touch devices.
 *
 * On touch devices (mobile), the default Tooltip behavior intercepts the first tap
 * to show the tooltip, requiring a second tap to actually trigger the action.
 * This component disables the tooltip trigger on touch devices so clicks work immediately.
 */
export function ActionTooltip({ children, ...props }: ActionTooltipProps) {
  // Use CSS media query to detect touch devices
  // hover: none means the device doesn't have hover capability (touch device)
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    // Check if device has no hover capability (touch device)
    const mediaQuery = window.matchMedia('(hover: none)');
    setIsTouchDevice(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // On touch devices, render children without tooltip wrapper
  // This ensures taps immediately trigger the action
  if (isTouchDevice) {
    return <>{children}</>;
  }

  return <MuiTooltip {...props}>{children}</MuiTooltip>;
}

export default ActionTooltip;

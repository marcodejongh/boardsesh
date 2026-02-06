'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tour, type TourProps } from 'antd';
import { usePathname } from 'next/navigation';

const TOUR_STORAGE_KEY = 'boardsesh-onboarding-completed';

/**
 * Onboarding tour that shows on the list page for first-time users.
 * Uses Ant Design Tour with constrained step widths and avoids
 * anchoring on interactive elements like the climb card header.
 */
export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourProps['steps']>([]);
  const pathname = usePathname();

  const isListPage = pathname.includes('/list');

  useEffect(() => {
    // Only show on the list page
    if (!isListPage) return;

    // Check if user has already completed the tour
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    } catch {
      // localStorage not available
      return;
    }

    // Wait for DOM elements to render
    const timer = setTimeout(() => {
      const queueBar = document.querySelector('[data-testid="queue-control-bar"]') as HTMLElement;
      const illuminateButton = document.getElementById('button-illuminate');
      const firstClimbCardBody = document.querySelector('[data-testid="climb-card"] .ant-card-body') as HTMLElement;

      const tourSteps: NonNullable<TourProps['steps']> = [
        {
          title: 'Welcome to Boardsesh!',
          description:
            'Browse climbs, build a queue, and control your board. Let\u2019s take a quick look around.',
          // No target = centered overlay
        },
      ];

      if (firstClimbCardBody) {
        tourSteps.push({
          title: 'Select a Climb',
          description:
            'Double-tap the board image to select a climb. It will appear in the queue bar at the bottom.',
          target: () => firstClimbCardBody,
          placement: 'bottom',
        });
      }

      if (queueBar) {
        tourSteps.push({
          title: 'Queue & Navigation',
          description:
            'Your current climb shows here. Swipe or use arrows to move through your queue.',
          target: () => queueBar,
          placement: 'top',
        });
      }

      if (illuminateButton) {
        tourSteps.push({
          title: 'Light Up the Board',
          description:
            'Connect via Bluetooth to illuminate holds on your board for the selected climb.',
          target: () => illuminateButton,
          placement: 'bottom',
        });
      }

      setSteps(tourSteps);
      setOpen(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [isListPage]);

  const handleClose = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  if (!isListPage || steps.length === 0) return null;

  return (
    <Tour
      open={open}
      onClose={handleClose}
      onFinish={handleClose}
      steps={steps}
      rootClassName="onboarding-tour"
      scrollIntoViewOptions={{ block: 'center' }}
    />
  );
}

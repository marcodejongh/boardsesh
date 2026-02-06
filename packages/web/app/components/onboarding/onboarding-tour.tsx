'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tour, TourStepProps } from 'antd';
import {
  SwapOutlined,
  BulbOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  ColumnWidthOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  HeatMapOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { shouldShowOnboarding, saveOnboardingStatus } from '@/app/lib/onboarding-db';
import styles from './onboarding-tour.module.css';

// Delay in ms before the tour starts after the page loads
const TOUR_START_DELAY = 800;
// Delay in ms for drawer open/close animation
const DRAWER_ANIMATION_DELAY = 450;

// Helper to create a target function with the correct type for AntD Tour
const getTarget = (selector: string): (() => HTMLElement) | null => {
  return (() => document.querySelector<HTMLElement>(selector)!) as (() => HTMLElement) | null;
};

const OnboardingTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { data: session } = useSession();
  const drawerOpenedByTour = useRef(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    // Only show on mobile
    const checkMobile = () => {
      isMobileRef.current = window.matchMedia('(max-width: 768px)').matches;
    };
    checkMobile();

    if (!isMobileRef.current) return;

    const checkOnboarding = async () => {
      const userId = session?.user?.id;
      const shouldShow = await shouldShowOnboarding(userId);
      if (shouldShow) {
        // Wait for the page to settle before showing the tour
        setTimeout(() => {
          // Double-check that the climb card exists (page has loaded)
          const climbCard = document.getElementById('onboarding-climb-card');
          if (climbCard) {
            setOpen(true);
          }
        }, TOUR_START_DELAY);
      }
    };

    checkOnboarding();
  }, [session?.user?.id]);

  const handleClose = useCallback(async () => {
    // Close the drawer if it was opened by the tour
    if (drawerOpenedByTour.current) {
      const toggle = document.getElementById('onboarding-queue-toggle');
      if (toggle) toggle.click();
      drawerOpenedByTour.current = false;
    }

    setOpen(false);
    setCurrent(0);

    // Save completion status
    const userId = session?.user?.id;
    await saveOnboardingStatus(userId);
  }, [session?.user?.id]);

  const handleStepChange = useCallback((step: number) => {
    // Steps 4-6 are inside the queue drawer (swipe actions, drag & drop, close drawer)
    const QUEUE_DRAWER_OPEN_STEP = 4;
    const QUEUE_DRAWER_CLOSE_STEP = 7;

    // Opening the queue drawer before step 5 (index 4)
    if (step === QUEUE_DRAWER_OPEN_STEP && !drawerOpenedByTour.current) {
      const toggle = document.getElementById('onboarding-queue-toggle');
      if (toggle) {
        toggle.click();
        drawerOpenedByTour.current = true;
      }
      // Delay step transition to let drawer animate in
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    // Close the queue drawer when moving to the step after drawer section
    if (step === QUEUE_DRAWER_CLOSE_STEP && drawerOpenedByTour.current) {
      const toggle = document.getElementById('onboarding-queue-toggle');
      if (toggle) {
        toggle.click();
        drawerOpenedByTour.current = false;
      }
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    // Going backwards out of the drawer section - close drawer
    if (step === QUEUE_DRAWER_OPEN_STEP - 1 && drawerOpenedByTour.current) {
      const toggle = document.getElementById('onboarding-queue-toggle');
      if (toggle) {
        toggle.click();
        drawerOpenedByTour.current = false;
      }
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    setCurrent(step);
  }, []);

  const tourSteps: TourStepProps[] = [
    {
      title: 'Select a Climb',
      description: 'Double-tap any climb card to make it the active climb and add it to your queue.',
      target: getTarget('#onboarding-climb-card'),
      cover: (
        <div className={styles.stepIcon}>
          <SwapOutlined />
        </div>
      ),
    },
    {
      title: 'Board Controls',
      description:
        'Use the light button to illuminate holds on your board via Bluetooth, or start a party session to climb with friends.',
      target: getTarget('#onboarding-party-light-buttons'),
      cover: (
        <div className={styles.stepIcon}>
          <BulbOutlined />
          <TeamOutlined />
        </div>
      ),
    },
    {
      title: 'Navigate Your Queue',
      description: 'Swipe left or right on this bar to go to the next or previous climb in your queue.',
      target: getTarget('#onboarding-queue-bar'),
      cover: (
        <div className={styles.stepIcon}>
          <ColumnWidthOutlined />
        </div>
      ),
    },
    {
      title: 'View Your Queue',
      description: 'Tap here to open the queue drawer and see all your climbs, history, and suggestions.',
      target: getTarget('#onboarding-queue-toggle'),
      cover: (
        <div className={styles.stepIcon}>
          <UnorderedListOutlined />
        </div>
      ),
    },
    {
      title: 'Queue Item Actions',
      description:
        'Swipe queue items left to remove them from the queue, or swipe right to log an ascent.',
      target: getTarget('[data-testid="queue-item"]'),
      cover: (
        <div className={styles.stepIcon}>
          <ColumnWidthOutlined />
        </div>
      ),
    },
    {
      title: 'Reorder Your Queue',
      description:
        'Press and hold a queue item, then drag it up or down to reorder your queue.',
      target: getTarget('[data-testid="queue-item"]'),
      cover: (
        <div className={styles.stepIcon}>
          <DragOutlined />
        </div>
      ),
    },
    {
      title: 'Close the Queue',
      description: 'Tap outside the drawer to close it and return to the climb list.',
      target: null,
      cover: (
        <div className={styles.stepIcon}>
          <CloseCircleOutlined />
        </div>
      ),
    },
    {
      title: 'Search by Hold',
      description:
        'Open the search panel and use the "Search by Hold" tab to find climbs that use specific holds on the board.',
      target: getTarget('#onboarding-search-button'),
      cover: (
        <div className={styles.stepIcon}>
          <SearchOutlined />
        </div>
      ),
    },
    {
      title: 'Heatmap',
      description:
        'The heatmap shows how frequently each hold is used across matching climbs. It uses your current search filters (grades, ascents, etc.), so adjust those first to see relevant hold usage.',
      target: getTarget('#onboarding-search-button'),
      cover: (
        <div className={styles.stepIcon}>
          <HeatMapOutlined />
        </div>
      ),
    },
  ];

  if (!open) return null;

  return (
    <Tour
      open={open}
      current={current}
      onChange={handleStepChange}
      onClose={handleClose}
      onFinish={handleClose}
      steps={tourSteps}
      scrollIntoViewOptions={{ behavior: 'smooth', block: 'center' }}
      zIndex={1100}
    />
  );
};

export default OnboardingTour;

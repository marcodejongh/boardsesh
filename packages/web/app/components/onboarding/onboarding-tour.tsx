'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Backdrop from '@mui/material/Backdrop';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import {
  FormatListBulletedOutlined,
  ViewWeekOutlined,
  CancelOutlined,
  SearchOutlined,
  GridOnOutlined,
  DragIndicatorOutlined,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { shouldShowOnboarding, saveOnboardingStatus } from '@/app/lib/onboarding-db';
import styles from './onboarding-tour.module.css';

// Delay in ms before the tour starts after the page loads
const TOUR_START_DELAY = 800;
// Delay in ms for drawer open/close animation
const DRAWER_ANIMATION_DELAY = 450;

// Custom event name for controlling the queue drawer from the tour
export const TOUR_DRAWER_EVENT = 'onboarding-tour:set-queue-drawer';

// Helper to create a target function that resolves a CSS selector to an element
const getTarget = (selector: string): (() => HTMLElement) | null => {
  return (() => document.querySelector<HTMLElement>(selector)!) as (() => HTMLElement) | null;
};

// Dispatch a custom event to open/close the queue drawer
const setTourDrawer = (open: boolean) => {
  window.dispatchEvent(new CustomEvent(TOUR_DRAWER_EVENT, { detail: { open } }));
};

interface TourStep {
  title: string;
  description: React.ReactNode;
  target: (() => HTMLElement) | null;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  mask?: boolean;
  cover?: React.ReactNode;
}

function CustomTour({
  open,
  current,
  steps,
  onStepChange,
  onClose,
}: {
  open: boolean;
  current: number;
  steps: TourStep[];
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const step = steps[current];
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = step?.target?.() || null;
    setTargetEl(el);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [current, open, step]);

  if (!open) return null;

  const stepContent = (
    <>
      {step.cover}
      <MuiTypography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{step.title}</MuiTypography>
      <MuiTypography variant="body2" component="div" color="text.secondary">{step.description}</MuiTypography>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
        {current > 0 && <MuiButton size="small" onClick={() => onStepChange(current - 1)}>Back</MuiButton>}
        {current < steps.length - 1
          ? <MuiButton size="small" variant="contained" onClick={() => onStepChange(current + 1)}>Next</MuiButton>
          : <MuiButton size="small" variant="contained" onClick={onClose}>Done</MuiButton>}
      </Stack>
    </>
  );

  return (
    <>
      <Backdrop open sx={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {targetEl ? (
        <Popper
          open
          anchorEl={targetEl}
          placement={step.placement || 'bottom'}
          sx={{ zIndex: 1101 }}
          modifiers={[{ name: 'offset', options: { offset: [0, 12] } }]}
        >
          <Paper sx={{ p: 2, maxWidth: 320, borderRadius: 2 }}>
            {stepContent}
          </Paper>
        </Popper>
      ) : (
        <Paper sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1101,
          p: 2,
          maxWidth: 320,
          borderRadius: 2,
        }}>
          {stepContent}
        </Paper>
      )}

      {targetEl && step.mask !== false && (
        <Box
          sx={{
            position: 'fixed',
            ...(() => {
              const r = targetEl.getBoundingClientRect();
              return { top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 };
            })(),
            border: '2px solid',
            borderColor: 'primary.main',
            borderRadius: 1,
            zIndex: 1101,
            pointerEvents: 'none',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </>
  );
}

const isOnboardingTourEnabled = process.env.NEXT_PUBLIC_ENABLE_ONBOARDING_TOUR === 'true';

const OnboardingTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { data: session } = useSession();
  const drawerOpenedByTour = useRef(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    if (!isOnboardingTourEnabled) return;

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
      setTourDrawer(false);
      drawerOpenedByTour.current = false;
    }

    setOpen(false);
    setCurrent(0);

    // Save completion status
    const userId = session?.user?.id;
    await saveOnboardingStatus(userId);
  }, [session?.user?.id]);

  const handleStepChange = useCallback((step: number) => {
    // Steps 3-5 are inside the queue drawer (swipe actions, drag & drop, close drawer)
    const QUEUE_DRAWER_OPEN_STEP = 3;
    const QUEUE_DRAWER_CLOSE_STEP = 6;

    // Opening the queue drawer before step 5 (index 4)
    if (step === QUEUE_DRAWER_OPEN_STEP && !drawerOpenedByTour.current) {
      setTourDrawer(true);
      drawerOpenedByTour.current = true;
      // Delay step transition to let drawer animate in
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    // Close the queue drawer when moving to the step after drawer section
    if (step === QUEUE_DRAWER_CLOSE_STEP && drawerOpenedByTour.current) {
      setTourDrawer(false);
      drawerOpenedByTour.current = false;
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    // Going backwards out of the drawer section - close drawer
    if (step === QUEUE_DRAWER_OPEN_STEP - 1 && drawerOpenedByTour.current) {
      setTourDrawer(false);
      drawerOpenedByTour.current = false;
      setTimeout(() => setCurrent(step), DRAWER_ANIMATION_DELAY);
      return;
    }

    setCurrent(step);
  }, []);

  // Helper to wrap step description with a skip tour link
  const withSkip = (description: React.ReactNode): React.ReactNode => (
    <>
      {description}
      <div className={styles.skipLink}>
        <a onClick={handleClose}>Skip tour</a>
      </div>
    </>
  );

  const tourSteps: TourStep[] = [
    {
      title: 'Select a Climb',
      description: withSkip('Double-tap any climb card to make it the active climb and add it to your queue.'),
      target: getTarget('#onboarding-climb-card'),
      placement: 'bottom',
    },
    {
      title: 'Navigate Your Queue',
      description: withSkip('Swipe left or right on this bar to go to the next or previous climb in your queue.'),
      target: getTarget('#onboarding-queue-bar'),
      cover: (
        <div className={styles.stepIcon}>
          <ViewWeekOutlined />
        </div>
      ),
    },
    {
      title: 'View Your Queue',
      description: withSkip('Tap here to open the queue drawer and see all your climbs, history, and suggestions.'),
      target: getTarget('#onboarding-queue-toggle'),
      cover: (
        <div className={styles.stepIcon}>
          <FormatListBulletedOutlined />
        </div>
      ),
    },
    {
      title: 'Queue Item Actions',
      description: withSkip(
        'Swipe queue items left to remove them from the queue, or swipe right to log an ascent.',
      ),
      target: getTarget('[data-testid="queue-item"]'),
      mask: false,
      cover: (
        <div className={styles.stepIcon}>
          <ViewWeekOutlined />
        </div>
      ),
    },
    {
      title: 'Reorder Your Queue',
      description: withSkip(
        'Press and hold a queue item, then drag it up or down to reorder your queue.',
      ),
      target: getTarget('[data-testid="queue-item"]'),
      mask: false,
      cover: (
        <div className={styles.stepIcon}>
          <DragIndicatorOutlined />
        </div>
      ),
    },
    {
      title: 'Close the Queue',
      description: withSkip('Tap outside the drawer to close it and return to the climb list.'),
      target: null,
      mask: false,
      cover: (
        <div className={styles.stepIcon}>
          <CancelOutlined />
        </div>
      ),
    },
    {
      title: 'Search by Hold',
      description: withSkip(
        'Open the search panel and use the "Search by Hold" tab to find climbs that use specific holds on the board.',
      ),
      target: getTarget('#onboarding-search-button'),
      cover: (
        <div className={styles.stepIcon}>
          <SearchOutlined />
        </div>
      ),
    },
    {
      title: 'Heatmap',
      description: withSkip(
        'The heatmap shows how frequently each hold is used across matching climbs. It uses your current search filters (grades, ascents, etc.), so adjust those first to see relevant hold usage.',
      ),
      target: getTarget('#onboarding-search-button'),
      cover: (
        <div className={styles.stepIcon}>
          <GridOnOutlined />
        </div>
      ),
    },
  ];

  if (!isOnboardingTourEnabled || !open) return null;

  return (
    <CustomTour
      open={open}
      current={current}
      steps={tourSteps}
      onStepChange={handleStepChange}
      onClose={handleClose}
    />
  );
};

export default OnboardingTour;

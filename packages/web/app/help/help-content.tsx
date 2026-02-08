'use client';

import React from 'react';
import { Collapse, Image } from 'antd';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import {
  GridOnOutlined,
  GroupOutlined,
  ElectricBoltOutlined,
  SearchOutlined,
  ApiOutlined,
  HelpOutlineOutlined,
} from '@mui/icons-material';
import Box from '@mui/material/Box';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import styles from './help.module.css';

// Typography destructuring removed - using MUI Typography directly

const helpSections = [
  {
    key: 'visualization',
    label: (
      <span>
        <GridOnOutlined className={styles.sectionIcon} />
        Visualization & Analysis
      </span>
    ),
    children: [
      {
        key: 'heatmap',
        label: 'How do I use the heatmap feature?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/heatmap.png"
              alt="Heatmap visualization"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              The heatmap shows hold usage patterns across all climbs, helping you identify popular
              holds and training opportunities.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To access the heatmap:</Typography>
            </Typography>
            <ol>
              <li>Go to the &quot;Search by Hold&quot; tab in the side panel</li>
              <li>Click the &quot;Show Heatmap&quot; button</li>
              <li>The board will display a color overlay from green (low usage) to red (high usage)</li>
            </ol>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Available color modes:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Ascents:</Typography> Overall popularity based on total completions</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Starting Holds:</Typography> Common start positions</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Hand/Foot Holds:</Typography> Usage by limb type</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Finish Holds:</Typography> Common top-out positions</li>
            </ul>
            <Typography variant="body1" component="p">
              Use the toggle switches to show/hide hold numbers and include/exclude foot holds.
            </Typography>
          </div>
        ),
      },
      {
        key: 'hold-classification',
        label: 'How do I classify holds on my board?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/hold-classification.png"
              alt="Hold classification wizard"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              Hold classification lets you create personal ratings for each hold on your board,
              helping you understand your strengths and find suitable climbs.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Classification attributes:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Hold Type:</Typography> Jug, Sloper, Pinch, Crimp, or Pocket</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Hand Rating:</Typography> 1-5 difficulty scale for hand use</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Foot Rating:</Typography> 1-5 difficulty scale for foot use</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Pull Direction:</Typography> 0-360° optimal pulling angle</li>
            </ul>
            <Typography variant="body1" component="p">
              Classifications are personal and stored in your account, allowing you to build a
              customized understanding of your board over time.
            </Typography>
          </div>
        ),
      },
    ],
  },
  {
    key: 'collaboration',
    label: (
      <span>
        <GroupOutlined className={styles.sectionIcon} />
        Session & Collaboration
      </span>
    ),
    children: [
      {
        key: 'party-mode',
        label: 'How do I start a collaborative session?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/party-mode-active.png"
              alt="Active party mode session"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              Party Mode allows multiple climbers to share a queue and take turns on the board
              in real-time.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To start a session:</Typography>
            </Typography>
            <ol>
              <li>Click the team icon in the header</li>
              <li>Sign in if not already logged in</li>
              <li>Click &quot;Start Party Mode&quot; to create a new session</li>
              <li>Share the session with friends using QR code or link</li>
            </ol>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To join a session:</Typography>
            </Typography>
            <ol>
              <li><Typography variant="body2" component="span" fontWeight={600}>Scan QR Code:</Typography> The session host can show a QR code that others can scan with their phone camera</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Share Link:</Typography> Copy and share the session URL - anyone with the link can join</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Enter Session ID:</Typography> Go to the &quot;Join Session&quot; tab and paste either the full URL or just the session ID</li>
            </ol>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Session features:</Typography>
            </Typography>
            <ul>
              <li>Real-time queue synchronization across all devices</li>
              <li>Multiple users can add/remove climbs</li>
              <li>Session leader controls the board display</li>
              <li>Automatic leader handoff if the current leader disconnects</li>
              <li>Session persists across page refreshes and reconnections</li>
            </ul>
          </div>
        ),
      },
      {
        key: 'queue-management',
        label: 'How do I manage the climb queue?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/main-interface.png"
              alt="Queue management"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              The queue lets you organize climbs for your session, whether climbing solo or with
              others.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Queue actions:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Add climbs:</Typography> Click the + icon on any climb card</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Reorder:</Typography> Drag and drop climbs to change order</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Set current:</Typography> Click a climb to make it the active climb</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Remove:</Typography> Click the X on any queued climb</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Mirror:</Typography> Toggle mirror mode for bilateral training</li>
            </ul>
            <Typography variant="body1" component="p">
              The queue syncs automatically with party members and persists offline for
              uninterrupted sessions.
            </Typography>
          </div>
        ),
      },
    ],
  },
  {
    key: 'training',
    label: (
      <span>
        <ElectricBoltOutlined className={styles.sectionIcon} />
        Training & Workouts
      </span>
    ),
    children: [
      {
        key: 'playlist-generator',
        label: 'How do I generate a workout playlist?',
        children: (
          <div className={styles.answerContent}>
            <Typography variant="body1" component="p">
              The Playlist Generator creates structured workouts tailored to your training goals.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Workout types:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Volume:</Typography> High repetitions at a consistent grade for endurance</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Pyramid:</Typography> Ramp up to a peak grade, then back down</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Ladder:</Typography> Step progression through increasing grades</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Grade Focus:</Typography> Concentrated work at a single target grade</li>
            </ul>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Configuration options:</Typography>
            </Typography>
            <ul>
              <li>Warm-up style (Standard, Extended, or None)</li>
              <li>Target grade selection</li>
              <li>Climb bias (Unfamiliar, Attempted, or Any)</li>
              <li>Minimum ascent/rating filters</li>
              <li>Number of climbs per section</li>
            </ul>
          </div>
        ),
      },
      {
        key: 'mirroring',
        label: 'How do I mirror a climb?',
        children: (
          <div className={styles.answerContent}>
            <Typography variant="body1" component="p">
              Climb mirroring flips all holds to the opposite side of the board, perfect for
              bilateral strength training.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To mirror a climb:</Typography>
            </Typography>
            <ol>
              <li>Find the climb you want to mirror</li>
              <li>Look for the mirror toggle icon in the climb actions</li>
              <li>Toggle it on to flip the climb horizontally</li>
            </ol>
            <Typography variant="body1" component="p">
              When connected via Bluetooth, the LED board will automatically display the mirrored
              pattern. This feature is available on supported boards like Kilter Homewall.
            </Typography>
          </div>
        ),
      },
    ],
  },
  {
    key: 'search',
    label: (
      <span>
        <SearchOutlined className={styles.sectionIcon} />
        Search & Discovery
      </span>
    ),
    children: [
      {
        key: 'search-filters',
        label: 'What search filters are available?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/search-filters.png"
              alt="Search filters"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Basic Search filters:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Climb Name:</Typography> Search by climb title</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Grade Range:</Typography> Set minimum and maximum grades</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Setter:</Typography> Filter by climb creator</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Min Ascents:</Typography> Only show popular climbs</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Min Rating:</Typography> Filter by quality rating</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Classics Only:</Typography> Show only classic-rated climbs</li>
            </ul>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Personal Progress filters</Typography> (requires login):
            </Typography>
            <Image
              src="/help/personal-progress.png"
              alt="Personal progress filters"
              className={styles.featureImage}
            />
            <ul>
              <li>Hide completed climbs</li>
              <li>Hide attempted climbs</li>
              <li>Show only attempted climbs</li>
              <li>Show only completed climbs</li>
            </ul>
          </div>
        ),
      },
      {
        key: 'search-by-hold',
        label: 'How do I search by specific holds?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/search-by-hold.png"
              alt="Search by hold"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              Search by Hold lets you find climbs that use (or avoid) specific holds on the board.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To search by holds:</Typography>
            </Typography>
            <ol>
              <li>Go to the &quot;Search by Hold&quot; tab</li>
              <li>Select &quot;Include&quot; or &quot;Exclude&quot; mode from the dropdown</li>
              <li>Tap holds on the board to select them</li>
              <li>Results update automatically as you select holds</li>
            </ol>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Include mode:</Typography> Climbs must use the selected holds
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Exclude mode:</Typography> Climbs must not use the selected holds
            </Typography>
          </div>
        ),
      },
    ],
  },
  {
    key: 'connectivity',
    label: (
      <span>
        <ApiOutlined className={styles.sectionIcon} />
        Sync & Connectivity
      </span>
    ),
    children: [
      {
        key: 'bluetooth',
        label: 'How do I connect my board\'s LEDs?',
        children: (
          <div className={styles.answerContent}>
            <Typography variant="body1" component="p">
              Boardsesh uses Web Bluetooth to control your board&apos;s LED system directly from
              the browser.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>Requirements:</Typography>
            </Typography>
            <ul>
              <li>Chrome browser (recommended) or other Web Bluetooth-compatible browser</li>
              <li>iOS users: Use the Bluefy browser (Safari doesn&apos;t support Web Bluetooth)</li>
              <li>Bluetooth enabled on your device</li>
              <li>Board powered on and in range</li>
            </ul>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To connect:</Typography>
            </Typography>
            <ol>
              <li>Click the lightbulb icon in the header</li>
              <li>Select your board from the device list</li>
              <li>Once connected, LEDs automatically show the current climb</li>
            </ol>
            <Typography variant="body1" component="p">
              The connection supports mirrored patterns and will automatically update when you
              change climbs.
            </Typography>
          </div>
        ),
      },
      {
        key: 'user-sync',
        label: 'How do I sync with my Kilter/Tension account?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/settings-aurora.png"
              alt="Aurora account settings"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              Link your Aurora account (Kilter or Tension) to sync your climb history and progress.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>To link your account:</Typography>
            </Typography>
            <ol>
              <li>Go to Settings (click your profile icon)</li>
              <li>Find the &quot;Aurora Accounts&quot; section</li>
              <li>Enter your Kilter or Tension credentials</li>
              <li>Click &quot;Link Account&quot;</li>
            </ol>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>What syncs:</Typography>
            </Typography>
            <ul>
              <li>Ascent history (completed climbs)</li>
              <li>Attempts/bids</li>
              <li>Circuits/playlists</li>
            </ul>
            <Typography variant="body1" component="p">
              Changes sync bidirectionally, so ascents logged in Boardsesh will appear in the
              official apps.
            </Typography>
          </div>
        ),
      },
      {
        key: 'logbook',
        label: 'How do I track my climbs?',
        children: (
          <div className={styles.answerContent}>
            <Image
              src="/help/climb-detail.png"
              alt="Climb detail with actions"
              className={styles.featureImage}
            />
            <Typography variant="body1" component="p">
              Track your climbing progress by logging ascents and attempts.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>From any climb:</Typography>
            </Typography>
            <ul>
              <li><Typography variant="body2" component="span" fontWeight={600}>Tick:</Typography> Record an attempt on the climb</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Log Ascent:</Typography> Mark the climb as completed (sends)</li>
              <li><Typography variant="body2" component="span" fontWeight={600}>Favorite:</Typography> Save climbs for quick access</li>
            </ul>
            <Typography variant="body1" component="p">
              Your logbook syncs with linked Aurora accounts and can be filtered in search results
              to find new challenges or revisit old projects.
            </Typography>
          </div>
        ),
      },
      {
        key: 'offline',
        label: 'Does Boardsesh work offline?',
        children: (
          <div className={styles.answerContent}>
            <Typography variant="body1" component="p">
              Yes! Boardsesh is designed to work reliably even with intermittent connectivity.
            </Typography>
            <Typography variant="body1" component="p">
              <Typography variant="body2" component="span" fontWeight={600}>What works offline:</Typography>
            </Typography>
            <ul>
              <li>Your queue persists locally via IndexedDB</li>
              <li>Session tokens are cached for quick reconnection</li>
              <li>Profile data is stored locally</li>
              <li>Bluetooth LED control works independently</li>
            </ul>
            <Typography variant="body1" component="p">
              When connectivity is restored, any pending changes sync automatically in the
              background.
            </Typography>
          </div>
        ),
      },
    ],
  },
];

export default function HelpContent() {
  // Transform sections into Collapse items format
  const collapseItems = helpSections.map((section) => ({
    key: section.key,
    label: section.label,
    children: (
      <Collapse
        accordion
        items={section.children.map((item) => ({
          key: item.key,
          label: item.label,
          children: item.children,
        }))}
        className={styles.nestedCollapse}
      />
    ),
  }));

  return (
    <Box className={styles.pageLayout}>
      <Box component="header" className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Typography variant="h6" component="h4" className={styles.headerTitle}>
          Help
        </Typography>
      </Box>

      <Box component="main" className={styles.content}>
        <MuiCard><CardContent>
          <div className={styles.heroSection}>
            <HelpOutlineOutlined className={styles.heroIcon} />
            <Typography variant="h4" component="h2" className={styles.heroTitle}>
              How can we help?
            </Typography>
            <Typography variant="body2" component="span" color="text.secondary" className={styles.heroSubtitle}>
              Learn about Boardsesh features and get the most out of your climbing sessions
            </Typography>
          </div>

          <Collapse
            accordion
            items={collapseItems}
            className={styles.mainCollapse}
            defaultActiveKey={['visualization']}
          />
        </CardContent></MuiCard>
      </Box>
    </Box>
  );
}

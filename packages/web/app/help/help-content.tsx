'use client';

import React from 'react';
import { Card, Typography, Collapse, Image } from 'antd';
import {
  HeatMapOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ApiOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import Box from '@mui/material/Box';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import styles from './help.module.css';

const { Title, Text, Paragraph } = Typography;

const helpSections = [
  {
    key: 'visualization',
    label: (
      <span>
        <HeatMapOutlined className={styles.sectionIcon} />
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
            <Paragraph>
              The heatmap shows hold usage patterns across all climbs, helping you identify popular
              holds and training opportunities.
            </Paragraph>
            <Paragraph>
              <Text strong>To access the heatmap:</Text>
            </Paragraph>
            <ol>
              <li>Go to the &quot;Search by Hold&quot; tab in the side panel</li>
              <li>Click the &quot;Show Heatmap&quot; button</li>
              <li>The board will display a color overlay from green (low usage) to red (high usage)</li>
            </ol>
            <Paragraph>
              <Text strong>Available color modes:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Ascents:</Text> Overall popularity based on total completions</li>
              <li><Text strong>Starting Holds:</Text> Common start positions</li>
              <li><Text strong>Hand/Foot Holds:</Text> Usage by limb type</li>
              <li><Text strong>Finish Holds:</Text> Common top-out positions</li>
            </ul>
            <Paragraph>
              Use the toggle switches to show/hide hold numbers and include/exclude foot holds.
            </Paragraph>
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
            <Paragraph>
              Hold classification lets you create personal ratings for each hold on your board,
              helping you understand your strengths and find suitable climbs.
            </Paragraph>
            <Paragraph>
              <Text strong>Classification attributes:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Hold Type:</Text> Jug, Sloper, Pinch, Crimp, or Pocket</li>
              <li><Text strong>Hand Rating:</Text> 1-5 difficulty scale for hand use</li>
              <li><Text strong>Foot Rating:</Text> 1-5 difficulty scale for foot use</li>
              <li><Text strong>Pull Direction:</Text> 0-360° optimal pulling angle</li>
            </ul>
            <Paragraph>
              Classifications are personal and stored in your account, allowing you to build a
              customized understanding of your board over time.
            </Paragraph>
          </div>
        ),
      },
    ],
  },
  {
    key: 'collaboration',
    label: (
      <span>
        <TeamOutlined className={styles.sectionIcon} />
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
            <Paragraph>
              Party Mode allows multiple climbers to share a queue and take turns on the board
              in real-time.
            </Paragraph>
            <Paragraph>
              <Text strong>To start a session:</Text>
            </Paragraph>
            <ol>
              <li>Click the team icon in the header</li>
              <li>Sign in if not already logged in</li>
              <li>Click &quot;Start Party Mode&quot; to create a new session</li>
              <li>Share the session with friends using QR code or link</li>
            </ol>
            <Paragraph>
              <Text strong>To join a session:</Text>
            </Paragraph>
            <ol>
              <li><Text strong>Scan QR Code:</Text> The session host can show a QR code that others can scan with their phone camera</li>
              <li><Text strong>Share Link:</Text> Copy and share the session URL - anyone with the link can join</li>
              <li><Text strong>Enter Session ID:</Text> Go to the &quot;Join Session&quot; tab and paste either the full URL or just the session ID</li>
            </ol>
            <Paragraph>
              <Text strong>Session features:</Text>
            </Paragraph>
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
            <Paragraph>
              The queue lets you organize climbs for your session, whether climbing solo or with
              others.
            </Paragraph>
            <Paragraph>
              <Text strong>Queue actions:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Add climbs:</Text> Click the + icon on any climb card</li>
              <li><Text strong>Reorder:</Text> Drag and drop climbs to change order</li>
              <li><Text strong>Set current:</Text> Click a climb to make it the active climb</li>
              <li><Text strong>Remove:</Text> Click the X on any queued climb</li>
              <li><Text strong>Mirror:</Text> Toggle mirror mode for bilateral training</li>
            </ul>
            <Paragraph>
              The queue syncs automatically with party members and persists offline for
              uninterrupted sessions.
            </Paragraph>
          </div>
        ),
      },
    ],
  },
  {
    key: 'training',
    label: (
      <span>
        <ThunderboltOutlined className={styles.sectionIcon} />
        Training & Workouts
      </span>
    ),
    children: [
      {
        key: 'playlist-generator',
        label: 'How do I generate a workout playlist?',
        children: (
          <div className={styles.answerContent}>
            <Paragraph>
              The Playlist Generator creates structured workouts tailored to your training goals.
            </Paragraph>
            <Paragraph>
              <Text strong>Workout types:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Volume:</Text> High repetitions at a consistent grade for endurance</li>
              <li><Text strong>Pyramid:</Text> Ramp up to a peak grade, then back down</li>
              <li><Text strong>Ladder:</Text> Step progression through increasing grades</li>
              <li><Text strong>Grade Focus:</Text> Concentrated work at a single target grade</li>
            </ul>
            <Paragraph>
              <Text strong>Configuration options:</Text>
            </Paragraph>
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
            <Paragraph>
              Climb mirroring flips all holds to the opposite side of the board, perfect for
              bilateral strength training.
            </Paragraph>
            <Paragraph>
              <Text strong>To mirror a climb:</Text>
            </Paragraph>
            <ol>
              <li>Find the climb you want to mirror</li>
              <li>Look for the mirror toggle icon in the climb actions</li>
              <li>Toggle it on to flip the climb horizontally</li>
            </ol>
            <Paragraph>
              When connected via Bluetooth, the LED board will automatically display the mirrored
              pattern. This feature is available on supported boards like Kilter Homewall.
            </Paragraph>
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
            <Paragraph>
              <Text strong>Basic Search filters:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Climb Name:</Text> Search by climb title</li>
              <li><Text strong>Grade Range:</Text> Set minimum and maximum grades</li>
              <li><Text strong>Setter:</Text> Filter by climb creator</li>
              <li><Text strong>Min Ascents:</Text> Only show popular climbs</li>
              <li><Text strong>Min Rating:</Text> Filter by quality rating</li>
              <li><Text strong>Classics Only:</Text> Show only classic-rated climbs</li>
            </ul>
            <Paragraph>
              <Text strong>Personal Progress filters</Text> (requires login):
            </Paragraph>
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
            <Paragraph>
              Search by Hold lets you find climbs that use (or avoid) specific holds on the board.
            </Paragraph>
            <Paragraph>
              <Text strong>To search by holds:</Text>
            </Paragraph>
            <ol>
              <li>Go to the &quot;Search by Hold&quot; tab</li>
              <li>Select &quot;Include&quot; or &quot;Exclude&quot; mode from the dropdown</li>
              <li>Tap holds on the board to select them</li>
              <li>Results update automatically as you select holds</li>
            </ol>
            <Paragraph>
              <Text strong>Include mode:</Text> Climbs must use the selected holds
            </Paragraph>
            <Paragraph>
              <Text strong>Exclude mode:</Text> Climbs must not use the selected holds
            </Paragraph>
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
            <Paragraph>
              Boardsesh uses Web Bluetooth to control your board&apos;s LED system directly from
              the browser.
            </Paragraph>
            <Paragraph>
              <Text strong>Requirements:</Text>
            </Paragraph>
            <ul>
              <li>Chrome browser (recommended) or other Web Bluetooth-compatible browser</li>
              <li>iOS users: Use the Bluefy browser (Safari doesn&apos;t support Web Bluetooth)</li>
              <li>Bluetooth enabled on your device</li>
              <li>Board powered on and in range</li>
            </ul>
            <Paragraph>
              <Text strong>To connect:</Text>
            </Paragraph>
            <ol>
              <li>Click the lightbulb icon in the header</li>
              <li>Select your board from the device list</li>
              <li>Once connected, LEDs automatically show the current climb</li>
            </ol>
            <Paragraph>
              The connection supports mirrored patterns and will automatically update when you
              change climbs.
            </Paragraph>
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
            <Paragraph>
              Link your Aurora account (Kilter or Tension) to sync your climb history and progress.
            </Paragraph>
            <Paragraph>
              <Text strong>To link your account:</Text>
            </Paragraph>
            <ol>
              <li>Go to Settings (click your profile icon)</li>
              <li>Find the &quot;Aurora Accounts&quot; section</li>
              <li>Enter your Kilter or Tension credentials</li>
              <li>Click &quot;Link Account&quot;</li>
            </ol>
            <Paragraph>
              <Text strong>What syncs:</Text>
            </Paragraph>
            <ul>
              <li>Ascent history (completed climbs)</li>
              <li>Attempts/bids</li>
              <li>Circuits/playlists</li>
            </ul>
            <Paragraph>
              Changes sync bidirectionally, so ascents logged in Boardsesh will appear in the
              official apps.
            </Paragraph>
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
            <Paragraph>
              Track your climbing progress by logging ascents and attempts.
            </Paragraph>
            <Paragraph>
              <Text strong>From any climb:</Text>
            </Paragraph>
            <ul>
              <li><Text strong>Tick:</Text> Record an attempt on the climb</li>
              <li><Text strong>Log Ascent:</Text> Mark the climb as completed (sends)</li>
              <li><Text strong>Favorite:</Text> Save climbs for quick access</li>
            </ul>
            <Paragraph>
              Your logbook syncs with linked Aurora accounts and can be filtered in search results
              to find new challenges or revisit old projects.
            </Paragraph>
          </div>
        ),
      },
      {
        key: 'offline',
        label: 'Does Boardsesh work offline?',
        children: (
          <div className={styles.answerContent}>
            <Paragraph>
              Yes! Boardsesh is designed to work reliably even with intermittent connectivity.
            </Paragraph>
            <Paragraph>
              <Text strong>What works offline:</Text>
            </Paragraph>
            <ul>
              <li>Your queue persists locally via IndexedDB</li>
              <li>Session tokens are cached for quick reconnection</li>
              <li>Profile data is stored locally</li>
              <li>Bluetooth LED control works independently</li>
            </ul>
            <Paragraph>
              When connectivity is restored, any pending changes sync automatically in the
              background.
            </Paragraph>
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
        <Title level={4} className={styles.headerTitle}>
          Help
        </Title>
      </Box>

      <Box component="main" className={styles.content}>
        <Card>
          <div className={styles.heroSection}>
            <QuestionCircleOutlined className={styles.heroIcon} />
            <Title level={2} className={styles.heroTitle}>
              How can we help?
            </Title>
            <Text type="secondary" className={styles.heroSubtitle}>
              Learn about Boardsesh features and get the most out of your climbing sessions
            </Text>
          </div>

          <Collapse
            accordion
            items={collapseItems}
            className={styles.mainCollapse}
            defaultActiveKey={['visualization']}
          />
        </Card>
      </Box>
    </Box>
  );
}

'use client';

import React from 'react';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import {
  GitHub,
  GroupOutlined,
  FavoriteBorderOutlined,
  ApiOutlined,
  RocketLaunchOutlined,
} from '@mui/icons-material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import styles from './about.module.css';

export default function AboutContent() {
  return (
    <Box className={styles.pageLayout}>
      <Box component="header" className={styles.header}>
        <BackButton fallbackUrl="/" />
        <Logo size="sm" showText={false} />
        <Typography variant="h4" className={styles.headerTitle}>
          About
        </Typography>
      </Box>

      <Box component="main" className={styles.content}>
        <MuiCard>
          <CardContent>
          <Stack spacing={3} className={styles.cardContent}>
            {/* Hero Section */}
            <div className={styles.heroSection}>
              <Logo size="lg" linkToHome={false} />
              <Typography variant="h2" className={styles.heroTitle}>
                Track, Train, and Climb Together
              </Typography>
              <Typography variant="body2" component="span" color="text.secondary" className={styles.heroSubtitle}>
                A centralized hub for all your LED climbing board training
              </Typography>
            </div>

            {/* Our Vision */}
            <section>
              <Typography variant="h3">
                <RocketLaunchOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                Our Vision
              </Typography>
              <Typography variant="body1" component="p">
                LED climbing boards like Kilter, Tension, Moonboard, Decoy, and Grasshopper have
                revolutionized indoor training. We believe the climbing community deserves a
                centralized platform that brings all these boards together—making it easier to
                track progress, train with friends, and get the most out of your board.
              </Typography>
              <Typography variant="body1" component="p">
                Boardsesh is a unified experience that works across different board types, helping
                you focus on what matters most—climbing.
              </Typography>
            </section>

            {/* Features */}
            <section>
              <Typography variant="h3">
                <GroupOutlined className={`${styles.sectionIcon} ${styles.successIcon}`} />
                What Boardsesh Offers
              </Typography>
              <Typography variant="body1" component="p">With Boardsesh, you get:</Typography>
              <ul className={styles.featureList}>
                <li>
                  <Typography variant="body2" component="span" fontWeight={600}>Queue management</Typography> — Coordinate climbs when training with others
                </li>
                <li>
                  <Typography variant="body2" component="span" fontWeight={600}>Real-time collaboration</Typography> — Share sessions with friends via
                  Party Mode
                </li>
                <li>
                  <Typography variant="body2" component="span" fontWeight={600}>Multi-board support</Typography> — One app for Kilter, Tension, and more
                </li>
                <li>
                  <Typography variant="body2" component="span" fontWeight={600}>Active development</Typography> — New features and improvements from the
                  community
                </li>
                <li>
                  <Typography variant="body2" component="span" fontWeight={600}>Self-hosting option</Typography> — Run your own instance if you prefer
                </li>
              </ul>
            </section>

            {/* Open Source */}
            <section>
              <Typography variant="h3">
                <GitHub className={styles.sectionIcon} />
                Open Source
              </Typography>
              <Typography variant="body1" component="p">
                Boardsesh is completely open source under the Apache license. You can view the code,
                contribute features, report bugs, or fork it entirely to run your own instance.
              </Typography>
              <Typography variant="body1" component="p">
                <MuiLink
                  href="https://github.com/marcodejongh/boardsesh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </MuiLink>
              </Typography>
            </section>

            {/* API Documentation */}
            <section>
              <Typography variant="h3">
                <ApiOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                API Documentation
              </Typography>
              <Typography variant="body1" component="p">
                Building something cool with climbing data? We provide a public API that developers
                can use to access climb information and build their own integrations.
              </Typography>
              <Typography variant="body1" component="p">
                <MuiLink href="/docs">Explore the API Documentation →</MuiLink>
              </Typography>
            </section>

            {/* Collaboration */}
            <section>
              <Typography variant="h3">
                <FavoriteBorderOutlined className={`${styles.sectionIcon} ${styles.primaryIcon}`} />
                Join the Community
              </Typography>
              <Typography variant="body1" component="p">
                We&apos;re always looking to collaborate with climbers, developers, and anyone
                passionate about improving the board climbing experience. Whether you want to
                contribute code, suggest features, or just say hello—we&apos;d love to hear from
                you.
              </Typography>
            </section>

            {/* Call to Action */}
            <section className={styles.callToAction}>
              <Typography variant="body1" component="p" color="text.secondary">
                Together, we can build the best training companion for board climbers everywhere.
              </Typography>
            </section>
          </Stack>
          </CardContent>
        </MuiCard>
      </Box>
    </Box>
  );
}

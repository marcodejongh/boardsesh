import React from 'react';
import { Metadata } from 'next';
import AboutContent from './about-content';

export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description:
    'Boardsesh is like Strava for board climbers - a centralized hub for all your LED climbing board training',
};

export default function AboutPage() {
  return <AboutContent />;
}

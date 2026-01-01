import React from 'react';
import { Metadata } from 'next';
import AboutContent from './about-content';

export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description:
    'Why we built Boardsesh - an open source alternative for LED climbing board control. Free, community-driven, and works with Kilter and Tension boards.',
  openGraph: {
    title: 'About Boardsesh',
    description:
      'Why we built Boardsesh - an open source alternative for LED climbing board control. Free, community-driven, and works with Kilter and Tension boards.',
    type: 'website',
    url: 'https://boardsesh.com/about',
  },
  twitter: {
    card: 'summary',
    title: 'About Boardsesh',
    description:
      'Why we built Boardsesh - an open source alternative for LED climbing board control. Free, community-driven, and works with Kilter and Tension boards.',
  },
};

export default function AboutPage() {
  return <AboutContent />;
}

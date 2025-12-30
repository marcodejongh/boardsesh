import React from 'react';
import { Metadata } from 'next';
import AboutPageContent from './about-page-content';

export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description:
    'Why we built Boardsesh - an open source alternative for LED climbing board control',
};

export default function AboutPage() {
  return <AboutPageContent />;
}

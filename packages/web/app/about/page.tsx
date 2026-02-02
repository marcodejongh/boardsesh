import React from 'react';
import { Metadata } from 'next';
import AboutContent from './about-content';

export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description:
    'Boardsesh is a centralized hub for all your LED climbing board training - track, train, and climb together',
};

export default function AboutPage() {
  return <AboutContent />;
}

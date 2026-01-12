import React from 'react';
import { Metadata } from 'next';
import HelpContent from './help-content';

export const metadata: Metadata = {
  title: 'Help | Boardsesh',
  description:
    'Learn about Boardsesh features including heatmaps, party mode, playlist generator, and more.',
};

export default function HelpPage() {
  return <HelpContent />;
}

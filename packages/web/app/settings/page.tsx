import React from 'react';
import { Metadata } from 'next';
import SettingsPageContent from './settings-page-content';

export const metadata: Metadata = {
  title: 'Settings | Boardsesh',
  description: 'Manage your Boardsesh account settings',
};

export default function SettingsPage() {
  return <SettingsPageContent />;
}

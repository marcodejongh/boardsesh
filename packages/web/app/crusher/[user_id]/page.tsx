import React from 'react';
import { Metadata } from 'next';
import ProfilePageContent from './profile-page-content';

export const metadata: Metadata = {
  title: 'Profile | Boardsesh',
  description: 'View climbing profile and stats',
};

type PageProps = {
  params: Promise<{ user_id: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { user_id } = await params;
  return <ProfilePageContent userId={user_id} />;
}

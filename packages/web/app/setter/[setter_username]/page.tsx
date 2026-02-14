import React from 'react';
import { Metadata } from 'next';
import SetterProfileContent from './setter-profile-content';
import styles from '@/app/components/library/playlist-view.module.css';

export const metadata: Metadata = {
  title: 'Setter Profile | Boardsesh',
  description: 'View setter profile and climbs',
};

export default async function SetterProfilePage({
  params,
}: {
  params: Promise<{ setter_username: string }>;
}) {
  const { setter_username } = await params;

  return (
    <div className={styles.pageContainer}>
      <SetterProfileContent username={decodeURIComponent(setter_username)} />
    </div>
  );
}

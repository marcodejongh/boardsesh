import React from 'react';
import { Metadata } from 'next';
import ProfilePageContent from './profile-page-content';
import { getDb } from '@/app/lib/db/db';
import * as schema from '@/app/lib/db/schema';
import { eq } from 'drizzle-orm';

type PageProps = {
  params: Promise<{ user_id: string }>;
};

async function getUserProfile(userId: string) {
  try {
    const db = getDb();

    const [profiles, users] = await Promise.all([
      db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1),
      db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1),
    ]);

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const profile = profiles.length > 0 ? profiles[0] : null;

    return {
      name: profile?.displayName || user.name || 'Crusher',
      avatarUrl: profile?.avatarUrl || user.image || null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { user_id } = await params;

  try {
    const profile = await getUserProfile(user_id);

    if (!profile) {
      return {
        title: 'Profile Not Found | Boardsesh',
        description: 'This profile could not be found',
      };
    }

    const title = `${profile.name}'s Profile | Boardsesh`;
    const description = `View ${profile.name}'s climbing stats and progress on Boardsesh`;

    return {
      title,
      description,
      openGraph: {
        title: `${profile.name}'s Climbing Profile`,
        description,
        type: 'profile',
        url: `https://boardsesh.com/crusher/${user_id}`,
        ...(profile.avatarUrl && {
          images: [
            {
              url: profile.avatarUrl,
              width: 200,
              height: 200,
              alt: `${profile.name}'s avatar`,
            },
          ],
        }),
      },
      twitter: {
        card: 'summary',
        title: `${profile.name}'s Climbing Profile`,
        description,
        ...(profile.avatarUrl && {
          images: [profile.avatarUrl],
        }),
      },
    };
  } catch {
    return {
      title: 'Profile | Boardsesh',
      description: 'View climbing profile and stats',
    };
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { user_id } = await params;
  return <ProfilePageContent userId={user_id} />;
}

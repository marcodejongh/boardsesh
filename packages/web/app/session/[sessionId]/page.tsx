import React from 'react';
import type { Metadata } from 'next';
import { GraphQLClient } from 'graphql-request';
import { getGraphQLHttpUrl } from '@/app/lib/graphql/client';
import { GET_SESSION_DETAIL, type GetSessionDetailQueryResponse } from '@/app/lib/graphql/operations/activity-feed';
import SessionDetailContent from './session-detail-content';

type Props = {
  params: Promise<{ sessionId: string }>;
};

const fetchSessionDetail = React.cache(async (sessionId: string) => {
  const url = getGraphQLHttpUrl();
  const client = new GraphQLClient(url);
  try {
    const data = await client.request<GetSessionDetailQueryResponse>(
      GET_SESSION_DETAIL,
      { sessionId },
    );
    return data.sessionDetail;
  } catch (err) {
    console.error('[SessionDetailPage] Failed to fetch session:', sessionId, err);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId: rawSessionId } = await params;
  const sessionId = decodeURIComponent(rawSessionId);
  const session = await fetchSessionDetail(sessionId);

  if (!session) {
    return { title: 'Session Not Found | Boardsesh' };
  }

  const participantNames = session.participants
    .map((p) => p.displayName || 'Climber')
    .join(', ');

  return {
    title: `${session.sessionName || 'Climbing Session'} | Boardsesh`,
    description: `${participantNames} - ${session.totalSends} sends, ${session.totalFlashes} flashes`,
  };
}

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId: rawSessionId } = await params;
  const sessionId = decodeURIComponent(rawSessionId);
  const session = await fetchSessionDetail(sessionId);

  return <SessionDetailContent session={session} />;
}

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { SessionDetail } from '@boardsesh/shared-schema';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => ({ token: null, isAuthenticated: false, isLoading: false, error: null }),
}));

vi.mock('@/app/components/providers/snackbar-provider', () => ({
  useSnackbar: () => ({ showMessage: vi.fn() }),
}));

vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: vi.fn() }),
}));

vi.mock('@/app/lib/graphql/operations/activity-feed', () => ({
  UPDATE_INFERRED_SESSION: 'mutation UpdateInferredSession',
  ADD_USER_TO_SESSION: 'mutation AddUserToSession',
  REMOVE_USER_FROM_SESSION: 'mutation RemoveUserFromSession',
}));

vi.mock('@/app/theme/theme-config', () => ({
  themeTokens: {
    transitions: { normal: '200ms ease' },
    shadows: { md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    borderRadius: { full: 9999, sm: 4 },
    colors: { amber: '#FBBF24', success: '#6B9080', successBg: '#EFF5F2' },
    typography: { fontSize: { xs: 12 } },
    neutral: { 300: '#D1D5DB' },
  },
}));

vi.mock('../[sessionId]/user-search-dialog', () => ({
  default: () => null,
}));

vi.mock('@/app/components/charts/grade-distribution-bar', () => ({
  default: () => <div data-testid="grade-distribution-bar" />,
}));

vi.mock('@/app/components/social/vote-button', () => ({
  default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div data-testid="vote-button" data-entity-type={entityType} data-entity-id={entityId} />
  ),
}));

vi.mock('@/app/components/social/comment-section', () => ({
  default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div data-testid="comment-section" data-entity-type={entityType} data-entity-id={entityId} />
  ),
}));

vi.mock('@/app/components/activity-feed/ascent-thumbnail', () => ({
  default: () => <div data-testid="ascent-thumbnail" />,
}));

import SessionDetailContent from '../[sessionId]/session-detail-content';

function makeSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    sessionId: 'session-1',
    sessionType: 'inferred',
    sessionName: null,
    participants: [{
      userId: 'user-1',
      displayName: 'Test User',
      avatarUrl: null,
      sends: 5,
      flashes: 2,
      attempts: 3,
    }],
    totalSends: 5,
    totalFlashes: 2,
    totalAttempts: 3,
    tickCount: 8,
    gradeDistribution: [{ grade: 'V5', flash: 2, send: 3, attempt: 3 }],
    boardTypes: ['kilter'],
    hardestGrade: 'V5',
    firstTickAt: '2024-01-15T10:00:00.000Z',
    lastTickAt: '2024-01-15T12:00:00.000Z',
    durationMinutes: 120,
    goal: null,
    ticks: [
      {
        uuid: 'tick-1',
        userId: 'user-1',
        climbUuid: 'climb-1',
        climbName: 'Test Climb',
        boardType: 'kilter',
        layoutId: 1,
        angle: 40,
        status: 'send',
        attemptCount: 1,
        difficulty: 20,
        difficultyName: 'V5',
        quality: 3,
        isMirror: false,
        isBenchmark: false,
        comment: null,
        frames: 'abc',
        setterUsername: 'setter1',
        climbedAt: '2024-01-15T10:30:00.000Z',
      },
    ],
    upvotes: 5,
    downvotes: 1,
    voteScore: 4,
    commentCount: 2,
    ...overrides,
  };
}

describe('SessionDetailContent', () => {
  it('shows "not found" when session is null', () => {
    render(<SessionDetailContent session={null} />);
    expect(screen.getByText('Session Not Found')).toBeTruthy();
  });

  it('renders session stats', () => {
    render(<SessionDetailContent session={makeSession()} />);
    expect(screen.getByText('5 sends')).toBeTruthy();
    expect(screen.getByText('2 flashes')).toBeTruthy();
    expect(screen.getByText('3 attempts')).toBeTruthy();
    expect(screen.getByText('8 climbs')).toBeTruthy();
  });

  it('renders tick list with climb names', () => {
    render(<SessionDetailContent session={makeSession()} />);
    expect(screen.getByText('Test Climb')).toBeTruthy();
    expect(screen.getByText('Climbs (1)')).toBeTruthy();
  });

  it('renders session-level VoteButton with session entity type', () => {
    render(<SessionDetailContent session={makeSession()} />);
    const voteButtons = screen.getAllByTestId('vote-button');
    const sessionVote = voteButtons.find(
      (el) => el.getAttribute('data-entity-type') === 'session',
    );
    expect(sessionVote).toBeTruthy();
    expect(sessionVote!.getAttribute('data-entity-id')).toBe('session-1');
  });

  it('renders CommentSection with session entity type', () => {
    render(<SessionDetailContent session={makeSession()} />);
    const commentSection = screen.getByTestId('comment-section');
    expect(commentSection.getAttribute('data-entity-type')).toBe('session');
    expect(commentSection.getAttribute('data-entity-id')).toBe('session-1');
  });

  it('renders per-tick VoteButton with tick entity type', () => {
    render(<SessionDetailContent session={makeSession()} />);
    const voteButtons = screen.getAllByTestId('vote-button');
    const tickVote = voteButtons.find(
      (el) => el.getAttribute('data-entity-type') === 'tick',
    );
    expect(tickVote).toBeTruthy();
    expect(tickVote!.getAttribute('data-entity-id')).toBe('tick-1');
  });

  it('shows session name when available', () => {
    render(<SessionDetailContent session={makeSession({ sessionName: 'Evening Crush' })} />);
    expect(screen.getByText('Evening Crush')).toBeTruthy();
  });

  it('generates title from day and board type when no session name', () => {
    // 2024-01-15 is a Monday, boardTypes is ['kilter']
    render(<SessionDetailContent session={makeSession()} />);
    expect(screen.getByText('Monday Kilter Session')).toBeTruthy();
  });

  it('shows goal when available', () => {
    render(<SessionDetailContent session={makeSession({ goal: 'Send V7' })} />);
    expect(screen.getByText(/Send V7/)).toBeTruthy();
  });

  it('renders grade distribution chart', () => {
    render(<SessionDetailContent session={makeSession()} />);
    expect(screen.getByTestId('grade-distribution-bar')).toBeTruthy();
    expect(screen.getByText('Grade Distribution')).toBeTruthy();
  });

  it('hides grade chart when distribution is empty', () => {
    render(<SessionDetailContent session={makeSession({ gradeDistribution: [] })} />);
    expect(screen.queryByTestId('grade-distribution-bar')).toBeNull();
  });

  it('shows back button linking to home', () => {
    render(<SessionDetailContent session={makeSession()} />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((l) => l.getAttribute('href') === '/');
    expect(backLink).toBeTruthy();
  });

  it('shows board type chips', () => {
    render(<SessionDetailContent session={makeSession({ boardTypes: ['kilter', 'tension'] })} />);
    expect(screen.getByText('Kilter')).toBeTruthy();
    expect(screen.getByText('Tension')).toBeTruthy();
  });

  it('shows duration in hours', () => {
    render(<SessionDetailContent session={makeSession({ durationMinutes: 120 })} />);
    expect(screen.getByText('2h')).toBeTruthy();
  });

  it('shows hardest grade', () => {
    render(<SessionDetailContent session={makeSession({ hardestGrade: 'V8' })} />);
    expect(screen.getByText('Hardest: V8')).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, fireEvent, screen } from '@testing-library/react';
import type { ClimbActionProps } from '../../types';
import type { BoardDetails, Climb } from '@/app/lib/types';

const mockUsePlaylists = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('../../use-playlists', () => ({
  usePlaylists: (args: unknown) => mockUsePlaylists(args),
}));

vi.mock('../../../providers/snackbar-provider', () => ({
  useSnackbar: () => ({
    showMessage: mockShowMessage,
  }),
}));

vi.mock('../../../auth/auth-modal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="auth-modal">auth</div> : null),
}));

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

import { PlaylistAction } from '../playlist-action';

function createTestClimb(overrides?: Partial<Climb>): Climb {
  return {
    uuid: 'climb-1',
    name: 'Test Climb',
    setter_username: 'setter',
    description: '',
    frames: 'p1r10',
    angle: 40,
    ascensionist_count: 3,
    difficulty: 'V4',
    quality_average: '3.0',
    stars: 0,
    difficulty_error: '0.5',
    litUpHoldsMap: {},
    benchmark_difficulty: null,
    ...overrides,
  };
}

function createTestBoardDetails(overrides?: Partial<BoardDetails>): BoardDetails {
  return {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 1,
    set_ids: '1',
    images_to_holds: {},
    holdsData: {},
    edge_left: 0,
    edge_right: 100,
    edge_bottom: 0,
    edge_top: 100,
    boardHeight: 100,
    boardWidth: 100,
    ...overrides,
  } as BoardDetails;
}

function createProps(overrides?: Partial<ClimbActionProps>): ClimbActionProps {
  return {
    climb: createTestClimb(),
    boardDetails: createTestBoardDetails(),
    angle: 40,
    viewMode: 'list',
    ...overrides,
  };
}

describe('PlaylistAction (list mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePlaylists.mockReturnValue({
      playlists: [],
      playlistsContainingClimb: new Set<string>(),
      addToPlaylist: vi.fn(),
      removeFromPlaylist: vi.fn(),
      createPlaylist: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
      refreshPlaylists: vi.fn(),
    });
  });

  it('opens playlist selector callback in list mode when authenticated', () => {
    const onOpenPlaylistSelector = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      PlaylistAction(createProps({ onOpenPlaylistSelector, onComplete }))
    );

    render(<>{result.current.element}</>);
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }));

    expect(onOpenPlaylistSelector).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows auth modal and does not open playlist selector when unauthenticated', () => {
    mockUsePlaylists.mockReturnValue({
      playlists: [],
      playlistsContainingClimb: new Set<string>(),
      addToPlaylist: vi.fn(),
      removeFromPlaylist: vi.fn(),
      createPlaylist: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
      refreshPlaylists: vi.fn(),
    });

    const onOpenPlaylistSelector = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      PlaylistAction(createProps({ onOpenPlaylistSelector, onComplete }))
    );

    render(<>{result.current.element}</>);
    fireEvent.click(screen.getByRole('button', { name: /add to playlist/i }));

    expect(onOpenPlaylistSelector).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

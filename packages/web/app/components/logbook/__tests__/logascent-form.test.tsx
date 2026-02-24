import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock MUI DateTimePicker to avoid complex setup
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({ value, onChange, ...props }: any) =>
    React.createElement('input', {
      'data-testid': 'date-picker',
      value: value?.toISOString() || '',
      onChange: (e: any) => onChange?.(e.target.value),
    }),
}));

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

const mockSaveTick = vi.fn();
vi.mock('../../board-provider/board-provider-context', () => ({
  useBoardProvider: vi.fn(),
}));

vi.mock('@/app/lib/board-data', () => ({
  TENSION_KILTER_GRADES: [
    { difficulty_id: 10, difficulty_name: 'V3' },
    { difficulty_id: 14, difficulty_name: 'V5' },
    { difficulty_id: 18, difficulty_name: 'V7' },
  ],
  ANGLES: {
    kilter: [0, 10, 20, 30, 40, 50],
    tension: [0, 10, 20, 30, 40],
  },
}));

import { useBoardProvider } from '../../board-provider/board-provider-context';
import { LogAscentForm } from '../logascent-form';
import type { Climb, BoardDetails } from '@/app/lib/types';

const mockUseBoardProvider = vi.mocked(useBoardProvider);

const mockClimb: Climb = {
  uuid: 'climb-uuid-1',
  setter_username: 'setter1',
  name: 'Test Climb',
  description: 'A test climb',
  frames: '',
  angle: 40,
  ascensionist_count: 5,
  difficulty: 'V5',
  quality_average: '3.5',
  stars: 3,
  difficulty_error: '',
  litUpHoldsMap: {},
  mirrored: false,
  benchmark_difficulty: null,
  userAscents: 0,
  userAttempts: 0,
};

const mockBoardDetails: BoardDetails = {
  board_name: 'kilter',
  layout_id: 1,
  layout_name: 'Original',
  size_id: 1,
  size_name: '12x12',
  set_ids: [1, 2],
  set_names: ['Bolt Ons', 'Screw Ons'],
  supportsMirroring: true,
  angle: 40,
  image_url: '',
  edge_left: 0,
  edge_right: 0,
  edge_bottom: 0,
  edge_top: 0,
} as BoardDetails;

describe('LogAscentForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveTick.mockResolvedValue(undefined);
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });
  });

  it('renders the form with ascent/attempt toggle', () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Ascent')).toBeDefined();
    expect(screen.getByText('Attempt')).toBeDefined();
    expect(screen.getByText('Submit')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('displays the climb name', () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Test Climb')).toBeDefined();
  });

  it('shows mirrored chip when board supports mirroring', () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Mirrored')).toBeDefined();
  });

  it('hides mirrored chip when board does not support mirroring', () => {
    const nonMirrorBoard = { ...mockBoardDetails, supportsMirroring: false };
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={nonMirrorBoard}
        onClose={mockOnClose}
      />,
    );

    expect(screen.queryByText('Mirrored')).toBeNull();
  });

  it('calls saveTick on successful submission with flash status for 1 attempt', async () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    // Submit with defaults (1 attempt = flash)
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockSaveTick).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockSaveTick.mock.calls[0][0];
    expect(callArgs.climbUuid).toBe('climb-uuid-1');
    expect(callArgs.status).toBe('flash');
    expect(callArgs.attemptCount).toBe(1);
  });

  it('calls onClose after successful submission', async () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not submit when not authenticated', async () => {
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: false,
      logbook: [],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });

    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    // saveTick should not have been called
    expect(mockSaveTick).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on save failure', async () => {
    mockSaveTick.mockRejectedValue(new Error('Network error'));

    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockSaveTick).toHaveBeenCalledTimes(1);
    });

    // onClose should NOT have been called
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('includes layoutId, sizeId, and setIds in saveTick call', async () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockSaveTick).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockSaveTick.mock.calls[0][0];
    expect(callArgs.layoutId).toBe(1);
    expect(callArgs.sizeId).toBe(1);
    expect(callArgs.setIds).toBe('1,2');
  });
});

describe('LogAscentForm validation logic', () => {
  // Test the pure helper functions exported from the module
  // getTickStatus and validateTickInput are inline, so we test them through the form behavior.

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveTick.mockResolvedValue(undefined);
    mockUseBoardProvider.mockReturnValue({
      saveTick: mockSaveTick,
      isAuthenticated: true,
      logbook: [],
      getLogbook: vi.fn(),
      saveClimb: vi.fn(),
      isLoading: false,
      error: null,
      isInitialized: true,
      boardName: 'kilter',
    });
  });

  it('does not submit ascent with no climb uuid', async () => {
    const noUuidClimb = { ...mockClimb, uuid: '' };
    render(
      <LogAscentForm
        currentClimb={noUuidClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    expect(mockSaveTick).not.toHaveBeenCalled();
  });

  it('submits attempt type without quality or difficulty', async () => {
    render(
      <LogAscentForm
        currentClimb={mockClimb}
        boardDetails={mockBoardDetails}
        onClose={mockOnClose}
      />,
    );

    // Switch to attempt mode
    fireEvent.click(screen.getByText('Attempt'));

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockSaveTick).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockSaveTick.mock.calls[0][0];
    expect(callArgs.status).toBe('attempt');
    expect(callArgs.quality).toBeUndefined();
    expect(callArgs.difficulty).toBeUndefined();
  });
});

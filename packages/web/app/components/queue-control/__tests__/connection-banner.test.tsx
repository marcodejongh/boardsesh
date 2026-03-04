import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionBanner } from '../connection-banner';
import { QueueContext } from '../../graphql-queue';

function renderWithContext(value: any) {
  return render(
    <QueueContext.Provider value={value}>
      <ConnectionBanner />
    </QueueContext.Provider>,
  );
}

const baseContext = {
  queue: [],
  currentClimbQueueItem: null,
  currentClimb: null,
  climbSearchParams: { page: 0, page_size: 10 },
  climbSearchResults: null,
  suggestedClimbs: [],
  totalSearchResultCount: null,
  hasMoreResults: false,
  isFetchingClimbs: false,
  isFetchingNextPage: false,
  hasDoneFirstFetch: false,
  viewOnlyMode: false,
  parsedParams: { board_name: '', angle: 0, layout_id: '', size_id: '', set_ids: '', size_name: '', set_names: [], size_description: '' },
  addToQueue: () => {},
  removeFromQueue: () => {},
  setCurrentClimb: () => {},
  setCurrentClimbQueueItem: () => {},
  setClimbSearchParams: () => {},
  mirrorClimb: () => {},
  fetchMoreClimbs: () => {},
  getNextClimbQueueItem: () => null,
  getPreviousClimbQueueItem: () => null,
  setQueue: () => {},
};

describe('ConnectionBanner', () => {
  it('shows reconnecting message when session present and not connected', () => {
    renderWithContext({
      ...baseContext,
      sessionId: 'abc',
      connectionState: 'reconnecting',
    });

    expect(screen.getByTestId('queue-connection-banner')).toHaveTextContent('Reconnecting');
  });

  it('hides when connected', () => {
    renderWithContext({
      ...baseContext,
      sessionId: 'abc',
      connectionState: 'connected',
    });

    expect(screen.queryByTestId('queue-connection-banner')).toBeNull();
  });
});

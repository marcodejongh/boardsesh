import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

const mockCommentSection = vi.fn();
vi.mock('../comment-section', () => ({
  default: (props: { entityType: string; entityId: string; title: string }) => {
    mockCommentSection(props);
    return (
      <div
        data-testid="comment-section"
        data-entity-type={props.entityType}
        data-entity-id={props.entityId}
        data-title={props.title}
      />
    );
  },
}));

import FeedCommentButton from '../feed-comment-button';

describe('FeedCommentButton', () => {
  describe('Initial rendering', () => {
    it('renders the comment icon button', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);
      expect(screen.getByRole('button', { name: /show comments/i })).toBeTruthy();
    });

    it('shows comment count when greater than 0', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" commentCount={5} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('does not show count text when commentCount is 0', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" commentCount={0} />);
      expect(screen.queryByText('0')).toBeNull();
    });

    it('does not show count text when commentCount is not provided', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);
      expect(screen.queryByText('0')).toBeNull();
    });

    it('does not render CommentSection initially', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);
      expect(screen.queryByTestId('comment-section')).toBeNull();
    });
  });

  describe('Toggle behavior', () => {
    it('shows CommentSection when icon button is clicked', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      expect(screen.getByTestId('comment-section')).toBeTruthy();
    });

    it('toggles aria-label back to Show comments when clicked again', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);

      // Open
      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));
      expect(screen.getByRole('button', { name: /hide comments/i })).toBeTruthy();

      // Close — the aria-label should switch back
      fireEvent.click(screen.getByRole('button', { name: /hide comments/i }));
      expect(screen.getByRole('button', { name: /show comments/i })).toBeTruthy();
    });

    it('changes aria-label based on open state', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" />);

      expect(screen.getByRole('button', { name: /show comments/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /hide comments/i })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      expect(screen.getByRole('button', { name: /hide comments/i })).toBeTruthy();
    });

    it('stops event propagation on click', () => {
      const parentHandler = vi.fn();
      render(
        <div onClick={parentHandler}>
          <FeedCommentButton entityType="session" entityId="session-1" />
        </div>,
      );

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      expect(parentHandler).not.toHaveBeenCalled();
    });
  });

  describe('CommentSection props', () => {
    it('passes entityType and entityId to CommentSection', () => {
      render(<FeedCommentButton entityType="session" entityId="session-42" />);

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      const section = screen.getByTestId('comment-section');
      expect(section.getAttribute('data-entity-type')).toBe('session');
      expect(section.getAttribute('data-entity-id')).toBe('session-42');
    });

    it('passes "Comments" as title to CommentSection', () => {
      render(<FeedCommentButton entityType="proposal" entityId="prop-1" />);

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      const section = screen.getByTestId('comment-section');
      expect(section.getAttribute('data-title')).toBe('Comments');
    });

    it('works with proposal entity type', () => {
      render(<FeedCommentButton entityType="proposal" entityId="proposal-abc" commentCount={3} />);

      expect(screen.getByText('3')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      const section = screen.getByTestId('comment-section');
      expect(section.getAttribute('data-entity-type')).toBe('proposal');
      expect(section.getAttribute('data-entity-id')).toBe('proposal-abc');
    });

    it('works with climb entity type', () => {
      render(<FeedCommentButton entityType="climb" entityId="climb-xyz" />);

      fireEvent.click(screen.getByRole('button', { name: /show comments/i }));

      const section = screen.getByTestId('comment-section');
      expect(section.getAttribute('data-entity-type')).toBe('climb');
      expect(section.getAttribute('data-entity-id')).toBe('climb-xyz');
    });
  });

  describe('Large comment counts', () => {
    it('renders large comment counts', () => {
      render(<FeedCommentButton entityType="session" entityId="session-1" commentCount={999} />);
      expect(screen.getByText('999')).toBeTruthy();
    });
  });
});

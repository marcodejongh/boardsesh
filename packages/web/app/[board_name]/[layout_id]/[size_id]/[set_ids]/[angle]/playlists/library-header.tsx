'use client';

import React from 'react';
import styles from './library.module.css';

type LibraryHeaderProps = {
  activeBoards: string[];
  selectedBoard: string;
  onBoardChange: (board: string) => void;
};

export default function LibraryHeader({
  activeBoards,
  selectedBoard,
  onBoardChange,
}: LibraryHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.pillsScroll}>
        <button
          className={`${styles.pill} ${selectedBoard === 'all' ? styles.pillActive : ''}`}
          onClick={() => onBoardChange('all')}
        >
          All
        </button>
        {activeBoards.map((board) => (
          <button
            key={board}
            className={`${styles.pill} ${selectedBoard === board ? styles.pillActive : ''}`}
            onClick={() => onBoardChange(board)}
          >
            {board.charAt(0).toUpperCase() + board.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

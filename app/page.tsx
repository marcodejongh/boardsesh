import React from 'react';
import BoardSelection from './components/setup-wizard/board-selection';
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/c/')
  return <BoardSelection />;
}

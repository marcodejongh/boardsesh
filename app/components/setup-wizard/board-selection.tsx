'use client';

import React from 'react';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import SelectionFormItem from './selection-form-item';

const BoardSelection = () => {
  return (
      <SelectionFormItem urlPrefix='/s' entityName={'Board'} label={'Board'} items={SUPPORTED_BOARDS.map(board_name => ({ value: board_name}))}  />
  );
};

export default BoardSelection;

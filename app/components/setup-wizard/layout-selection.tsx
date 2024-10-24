'use client';

import React from 'react';
import { LayoutRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';
import SelectionFormItem from './selection-form-item';

const LayoutSelection = ({ layouts = [], boardName }: { layouts: LayoutRow[], boardName: BoardName }) => {
  return (
    <SelectionFormItem 
      entityName={'Layout'} 
      label={'Layout'}
      items={layouts.map(({ id: layoutId, name: layoutName }) => ({value: layoutId, label: layoutName}))}
      urlPrefix={`/s/${boardName}`} />
  );
};

export default LayoutSelection;

'use client';

import React from 'react';
import { SizeRow } from '@/app/lib/data/queries';
import { ParsedBoardRouteParameters } from '@/app/lib/types';
import SelectionFormItem from './selection-form-item';

export type SizeSelectionProps = { boardRouteParameters: ParsedBoardRouteParameters, sizes: SizeRow[] };

const SizeSelection = ({ sizes = [], boardRouteParameters: {board_name, layout_id } }: SizeSelectionProps) => {
  return (
    <SelectionFormItem 
      entityName={'Size'} 
      label={'Size'}
      items={sizes.map(({ id: value, name, description }) => ({value, label: `${name} ${description}`}))}
      urlPrefix={`/s/${board_name}/${layout_id}`} />
  );
};

export default SizeSelection;

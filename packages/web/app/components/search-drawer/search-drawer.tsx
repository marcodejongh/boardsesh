'use client';

import React from 'react';
import SearchForm from './search-form';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import { BoardDetails } from '@/app/lib/types';
import styles from './search-drawer.module.css';

const FilterColumn = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  // Sidebar for desktop view
  return (
    <div className={styles.filterColumn}>
      <UISearchParamsProvider>
        <SearchForm boardDetails={boardDetails} />
      </UISearchParamsProvider>
    </div>
  );
};

export default FilterColumn;

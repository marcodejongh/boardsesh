'use client';

import React from 'react';
import { List } from 'antd';
import Typography from '@mui/material/Typography';
import { ChevronRightOutlined } from '@mui/icons-material';
import { WorkoutType, WORKOUT_TYPES } from './types';
import { getWorkoutIcon } from './workout-icons';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './workout-type-selector.module.css';


interface WorkoutTypeSelectorProps {
  onSelect: (type: WorkoutType) => void;
}

const WorkoutTypeSelector: React.FC<WorkoutTypeSelectorProps> = ({ onSelect }) => {
  return (
    <div className={styles.container}>
      <List
        dataSource={WORKOUT_TYPES}
        renderItem={(item) => (
          <List.Item
            className={styles.listItem}
            onClick={() => onSelect(item.type)}
          >
            <div className={styles.itemContent}>
              <div className={styles.iconWrapper}>
                {getWorkoutIcon(item.icon, { size: 28, color: themeTokens.colors.primary })}
              </div>
              <div className={styles.textContent}>
                <Typography variant="body2" component="span" fontWeight={600} className={styles.title}>{item.name}</Typography>
                <Typography variant="body2" component="span" color="text.secondary" className={styles.description}>{item.description}</Typography>
              </div>
            </div>
            <ChevronRightOutlined className={styles.arrow} />
          </List.Item>
        )}
      />
    </div>
  );
};

export default WorkoutTypeSelector;

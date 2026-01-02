'use client';

import React from 'react';
import { List, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { WorkoutType, WORKOUT_TYPES } from './types';
import { getWorkoutIcon } from './workout-icons';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './workout-type-selector.module.css';

const { Text } = Typography;

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
                <Text strong className={styles.title}>{item.name}</Text>
                <Text type="secondary" className={styles.description}>{item.description}</Text>
              </div>
            </div>
            <RightOutlined className={styles.arrow} />
          </List.Item>
        )}
      />
    </div>
  );
};

export default WorkoutTypeSelector;

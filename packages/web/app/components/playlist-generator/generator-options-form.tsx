'use client';

import React from 'react';
import { Typography, Select, Button, InputNumber, Switch, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { BoardDetails } from '@/app/lib/types';
import {
  WorkoutType,
  GeneratorOptions,
  WARM_UP_OPTIONS,
  CLIMB_BIAS_OPTIONS,
  DEFAULT_VOLUME_OPTIONS,
  DEFAULT_PYRAMID_OPTIONS,
  DEFAULT_LADDER_OPTIONS,
  DEFAULT_GRADE_FOCUS_OPTIONS,
  VolumeOptions,
  PyramidOptions,
  LadderOptions,
  GradeFocusOptions,
} from './types';
import styles from './generator-options-form.module.css';

const { Text } = Typography;

// Kilter Homewall layout ID
const KILTER_HOMEWALL_LAYOUT_ID = 8;

interface GeneratorOptionsFormProps {
  workoutType: WorkoutType;
  options: GeneratorOptions;
  onChange: (options: GeneratorOptions) => void;
  onReset: () => void;
  boardDetails: BoardDetails;
}

const GeneratorOptionsForm: React.FC<GeneratorOptionsFormProps> = ({
  workoutType,
  options,
  onChange,
  onReset,
  boardDetails,
}) => {
  const grades = TENSION_KILTER_GRADES;

  // Check if we should show the tall climbs filter
  // Only show for Kilter Homewall on the largest size (10x12)
  const isKilterHomewall = boardDetails.board_name === 'kilter' && boardDetails.layout_id === KILTER_HOMEWALL_LAYOUT_ID;
  const isLargestSize = boardDetails.size_name?.toLowerCase().includes('12');
  const showTallClimbsFilter = isKilterHomewall && isLargestSize;

  // Helper to update options
  const updateOption = <K extends keyof GeneratorOptions>(key: K, value: GeneratorOptions[K]) => {
    onChange({ ...options, [key]: value });
  };

  // Render number stepper
  const renderStepper = (
    label: string,
    value: number,
    onUpdate: (newValue: number) => void,
    min: number = 1,
    max: number = 50
  ) => (
    <div className={styles.formRow}>
      <Text className={styles.label}>{label}</Text>
      <div className={styles.stepperContainer}>
        <span className={styles.stepperValue}>{value}</span>
        <div className={styles.stepperButtons}>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => onUpdate(Math.max(min, value - 1))}
            disabled={value <= min}
            className={styles.stepperButton}
          />
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onUpdate(Math.min(max, value + 1))}
            disabled={value >= max}
            className={styles.stepperButton}
          />
        </div>
      </div>
    </div>
  );

  // Render select row
  const renderSelect = <T extends string | number>(
    label: string,
    value: T,
    optionsList: { value: T; label: string }[],
    onUpdate: (newValue: T) => void
  ) => (
    <div className={styles.formRow}>
      <Text className={styles.label}>{label}</Text>
      <Select
        value={value}
        onChange={onUpdate}
        className={styles.select}
        popupMatchSelectWidth={false}
      >
        {optionsList.map((opt) => (
          <Select.Option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </Select.Option>
        ))}
      </Select>
    </div>
  );

  // Common options for all workout types
  const renderCommonOptions = () => (
    <>
      {/* Warm Up */}
      {renderSelect('Warm Up', options.warmUp, WARM_UP_OPTIONS, (v) => updateOption('warmUp', v))}

      {/* Target Grade */}
      <div className={styles.formRow}>
        <Text className={styles.label}>Target Grade</Text>
        <Select
          value={options.targetGrade}
          onChange={(v) => updateOption('targetGrade', v)}
          className={styles.select}
          popupMatchSelectWidth={false}
        >
          {grades.map((grade) => (
            <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
              {grade.difficulty_name}
            </Select.Option>
          ))}
        </Select>
      </div>
    </>
  );

  // Quality filters section
  const renderQualityFilters = () => (
    <>
      <div className={styles.formRow}>
        <Text className={styles.label}>Min Ascents</Text>
        <InputNumber
          min={0}
          max={1000}
          value={options.minAscents}
          onChange={(v) => updateOption('minAscents', v || 0)}
          className={styles.inputNumber}
        />
      </div>

      <div className={styles.formRow}>
        <Text className={styles.label}>Min Rating</Text>
        <InputNumber
          min={0}
          max={3}
          step={0.5}
          value={options.minRating}
          onChange={(v) => updateOption('minRating', v || 0)}
          className={styles.inputNumber}
        />
      </div>

      {/* Climb Bias */}
      {renderSelect('Climb Bias', options.climbBias, CLIMB_BIAS_OPTIONS, (v) => updateOption('climbBias', v))}

      {/* Tall Climbs Only - only for Kilter Homewall large size */}
      {showTallClimbsFilter && (
        <div className={styles.formRow}>
          <Tooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
            <Text className={styles.label}>Tall Climbs Only</Text>
          </Tooltip>
          <Switch
            checked={options.onlyTallClimbs}
            onChange={(checked) => updateOption('onlyTallClimbs', checked)}
          />
        </div>
      )}
    </>
  );

  // Volume-specific options
  const renderVolumeOptions = () => {
    const volumeOptions = options as VolumeOptions;
    return (
      <>
        {renderCommonOptions()}

        {renderStepper('Main Set Climbs', volumeOptions.mainSetClimbs, (v) =>
          onChange({ ...volumeOptions, mainSetClimbs: v })
        )}

        {renderStepper('Main Set Variability', volumeOptions.mainSetVariability, (v) =>
          onChange({ ...volumeOptions, mainSetVariability: v }), 0, 5
        )}

        {renderQualityFilters()}
      </>
    );
  };

  // Pyramid-specific options
  const renderPyramidOptions = () => {
    const pyramidOptions = options as PyramidOptions;
    return (
      <>
        {renderCommonOptions()}

        {renderStepper('Number of Steps', pyramidOptions.numberOfSteps, (v) =>
          onChange({ ...pyramidOptions, numberOfSteps: v }), 3, 15
        )}

        {renderStepper('Climbs per Step', pyramidOptions.climbsPerStep, (v) =>
          onChange({ ...pyramidOptions, climbsPerStep: v }), 1, 5
        )}

        {renderQualityFilters()}
      </>
    );
  };

  // Ladder-specific options
  const renderLadderOptions = () => {
    const ladderOptions = options as LadderOptions;
    return (
      <>
        {renderCommonOptions()}

        {renderStepper('Number of Steps', ladderOptions.numberOfSteps, (v) =>
          onChange({ ...ladderOptions, numberOfSteps: v }), 3, 15
        )}

        {renderStepper('Climbs per Step', ladderOptions.climbsPerStep, (v) =>
          onChange({ ...ladderOptions, climbsPerStep: v }), 1, 5
        )}

        {renderQualityFilters()}
      </>
    );
  };

  // Grade Focus-specific options
  const renderGradeFocusOptions = () => {
    const focusOptions = options as GradeFocusOptions;
    return (
      <>
        {renderCommonOptions()}

        {renderStepper('Number of Climbs', focusOptions.numberOfClimbs, (v) =>
          onChange({ ...focusOptions, numberOfClimbs: v }), 1, 50
        )}

        {renderQualityFilters()}
      </>
    );
  };

  // Render the appropriate options form
  const renderOptionsForm = () => {
    switch (workoutType) {
      case 'volume':
        return renderVolumeOptions();
      case 'pyramid':
        return renderPyramidOptions();
      case 'ladder':
        return renderLadderOptions();
      case 'gradeFocus':
        return renderGradeFocusOptions();
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {renderOptionsForm()}
      </div>

      <div className={styles.resetContainer}>
        <Button
          type="link"
          icon={<ReloadOutlined />}
          onClick={onReset}
          className={styles.resetButton}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default GeneratorOptionsForm;

// Helper to get default options for a workout type
export const getDefaultOptions = (workoutType: WorkoutType, targetGrade: number): GeneratorOptions => {
  switch (workoutType) {
    case 'volume':
      return { ...DEFAULT_VOLUME_OPTIONS, targetGrade };
    case 'pyramid':
      return { ...DEFAULT_PYRAMID_OPTIONS, targetGrade };
    case 'ladder':
      return { ...DEFAULT_LADDER_OPTIONS, targetGrade };
    case 'gradeFocus':
      return { ...DEFAULT_GRADE_FOCUS_OPTIONS, targetGrade };
  }
};

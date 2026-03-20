// Playlist Generation Utilities

import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import {
  GeneratorOptions,
  PlannedClimbSlot,
  WARM_UP_CONFIG,
  VolumeOptions,
  PyramidOptions,
  LadderOptions,
  GradeFocusOptions,
} from './types';

const MIN_GRADE = TENSION_KILTER_GRADES[0].difficulty_id; // 10
const MAX_GRADE = TENSION_KILTER_GRADES[TENSION_KILTER_GRADES.length - 1].difficulty_id; // 33

// Clamp grade to valid range
const clampGrade = (grade: number): number => {
  return Math.max(MIN_GRADE, Math.min(MAX_GRADE, grade));
};

// Generate warm-up slots
const generateWarmUp = (targetGrade: number, warmUpType: 'standard' | 'extended' | 'none'): PlannedClimbSlot[] => {
  if (warmUpType === 'none') {
    return [];
  }

  const config = WARM_UP_CONFIG[warmUpType];
  const slots: PlannedClimbSlot[] = [];

  // Start from lower grades and work up
  const startGrade = clampGrade(targetGrade - config.grades);
  let index = 0;

  for (let grade = startGrade; grade < targetGrade; grade++) {
    if (grade < MIN_GRADE) continue;

    for (let i = 0; i < config.climbsPerGrade; i++) {
      slots.push({
        grade: clampGrade(grade),
        section: 'warmUp',
        index: index++,
      });
    }
  }

  return slots;
};

// Generate Volume workout plan
export const generateVolumePlan = (options: VolumeOptions): PlannedClimbSlot[] => {
  const slots: PlannedClimbSlot[] = [];

  // Add warm-up
  const warmUpSlots = generateWarmUp(options.targetGrade, options.warmUp);
  slots.push(...warmUpSlots);

  // Add main set with variability
  const mainStartIndex = slots.length;

  for (let i = 0; i < options.mainSetClimbs; i++) {
    // Distribute climbs across the grade range
    let grade: number;
    if (options.mainSetVariability === 0) {
      grade = options.targetGrade;
    } else {
      // Weighted distribution favoring target grade
      const offset = Math.round((Math.random() * 2 - 1) * options.mainSetVariability);
      grade = clampGrade(options.targetGrade + offset);
    }

    slots.push({
      grade,
      section: 'main',
      index: mainStartIndex + i,
    });
  }

  return slots;
};

// Generate Pyramid workout plan
export const generatePyramidPlan = (options: PyramidOptions): PlannedClimbSlot[] => {
  const slots: PlannedClimbSlot[] = [];

  // Add warm-up
  const warmUpSlots = generateWarmUp(options.targetGrade, options.warmUp);
  slots.push(...warmUpSlots);

  // Calculate step size
  // Start from a lower grade, peak at target, then come back down
  const warmUpEndGrade = warmUpSlots.length > 0
    ? warmUpSlots[warmUpSlots.length - 1].grade
    : clampGrade(options.targetGrade - options.numberOfSteps);

  const stepsUp = Math.floor(options.numberOfSteps / 2) + 1;
  const stepsDown = options.numberOfSteps - stepsUp + 1;

  const gradeIncrement = Math.max(1, Math.floor((options.targetGrade - warmUpEndGrade) / Math.max(1, stepsUp - 1)));

  let currentIndex = slots.length;

  // Increasing phase
  for (let step = 0; step < stepsUp; step++) {
    const grade = step === stepsUp - 1
      ? options.targetGrade
      : clampGrade(warmUpEndGrade + (gradeIncrement * step));

    for (let i = 0; i < options.climbsPerStep; i++) {
      slots.push({
        grade,
        section: step === stepsUp - 1 ? 'peak' : 'increasing',
        index: currentIndex++,
      });
    }
  }

  // Decreasing phase
  for (let step = 1; step < stepsDown; step++) {
    const grade = clampGrade(options.targetGrade - (gradeIncrement * step));

    for (let i = 0; i < options.climbsPerStep; i++) {
      slots.push({
        grade,
        section: 'decreasing',
        index: currentIndex++,
      });
    }
  }

  return slots;
};

// Generate Ladder workout plan
export const generateLadderPlan = (options: LadderOptions): PlannedClimbSlot[] => {
  const slots: PlannedClimbSlot[] = [];

  // Add warm-up
  const warmUpSlots = generateWarmUp(options.targetGrade, options.warmUp);
  slots.push(...warmUpSlots);

  // Calculate starting grade and step size
  const warmUpEndGrade = warmUpSlots.length > 0
    ? warmUpSlots[warmUpSlots.length - 1].grade
    : clampGrade(options.targetGrade - options.numberOfSteps);

  const gradeIncrement = Math.max(1, Math.floor((options.targetGrade - warmUpEndGrade) / Math.max(1, options.numberOfSteps - 1)));

  let currentIndex = slots.length;

  // Increasing phase only (ladder goes up)
  for (let step = 0; step < options.numberOfSteps; step++) {
    const grade = step === options.numberOfSteps - 1
      ? options.targetGrade
      : clampGrade(warmUpEndGrade + (gradeIncrement * step));

    for (let i = 0; i < options.climbsPerStep; i++) {
      slots.push({
        grade,
        section: step === options.numberOfSteps - 1 ? 'peak' : 'increasing',
        index: currentIndex++,
      });
    }
  }

  return slots;
};

// Generate Grade Focus workout plan
export const generateGradeFocusPlan = (options: GradeFocusOptions): PlannedClimbSlot[] => {
  const slots: PlannedClimbSlot[] = [];

  // Add warm-up
  const warmUpSlots = generateWarmUp(options.targetGrade, options.warmUp);
  slots.push(...warmUpSlots);

  // All climbs at target grade
  const mainStartIndex = slots.length;

  for (let i = 0; i < options.numberOfClimbs; i++) {
    slots.push({
      grade: options.targetGrade,
      section: 'main',
      index: mainStartIndex + i,
    });
  }

  return slots;
};

// Main function to generate plan based on options
export const generateWorkoutPlan = (options: GeneratorOptions): PlannedClimbSlot[] => {
  switch (options.type) {
    case 'volume':
      return generateVolumePlan(options);
    case 'pyramid':
      return generatePyramidPlan(options);
    case 'ladder':
      return generateLadderPlan(options);
    case 'gradeFocus':
      return generateGradeFocusPlan(options);
    default:
      return [];
  }
};

// Get grade name from difficulty_id
export const getGradeName = (difficultyId: number): string => {
  const grade = TENSION_KILTER_GRADES.find((g) => g.difficulty_id === difficultyId);
  return grade?.difficulty_name || `Grade ${difficultyId}`;
};

// Group slots by section for display
export interface GroupedSlots {
  section: PlannedClimbSlot['section'];
  label: string;
  slots: PlannedClimbSlot[];
}

export const groupSlotsBySection = (slots: PlannedClimbSlot[]): GroupedSlots[] => {
  const groups: GroupedSlots[] = [];
  let currentSection: PlannedClimbSlot['section'] | null = null;
  let currentGroup: PlannedClimbSlot[] = [];

  const sectionLabels: Record<PlannedClimbSlot['section'], string> = {
    warmUp: 'Warm Up',
    increasing: 'Increasing',
    peak: 'Peak',
    decreasing: 'Decreasing',
    main: 'Main Set',
  };

  for (const slot of slots) {
    if (slot.section !== currentSection) {
      if (currentSection && currentGroup.length > 0) {
        groups.push({
          section: currentSection,
          label: sectionLabels[currentSection],
          slots: [...currentGroup],
        });
      }
      currentSection = slot.section;
      currentGroup = [slot];
    } else {
      currentGroup.push(slot);
    }
  }

  // Add final group
  if (currentSection && currentGroup.length > 0) {
    groups.push({
      section: currentSection,
      label: sectionLabels[currentSection],
      slots: currentGroup,
    });
  }

  return groups;
};

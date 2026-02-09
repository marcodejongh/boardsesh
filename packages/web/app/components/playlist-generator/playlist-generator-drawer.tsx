'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { ArrowBackOutlined, ElectricBoltOutlined } from '@mui/icons-material';
import { BoardDetails, Climb } from '@/app/lib/types';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { SEARCH_CLIMBS, ClimbSearchInputVariables, ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import {
  ADD_CLIMB_TO_PLAYLIST,
  AddClimbToPlaylistMutationVariables,
  AddClimbToPlaylistMutationResponse,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { WorkoutType, GeneratorOptions, PlannedClimbSlot, WORKOUT_TYPES } from './types';
import WorkoutTypeSelector from './workout-type-selector';
import GeneratorOptionsForm, { getDefaultOptions } from './generator-options-form';
import GradeProgressionChart from './grade-progression-chart';
import { generateWorkoutPlan, groupSlotsBySection, getGradeName } from './generation-utils';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './playlist-generator-drawer.module.css';


interface PlaylistGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
  onSuccess?: () => void;
}

type DrawerState = 'select' | 'configure' | 'generating';

const PlaylistGeneratorDrawer: React.FC<PlaylistGeneratorDrawerProps> = ({
  open,
  onClose,
  playlistUuid,
  boardDetails,
  angle,
  onSuccess,
}) => {
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  // Default target grade (middle of range)
  const defaultTargetGrade = 18; // 6b/V4

  const [drawerState, setDrawerState] = useState<DrawerState>('select');
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [options, setOptions] = useState<GeneratorOptions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (open) {
      setDrawerState('select');
      setSelectedType(null);
      setOptions(null);
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  // Generate the workout plan preview
  const plannedSlots = useMemo(() => {
    if (!options) return [];
    return generateWorkoutPlan(options);
  }, [options]);

  // Handle workout type selection
  const handleTypeSelect = useCallback((type: WorkoutType) => {
    setSelectedType(type);
    setOptions(getDefaultOptions(type, defaultTargetGrade));
    setDrawerState('configure');
  }, [defaultTargetGrade]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (drawerState === 'configure') {
      setDrawerState('select');
      setSelectedType(null);
      setOptions(null);
    }
  }, [drawerState]);

  // Handle options reset
  const handleReset = useCallback(() => {
    if (selectedType) {
      setOptions(getDefaultOptions(selectedType, defaultTargetGrade));
    }
  }, [selectedType, defaultTargetGrade]);

  // Search for climbs at a specific grade
  const searchClimbsForGrade = async (
    grade: number,
    excludeUuids: Set<string>
  ): Promise<Climb[]> => {
    const input: ClimbSearchInputVariables['input'] = {
      boardName: boardDetails.board_name,
      layoutId: boardDetails.layout_id,
      sizeId: boardDetails.size_id,
      setIds: boardDetails.set_ids.join(','),
      angle,
      minGrade: grade,
      maxGrade: grade,
      minAscents: options?.minAscents || 5,
      sortBy: 'quality',
      sortOrder: 'desc',
      page: 1,
      pageSize: 50, // Get a pool of climbs to choose from
      onlyTallClimbs: options?.onlyTallClimbs || false,
    };

    // Apply climb bias filters if user is authenticated
    if (options && isAuthenticated) {
      switch (options.climbBias) {
        case 'unfamiliar':
          input.hideAttempted = true;
          input.hideCompleted = true;
          break;
        case 'attempted':
          input.showOnlyAttempted = true;
          break;
        // 'any' - no additional filters
      }
    }

    const response = await executeGraphQL<ClimbSearchResponse, ClimbSearchInputVariables>(
      SEARCH_CLIMBS,
      { input },
      token
    );

    // Filter out already selected climbs
    return response.searchClimbs.climbs.filter((c) => !excludeUuids.has(c.uuid));
  };

  // Generate the playlist
  const handleGenerate = useCallback(async () => {
    if (!options || plannedSlots.length === 0) {
      showMessage('No climbs to generate', 'error');
      return;
    }

    setGenerating(true);
    setDrawerState('generating');
    setProgress({ current: 0, total: plannedSlots.length });

    const addedUuids = new Set<string>();
    const failedSlots: PlannedClimbSlot[] = [];

    // Group slots by grade to batch search
    const gradeGroups = new Map<number, PlannedClimbSlot[]>();
    for (const slot of plannedSlots) {
      const existing = gradeGroups.get(slot.grade) || [];
      existing.push(slot);
      gradeGroups.set(slot.grade, existing);
    }

    // Cache searched climbs by grade
    const climbCache = new Map<number, Climb[]>();

    let processed = 0;

    // Process slots in order
    for (const slot of plannedSlots) {
      try {
        // Get or search for climbs at this grade
        let availableClimbs = climbCache.get(slot.grade);
        if (!availableClimbs) {
          availableClimbs = await searchClimbsForGrade(slot.grade, addedUuids);
          climbCache.set(slot.grade, availableClimbs);
        } else {
          // Filter out already added
          availableClimbs = availableClimbs.filter((c) => !addedUuids.has(c.uuid));
          climbCache.set(slot.grade, availableClimbs);
        }

        if (availableClimbs.length === 0) {
          failedSlots.push(slot);
          processed++;
          setProgress({ current: processed, total: plannedSlots.length });
          continue;
        }

        // Pick a random climb from top candidates (weighted towards better quality)
        const poolSize = Math.min(5, availableClimbs.length);
        const selectedIndex = Math.floor(Math.random() * poolSize);
        const selectedClimb = availableClimbs[selectedIndex];

        // Add to playlist
        await executeGraphQL<AddClimbToPlaylistMutationResponse, AddClimbToPlaylistMutationVariables>(
          ADD_CLIMB_TO_PLAYLIST,
          {
            input: {
              playlistId: playlistUuid,
              climbUuid: selectedClimb.uuid,
              angle,
            },
          },
          token
        );

        addedUuids.add(selectedClimb.uuid);

        // Remove from cache
        const updatedCache = (climbCache.get(slot.grade) || []).filter(
          (c) => c.uuid !== selectedClimb.uuid
        );
        climbCache.set(slot.grade, updatedCache);

      } catch (error) {
        console.error('Error adding climb:', error);
        failedSlots.push(slot);
      }

      processed++;
      setProgress({ current: processed, total: plannedSlots.length });
    }

    setGenerating(false);

    if (failedSlots.length === 0) {
      showMessage(`Added ${plannedSlots.length} climbs to playlist`, 'success');
    } else if (failedSlots.length < plannedSlots.length) {
      showMessage(
        `Added ${plannedSlots.length - failedSlots.length} climbs. ${failedSlots.length} slots couldn't be filled.`,
        'warning'
      );
    } else {
      showMessage('Failed to generate playlist. No suitable climbs found.', 'error');
    }

    onSuccess?.();
    onClose();
  }, [options, plannedSlots, playlistUuid, angle, token, isAuthenticated, boardDetails, onSuccess, onClose]);

  // Get workout type info
  const workoutTypeInfo = selectedType
    ? WORKOUT_TYPES.find((t) => t.type === selectedType)
    : null;

  // Render title based on state
  const renderTitle = () => {
    if (drawerState === 'select') {
      return 'Generate Playlist';
    }
    if (drawerState === 'generating') {
      return 'Generating...';
    }
    return workoutTypeInfo?.name || 'Options';
  };

  // Render content based on state
  const renderContent = () => {
    if (drawerState === 'select') {
      return <WorkoutTypeSelector onSelect={handleTypeSelect} />;
    }

    if (drawerState === 'generating') {
      return (
        <div className={styles.generatingContainer}>
          <CircularProgress size={48} />
          <Typography variant="body2" component="span" className={styles.generatingText}>
            Adding climbs... {progress.current} / {progress.total}
          </Typography>
        </div>
      );
    }

    if (drawerState === 'configure' && selectedType && options) {
      const groupedSlots = groupSlotsBySection(plannedSlots);

      return (
        <div className={styles.configureContainer}>
          {/* Chart Preview */}
          <div className={styles.chartSection}>
            <GradeProgressionChart plannedSlots={plannedSlots} height={140} />
          </div>

          {/* Summary */}
          <div className={styles.summarySection}>
            {groupedSlots.map((group) => (
              <div key={group.section} className={styles.summaryRow}>
                <Typography variant="body2" component="span" color="text.secondary">{group.label}</Typography>
                <Typography variant="body2" component="span">
                  {group.slots.length} climb{group.slots.length !== 1 ? 's' : ''}
                  {' '}({getGradeName(group.slots[0].grade)}
                  {group.slots[0].grade !== group.slots[group.slots.length - 1].grade &&
                    ` - ${getGradeName(group.slots[group.slots.length - 1].grade)}`})
                </Typography>
              </div>
            ))}
            <div className={styles.totalRow}>
              <Typography variant="body2" component="span" fontWeight={600}>Total</Typography>
              <Typography variant="body2" component="span" fontWeight={600}>{plannedSlots.length} climbs</Typography>
            </div>
          </div>

          {/* Options Form */}
          <div className={styles.optionsSection}>
            <GeneratorOptionsForm
              workoutType={selectedType}
              options={options}
              onChange={setOptions}
              onReset={handleReset}
              boardDetails={boardDetails}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <SwipeableDrawer
      title={
        <div className={styles.drawerHeader}>
          {drawerState === 'configure' && (
            <MuiButton
              variant="text"
              startIcon={<ArrowBackOutlined />}
              onClick={handleBack}
              className={styles.backButton}
            />
          )}
          <span className={styles.drawerTitle}>{renderTitle()}</span>
          {drawerState === 'configure' && <div className={styles.headerSpacer} />}
        </div>
      }
      open={open}
      onClose={generating ? undefined : onClose}
      placement="bottom"
      showCloseButton={!generating}
      disableBackdropClick={generating}
      styles={{
        wrapper: { height: '85vh' },
        header: {
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        },
        body: {
          padding: drawerState === 'select' ? 0 : 16,
          overflow: 'auto',
        },
      }}
      extra={
        drawerState === 'configure' && !generating ? (
          <MuiButton
            variant="contained"
            startIcon={<ElectricBoltOutlined />}
            onClick={handleGenerate}
            disabled={plannedSlots.length === 0}
          >
            Generate
          </MuiButton>
        ) : null
      }
    >
      {renderContent()}
    </SwipeableDrawer>
  );
};

export default PlaylistGeneratorDrawer;

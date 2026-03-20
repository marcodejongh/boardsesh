'use client';

import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useMoonBoardCreateClimb } from '../create-climb/use-moonboard-create-climb';
import { coordinateToHoldId, holdIdToCoordinate, MOONBOARD_HOLD_STATES } from '@/app/lib/moonboard-config';
import type { MoonBoardClimb, GridCoordinate } from '@boardsesh/moonboard-ocr/browser';
import type { LitUpHoldsMap } from '../board-renderer/types';
import styles from './moonboard-edit-modal.module.css';


interface MoonBoardEditModalProps {
  open: boolean;
  climb: MoonBoardClimb;
  layoutFolder: string;
  holdSetImages: string[];
  onSave: (updatedClimb: MoonBoardClimb) => void;
  onCancel: () => void;
}

/**
 * Convert OCR climb holds to the lit up holds map format
 */
function convertClimbToHoldsMap(climb: MoonBoardClimb): LitUpHoldsMap {
  const map: LitUpHoldsMap = {};

  climb.holds.start.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = {
      state: 'STARTING',
      color: MOONBOARD_HOLD_STATES.start.color,
      displayColor: MOONBOARD_HOLD_STATES.start.displayColor,
    };
  });

  climb.holds.hand.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = {
      state: 'HAND',
      color: MOONBOARD_HOLD_STATES.hand.color,
      displayColor: MOONBOARD_HOLD_STATES.hand.displayColor,
    };
  });

  climb.holds.finish.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = {
      state: 'FINISH',
      color: MOONBOARD_HOLD_STATES.finish.color,
      displayColor: MOONBOARD_HOLD_STATES.finish.displayColor,
    };
  });

  return map;
}

/**
 * Convert lit up holds map back to OCR hold format
 */
function convertHoldsMapToOcrFormat(holdsMap: LitUpHoldsMap): MoonBoardClimb['holds'] {
  const holds: MoonBoardClimb['holds'] = {
    start: [],
    hand: [],
    finish: [],
  };

  // Map standard HoldState to OCR format keys
  const stateToKey = {
    STARTING: 'start',
    HAND: 'hand',
    FINISH: 'finish',
  } as const;

  Object.entries(holdsMap).forEach(([id, hold]) => {
    const coord = holdIdToCoordinate(Number(id)) as GridCoordinate;
    const key = stateToKey[hold.state as keyof typeof stateToKey];
    if (key) {
      holds[key].push(coord);
    }
  });

  return holds;
}

export default function MoonBoardEditModal({
  open,
  climb,
  layoutFolder,
  holdSetImages,
  onSave,
  onCancel,
}: MoonBoardEditModalProps) {
  const [climbName, setClimbName] = useState(climb.name);

  const initialHoldsMap = convertClimbToHoldsMap(climb);

  const {
    litUpHoldsMap,
    setLitUpHoldsMap,
    handleHoldClick,
    startingCount,
    finishCount,
    handCount,
    totalHolds,
    isValid,
  } = useMoonBoardCreateClimb({ initialHoldsMap });

  // Reset to initial state when climb changes
  useEffect(() => {
    if (open) {
      const newHoldsMap = convertClimbToHoldsMap(climb);
      setLitUpHoldsMap(newHoldsMap);
      setClimbName(climb.name);
    }
  }, [climb, open, setLitUpHoldsMap]);

  const handleOk = () => {
    if (!climbName.trim()) return;
    const updatedClimb: MoonBoardClimb = {
      ...climb,
      name: climbName.trim(),
      holds: convertHoldsMapToOcrFormat(litUpHoldsMap),
    };
    onSave(updatedClimb);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      className={styles.modal}
    >
      <DialogTitle>Edit Climb</DialogTitle>
      <DialogContent>
        <div className={styles.content}>
          <div className={styles.boardSection}>
            <MoonBoardRenderer
              layoutFolder={layoutFolder}
              holdSetImages={holdSetImages}
              litUpHoldsMap={litUpHoldsMap}
              onHoldClick={handleHoldClick}
            />

            <div className={styles.holdCounts}>
              <Chip label={`Start: ${startingCount}/2`} size="small" color={startingCount > 0 ? 'error' : undefined} />
              <Chip label={`Hand: ${handCount}`} size="small" color={handCount > 0 ? 'primary' : undefined} />
              <Chip label={`Finish: ${finishCount}/2`} size="small" color={finishCount > 0 ? 'success' : undefined} />
              <Chip label={`Total: ${totalHolds}`} size="small" color={totalHolds > 0 ? 'secondary' : undefined} />
            </div>

            {!isValid && totalHolds > 0 && (
              <Typography variant="body2" component="span" color="text.secondary" className={styles.validationHint}>
                A valid climb needs at least 1 start hold and 1 finish hold
              </Typography>
            )}
          </div>

          <div className={styles.formSection}>
            <TextField
              label="Climb Name"
              value={climbName}
              onChange={(e) => setClimbName(e.target.value)}
              required
              fullWidth
              size="small"
              placeholder="Climb name"
              slotProps={{ htmlInput: { maxLength: 100 } }}
              error={!climbName.trim()}
              helperText={!climbName.trim() ? 'Please enter a name' : undefined}
            />

            <div className={styles.climbInfo}>
              <Typography variant="body2" component="span" color="text.secondary">Setter: {climb.setter || 'Unknown'}</Typography>
              <Typography variant="body2" component="span" color="text.secondary">Grade: {climb.userGrade || 'Unknown'}</Typography>
              <Typography variant="body2" component="span" color="text.secondary">Angle: {climb.angle}°</Typography>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleOk} disabled={!isValid}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}

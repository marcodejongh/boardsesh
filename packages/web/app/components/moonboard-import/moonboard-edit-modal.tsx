'use client';

import React, { useEffect } from 'react';
import { Form, Input } from 'antd';
import Typography from '@mui/material/Typography';
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
  const [form] = Form.useForm<{ name: string }>();

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
    resetHolds,
  } = useMoonBoardCreateClimb({ initialHoldsMap });

  // Reset to initial state when climb changes
  useEffect(() => {
    if (open) {
      const newHoldsMap = convertClimbToHoldsMap(climb);
      setLitUpHoldsMap(newHoldsMap);
      form.setFieldsValue({ name: climb.name });
    }
  }, [climb, open, setLitUpHoldsMap, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const updatedClimb: MoonBoardClimb = {
        ...climb,
        name: values.name,
        holds: convertHoldsMapToOcrFormat(litUpHoldsMap),
      };
      onSave(updatedClimb);
    });
  };

  return (
    <Modal
      title="Edit Climb"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Save Changes"
      okButtonProps={{ disabled: !isValid }}
      width={600}
      className={styles.modal}
    >
      <div className={styles.content}>
        <div className={styles.boardSection}>
          <MoonBoardRenderer
            layoutFolder={layoutFolder}
            holdSetImages={holdSetImages}
            litUpHoldsMap={litUpHoldsMap}
            onHoldClick={handleHoldClick}
          />

          <div className={styles.holdCounts}>
            <Tag color={startingCount > 0 ? 'red' : 'default'}>Start: {startingCount}/2</Tag>
            <Tag color={handCount > 0 ? 'blue' : 'default'}>Hand: {handCount}</Tag>
            <Tag color={finishCount > 0 ? 'green' : 'default'}>Finish: {finishCount}/2</Tag>
            <Tag color={totalHolds > 0 ? 'purple' : 'default'}>Total: {totalHolds}</Tag>
          </div>

          {!isValid && totalHolds > 0 && (
            <Typography variant="body2" component="span" color="text.secondary" className={styles.validationHint}>
              A valid climb needs at least 1 start hold and 1 finish hold
            </Typography>
          )}
        </div>

        <Form form={form} layout="vertical" className={styles.formSection}>
          <Form.Item
            name="name"
            label="Climb Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Climb name" maxLength={100} />
          </Form.Item>

          <div className={styles.climbInfo}>
            <Typography variant="body2" component="span" color="text.secondary">Setter: {climb.setter || 'Unknown'}</Typography>
            <Typography variant="body2" component="span" color="text.secondary">Grade: {climb.userGrade || 'Unknown'}</Typography>
            <Typography variant="body2" component="span" color="text.secondary">Angle: {climb.angle}°</Typography>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

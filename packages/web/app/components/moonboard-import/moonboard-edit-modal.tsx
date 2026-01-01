'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, Tag, Typography } from 'antd';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';
import { useMoonBoardCreateClimb } from '../create-climb/use-moonboard-create-climb';
import { coordinateToHoldId, holdIdToCoordinate, MOONBOARD_HOLD_STATES } from '@/app/lib/moonboard-config';
import type { MoonBoardClimb, GridCoordinate } from '@boardsesh/moonboard-ocr/browser';
import type { MoonBoardLitUpHoldsMap } from '../moonboard-renderer/types';
import styles from './moonboard-edit-modal.module.css';

const { Text } = Typography;

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
function convertClimbToHoldsMap(climb: MoonBoardClimb): MoonBoardLitUpHoldsMap {
  const map: MoonBoardLitUpHoldsMap = {};

  climb.holds.start.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = { type: 'start', color: MOONBOARD_HOLD_STATES.start.color };
  });

  climb.holds.hand.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = { type: 'hand', color: MOONBOARD_HOLD_STATES.hand.color };
  });

  climb.holds.finish.forEach((coord) => {
    const holdId = coordinateToHoldId(coord);
    map[holdId] = { type: 'finish', color: MOONBOARD_HOLD_STATES.finish.color };
  });

  return map;
}

/**
 * Convert lit up holds map back to OCR hold format
 */
function convertHoldsMapToOcrFormat(holdsMap: MoonBoardLitUpHoldsMap): MoonBoardClimb['holds'] {
  const holds: MoonBoardClimb['holds'] = {
    start: [],
    hand: [],
    finish: [],
  };

  Object.entries(holdsMap).forEach(([id, hold]) => {
    const coord = holdIdToCoordinate(Number(id)) as GridCoordinate;
    holds[hold.type].push(coord);
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
            <Text type="secondary" className={styles.validationHint}>
              A valid climb needs at least 1 start hold and 1 finish hold
            </Text>
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
            <Text type="secondary">Setter: {climb.setter || 'Unknown'}</Text>
            <Text type="secondary">Grade: {climb.userGrade || 'Unknown'}</Text>
            <Text type="secondary">Angle: {climb.angle}°</Text>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

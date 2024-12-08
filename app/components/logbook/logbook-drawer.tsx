'use client';

import React, { useState, useEffect } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Drawer, DatePicker, Select, Input, Rate, Slider, InputNumber, Form, Space } from 'antd';
import { TENSION_KILTER_GRADES, ANGLES } from '@/app/lib/board-data';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface LogbookDrawerProps {
  drawerVisible: boolean;
  closeDrawer: () => void;
  expanded: boolean;
  handleLogAscentClick: () => void;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const LogbookDrawer: React.FC<LogbookDrawerProps> = ({
  drawerVisible,
  closeDrawer,
  expanded,
  handleLogAscentClick,
  currentClimb,
  boardDetails
}) => {
  const { user } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const angleOptions = ANGLES[boardDetails.board_name];
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    console.log('Form submitted:', values);
    // Handle form submission
  };

  const handleClose = () => {
    form.resetFields();
    closeDrawer();
  };

  useEffect(() => {
    if (drawerVisible && expanded) {
      // Set initial values when drawer opens
      form.setFieldsValue({
        date: dayjs(),
        angle: currentClimb?.angle,
        difficulty: currentClimb?.difficulty,
        attempts: 1,
        quality: 3
      });
    }
  }, [drawerVisible, expanded, currentClimb, form]);

  const formItemLayout = {
    labelCol: { flex: '120px' },
    wrapperCol: { flex: 'auto' },
    style: { marginBottom: '12px' }
  };

  return (
    <Drawer
      title={expanded ? 'Log Ascent' : 'Log Options'}
      placement="bottom"
      onClose={handleClose}
      open={drawerVisible}
      height={expanded ? '90%' : '30%'}
    >
      {!expanded ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => console.log('Logbook clicked')}
          >
            Logbook
          </Button>
          <Button type="primary" block style={{ maxWidth: '400px', width: '100%' }} onClick={handleLogAscentClick}>
            Log Ascent
          </Button>
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => console.log('Log Attempt clicked')}
          >
            Log Attempt
          </Button>
        </div>
      ) : (
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSubmit}
        >
          {/* Rest of the form items remain the same */}
          <Form.Item label="Boulder" {...formItemLayout}>
            <strong>{currentClimb?.name || 'N/A'}</strong>
          </Form.Item>

          <Form.Item
            name="date"
            label="Date and Time"
            {...formItemLayout}
          >
            <DatePicker showTime showSecond={false} />
          </Form.Item>

          <Form.Item
            name="angle"
            label="Angle"
            {...formItemLayout}
          >
            <Select
              options={angleOptions.map((angle) => ({
                label: `${angle}°`,
                value: angle,
              }))}
              style={{ width: '80px' }}
            />
          </Form.Item>

          <Form.Item
            name="attempts"
            label="Attempts"
            {...formItemLayout}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Form.Item name="attempts" noStyle>
                <InputNumber
                  min={1}
                  max={999}
                  style={{ width: '80px' }}
                />
              </Form.Item>
              <Form.Item name="attempts" noStyle>
                <Slider
                  min={1}
                  max={100}
                  tooltip={{ formatter: value => `${value} attempts` }}
                />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item
            name="quality"
            label="Quality"
            {...formItemLayout}
          >
            <Rate allowClear={false} count={3} />
          </Form.Item>

          <Form.Item
            name="difficulty"
            label="Difficulty"
            {...formItemLayout}
          >
            <Select
              options={grades.map((grade) => ({
                label: grade.difficulty_name,
                value: grade.difficulty_id,
              }))}
              style={{ width: '120px' }}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
            {...formItemLayout}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 0, span: 24 }} style={{ marginBottom: '8px' }}>
            <Button type="primary" htmlType="submit" block size="large">
              Submit
            </Button>
          </Form.Item>
          
          <Form.Item wrapperCol={{ offset: 0, span: 24 }}>
            <Button block size="large" onClick={handleClose}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
};
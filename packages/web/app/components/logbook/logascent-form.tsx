import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Select, Input, Rate, InputNumber, Form, Space, Tag, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider, TickStatus } from '../board-provider/board-provider-context';
import { TENSION_KILTER_GRADES, ANGLES } from '@/app/lib/board-data';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface LogAscentFormValues {
  date: dayjs.Dayjs;
  angle: number;
  attempts: number;
  quality: number;
  difficulty: number;
  notes?: string;
}

// Helper to determine tick status from attempt count
const getTickStatus = (attempts: number): TickStatus => {
  return attempts === 1 ? 'flash' : 'send';
};

interface LogAscentFormProps {
  currentClimb: Climb;
  boardDetails: BoardDetails;
  onClose: () => void;
}

export const LogAscentForm: React.FC<LogAscentFormProps> = ({ currentClimb, boardDetails, onClose }) => {
  const { saveTick, isAuthenticated } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const angleOptions = ANGLES[boardDetails.board_name];
  const [form] = Form.useForm<LogAscentFormValues>();
  const [isMirrored, setIsMirrored] = useState(!!currentClimb?.mirrored);
  const [isSaving, setIsSaving] = useState(false);

  // TODO: Tension spray doesnt support mirroring
  const showMirrorTag = boardDetails.supportsMirroring;

  useEffect(() => {
    form.setFieldsValue({
      date: dayjs(),
      angle: currentClimb?.angle,
      difficulty: grades.find((grade) => grade.difficulty_name === currentClimb?.difficulty)?.difficulty_id,
      attempts: 1,
    });
    setIsMirrored(!!currentClimb?.mirrored);
  }, [currentClimb, form, grades]);

  const handleMirrorToggle = () => {
    setIsMirrored((prev) => !prev);
  };

  // Validation function matching backend rules
  const validateTickInput = (values: LogAscentFormValues): string | null => {
    const status = getTickStatus(values.attempts);

    // Flash requires attemptCount === 1
    if (status === 'flash' && values.attempts !== 1) {
      return 'Flash requires exactly 1 attempt';
    }

    // Send requires attemptCount > 1
    if (status === 'send' && values.attempts <= 1) {
      return 'Send requires more than 1 attempt';
    }

    return null; // Valid
  };

  const handleSubmit = async (values: LogAscentFormValues) => {
    if (!currentClimb?.uuid || !isAuthenticated) {
      return;
    }

    // Client-side validation
    const validationError = validateTickInput(values);
    if (validationError) {
      console.error('Validation error:', validationError);
      return;
    }

    setIsSaving(true);

    try {
      await saveTick({
        climbUuid: currentClimb.uuid,
        angle: Number(values.angle),
        isMirror: isMirrored,
        status: getTickStatus(values.attempts),
        attemptCount: values.attempts,
        quality: values.quality,
        difficulty: values.difficulty,
        isBenchmark: false,
        comment: values.notes || '',
        climbedAt: values.date.toISOString(),
      });

      track('Tick Logged', {
        boardLayout: boardDetails.layout_name || '',
        status: getTickStatus(values.attempts),
      });

      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Failed to save tick:', error);
      track('Tick Save Failed', {
        boardLayout: boardDetails.layout_name || '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formItemLayout = {
    labelCol: { flex: '120px' },
    wrapperCol: { flex: 'auto' },
    style: { marginBottom: '12px' },
  };

  return (
    <Form form={form} layout="horizontal" onFinish={handleSubmit}>
      <Form.Item label="Boulder" {...formItemLayout}>
        <Space>
          <strong>{currentClimb?.name || 'N/A'}</strong>
          {showMirrorTag && (
            <Space size={4}>
              <Tag
                color={isMirrored ? 'purple' : 'default'}
                style={{ cursor: 'pointer', margin: 0 }}
                onClick={handleMirrorToggle}
              >
                Mirrored
              </Tag>
              <Tooltip title="Click the tag to toggle whether you completed this climb on the mirrored side">
                <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
              </Tooltip>
            </Space>
          )}
        </Space>
      </Form.Item>

      <Form.Item name="date" label="Date and Time" {...formItemLayout}>
        <DatePicker showTime showSecond={false} />
      </Form.Item>

      <Form.Item name="angle" label="Angle" {...formItemLayout}>
        <Select
          options={angleOptions.map((angle) => ({
            label: `${angle}°`,
            value: angle,
          }))}
          style={{ width: '80px' }}
        />
      </Form.Item>

      <Form.Item name="attempts" label="Attempts" {...formItemLayout}>
        <InputNumber min={1} max={999} style={{ width: '80px' }} />
      </Form.Item>

      <Form.Item name="quality" label="Quality" {...formItemLayout} rules={[{ required: true, message: 'Please rate the climb' }]}>
        <Rate count={5} />
      </Form.Item>

      <Form.Item name="difficulty" label="Difficulty" {...formItemLayout}>
        <Select
          options={grades.map((grade) => ({
            label: grade.difficulty_name,
            value: grade.difficulty_id,
          }))}
          style={{ width: '120px' }}
        />
      </Form.Item>

      <Form.Item name="notes" label="Notes" {...formItemLayout}>
        <TextArea rows={3} />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 0, span: 24 }} style={{ marginBottom: '8px' }}>
        <Button type="primary" htmlType="submit" loading={isSaving} disabled={isSaving} block size="large">
          Submit
        </Button>
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 0, span: 24 }}>
        <Button block size="large" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
      </Form.Item>
    </Form>
  );
};

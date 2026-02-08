import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Select, Input, Rate, InputNumber, Form, Tag, Tooltip, Segmented } from 'antd';
import Stack from '@mui/material/Stack';
import { InfoCircleOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider, TickStatus } from '../board-provider/board-provider-context';
import { TENSION_KILTER_GRADES, ANGLES } from '@/app/lib/board-data';
import { themeTokens } from '@/app/theme/theme-config';
import dayjs from 'dayjs';

const { TextArea } = Input;

type LogType = 'ascent' | 'attempt';

interface LogAscentFormValues {
  date: dayjs.Dayjs;
  angle: number;
  attempts: number;
  quality: number;
  difficulty: number;
  notes?: string;
}

// Helper to determine tick status from attempt count (for ascents)
const getAscentStatus = (attempts: number): TickStatus => {
  return attempts === 1 ? 'flash' : 'send';
};

// Helper to determine tick status based on log type
const getTickStatus = (logType: LogType, attempts: number): TickStatus => {
  if (logType === 'attempt') {
    return 'attempt';
  }
  return getAscentStatus(attempts);
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
  const [logType, setLogType] = useState<LogType>('ascent');

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
    // Attempts don't need flash/send validation
    if (logType === 'attempt') {
      return null;
    }

    const status = getTickStatus(logType, values.attempts);

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

    const status = getTickStatus(logType, values.attempts);

    try {
      await saveTick({
        climbUuid: currentClimb.uuid,
        angle: Number(values.angle),
        isMirror: isMirrored,
        status,
        attemptCount: values.attempts,
        quality: logType === 'ascent' ? values.quality : undefined,
        difficulty: logType === 'ascent' ? values.difficulty : undefined,
        isBenchmark: false,
        comment: values.notes || '',
        climbedAt: values.date.toISOString(),
      });

      track('Tick Logged', {
        boardLayout: boardDetails.layout_name || '',
        status,
      });

      form.resetFields();
      setLogType('ascent');
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
      <Form.Item wrapperCol={{ span: 24 }} style={{ marginBottom: '16px' }}>
        <Segmented
          block
          options={[
            { label: 'Ascent', value: 'ascent' },
            { label: 'Attempt', value: 'attempt' },
          ]}
          value={logType}
          onChange={(value) => setLogType(value as LogType)}
        />
      </Form.Item>

      <Form.Item label="Boulder" {...formItemLayout}>
        <Stack direction="row" spacing={1}>
          <strong>{currentClimb?.name || 'N/A'}</strong>
          {showMirrorTag && (
            <Stack direction="row" spacing={0.5}>
              <Tag
                color={isMirrored ? 'purple' : 'default'}
                style={{ cursor: 'pointer', margin: 0 }}
                onClick={handleMirrorToggle}
              >
                Mirrored
              </Tag>
              <Tooltip title="Click the tag to toggle whether you completed this climb on the mirrored side">
                <InfoCircleOutlined style={{ color: themeTokens.neutral[400], cursor: 'pointer' }} />
              </Tooltip>
            </Stack>
          )}
        </Stack>
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

      {logType === 'ascent' && (
        <Form.Item name="quality" label="Quality" {...formItemLayout} rules={[{ required: true, message: 'Please rate the climb' }]}>
          <Rate count={5} />
        </Form.Item>
      )}

      {logType === 'ascent' && (
        <Form.Item name="difficulty" label="Difficulty" {...formItemLayout}>
          <Select
            options={grades.map((grade) => ({
              label: grade.difficulty_name,
              value: grade.difficulty_id,
            }))}
            style={{ width: '120px' }}
          />
        </Form.Item>
      )}

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

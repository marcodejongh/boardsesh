'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Typography,
  Space,
  Modal,
  message,
  Spin,
  Tag,
  Popconfirm,
  Select,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ControllerInfo } from '@/app/api/internal/controllers/route';
import { getBoardSelectorOptions } from '@/app/lib/__generated__/product-sizes-data';
import { BoardName } from '@/app/lib/types';
import styles from './controllers-section.module.css';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

// Get board config data (synchronous - from generated data)
const boardSelectorOptions = getBoardSelectorOptions();

interface ControllerCardProps {
  controller: ControllerInfo;
  onRemove: () => void;
  isRemoving: boolean;
}

function ControllerCard({ controller, onRemove, isRemoving }: ControllerCardProps) {
  const boardName = controller.boardName.charAt(0).toUpperCase() + controller.boardName.slice(1);

  const getStatusTag = () => {
    if (controller.isOnline) {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Online
        </Tag>
      );
    }
    if (controller.lastSeen) {
      return (
        <Tag icon={<ClockCircleOutlined />} color="default">
          Offline
        </Tag>
      );
    }
    return (
      <Tag color="default">
        Never connected
      </Tag>
    );
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Card className={styles.controllerCard}>
      <div className={styles.cardHeader}>
        <Title level={5} style={{ margin: 0 }}>
          {controller.name || 'Unnamed Controller'}
        </Title>
        {getStatusTag()}
      </div>
      <div className={styles.controllerInfo}>
        <div className={styles.infoRow}>
          <Text type="secondary">Board:</Text>
          <Tag color="blue">{boardName}</Tag>
        </div>
        <div className={styles.infoRow}>
          <Text type="secondary">Layout:</Text>
          <Text>{controller.layoutId} / Size {controller.sizeId}</Text>
        </div>
        <div className={styles.infoRow}>
          <Text type="secondary">Last seen:</Text>
          <Text>{formatLastSeen(controller.lastSeen)}</Text>
        </div>
      </div>
      <Popconfirm
        title="Delete controller"
        description="Are you sure you want to delete this controller? This cannot be undone."
        onConfirm={onRemove}
        okText="Yes, delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Button danger icon={<DeleteOutlined />} loading={isRemoving} block>
          Delete Controller
        </Button>
      </Popconfirm>
    </Card>
  );
}

interface ApiKeySuccessModalProps {
  isOpen: boolean;
  apiKey: string;
  controllerName: string;
  onClose: () => void;
}

function ApiKeySuccessModal({ isOpen, apiKey, controllerName, onClose }: ApiKeySuccessModalProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      message.success('API key copied to clipboard');
    } catch {
      message.error('Failed to copy - please select and copy manually');
    }
  };

  return (
    <Modal
      title="Controller Registered"
      open={isOpen}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      }
      closable={false}
      maskClosable={false}
    >
      <Alert
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        message="Save this API key now!"
        description="This is the only time you'll see this key. If you lose it, you'll need to delete and re-register the controller."
        style={{ marginBottom: 16 }}
      />
      <Paragraph>
        Your controller <strong>{controllerName || 'Unnamed Controller'}</strong> has been registered.
      </Paragraph>
      <Paragraph type="secondary">
        Enter this API key in your ESP32 configuration:
      </Paragraph>
      <Input.TextArea
        value={apiKey}
        readOnly
        rows={2}
        style={{ fontFamily: 'monospace', marginBottom: 8 }}
      />
      <Button icon={<CopyOutlined />} onClick={handleCopy} block>
        Copy API Key
      </Button>
    </Modal>
  );
}

export default function ControllersSection() {
  const [controllers, setControllers] = useState<ControllerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Board configuration selection state
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<number | undefined>(undefined);
  const [selectedSets, setSelectedSets] = useState<number[]>([]);

  // Derived data for dropdowns
  const layouts = useMemo(() =>
    selectedBoard ? boardSelectorOptions.layouts[selectedBoard] || [] : [],
    [selectedBoard]
  );

  const sizes = useMemo(() =>
    selectedBoard && selectedLayout
      ? boardSelectorOptions.sizes[`${selectedBoard}-${selectedLayout}`] || []
      : [],
    [selectedBoard, selectedLayout]
  );

  const sets = useMemo(() =>
    selectedBoard && selectedLayout && selectedSize
      ? boardSelectorOptions.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || []
      : [],
    [selectedBoard, selectedLayout, selectedSize]
  );

  // Success state for showing API key
  const [successApiKey, setSuccessApiKey] = useState<string | null>(null);
  const [successControllerName, setSuccessControllerName] = useState('');

  const fetchControllers = async () => {
    try {
      const response = await fetch('/api/internal/controllers');
      if (response.ok) {
        const data = await response.json();
        setControllers(data.controllers);
      }
    } catch (error) {
      console.error('Failed to fetch controllers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControllers();
  }, []);

  const handleAddClick = () => {
    form.resetFields();
    setSelectedBoard(undefined);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setSelectedBoard(undefined);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
  };

  const handleBoardChange = (value: BoardName) => {
    setSelectedBoard(value);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
    form.setFieldsValue({ layoutId: undefined, sizeId: undefined, setIds: undefined });
  };

  const handleLayoutChange = (value: number) => {
    setSelectedLayout(value);
    setSelectedSize(undefined);
    setSelectedSets([]);
    form.setFieldsValue({ sizeId: undefined, setIds: undefined });
  };

  const handleSizeChange = (value: number) => {
    setSelectedSize(value);
    // Auto-select all sets when size is selected
    const availableSets = selectedBoard && selectedLayout
      ? boardSelectorOptions.sets[`${selectedBoard}-${selectedLayout}-${value}`] || []
      : [];
    const allSetIds = availableSets.map((s) => s.id);
    setSelectedSets(allSetIds);
    form.setFieldsValue({ setIds: allSetIds });
  };

  const handleSetsChange = (value: number[]) => {
    setSelectedSets(value);
  };

  const handleRegister = async (values: {
    name?: string;
    boardName: BoardName;
    layoutId: number;
    sizeId: number;
    setIds: number[];
  }) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/internal/controllers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          boardName: values.boardName,
          layoutId: values.layoutId,
          sizeId: values.sizeId,
          setIds: Array.isArray(values.setIds) ? values.setIds.join(',') : values.setIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register controller');
      }

      const data = await response.json();

      // Close the registration modal
      setIsModalOpen(false);
      form.resetFields();

      // Show the API key success modal
      setSuccessApiKey(data.apiKey);
      setSuccessControllerName(values.name || '');

      await fetchControllers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to register controller');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (controllerId: string) => {
    setRemovingId(controllerId);
    try {
      const response = await fetch('/api/internal/controllers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controllerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete controller');
      }

      message.success('Controller deleted successfully');
      await fetchControllers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete controller');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSuccessClose = () => {
    setSuccessApiKey(null);
    setSuccessControllerName('');
  };

  if (loading) {
    return (
      <Card>
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Title level={5}>ESP32 Controllers</Title>
        <Text type="secondary" className={styles.sectionDescription}>
          Register ESP32 devices to control your board via Bluetooth bridge.
          This allows you to use BoardSesh with official Kilter/Tension apps.
        </Text>

        {controllers.length === 0 ? (
          <div className={styles.emptyState}>
            <Text type="secondary">
              No controllers registered. Add an ESP32 to use BoardSesh with official apps.
            </Text>
          </div>
        ) : (
          <Space direction="vertical" size="middle" className={styles.cardsContainer}>
            {controllers.map((controller) => (
              <ControllerCard
                key={controller.id}
                controller={controller}
                onRemove={() => handleRemove(controller.id)}
                isRemoving={removingId === controller.id}
              />
            ))}
          </Space>
        )}

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddClick}
          block
          className={styles.addButton}
        >
          Add Controller
        </Button>
      </Card>

      <Modal
        title="Register ESP32 Controller"
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnClose
      >
        <Text type="secondary" className={styles.modalDescription}>
          Register a new ESP32 controller to receive LED commands from BoardSesh.
          You'll receive an API key to configure on the device.
        </Text>
        <Form form={form} layout="vertical" onFinish={handleRegister}>
          <Form.Item
            name="name"
            label="Controller Name (optional)"
          >
            <Input placeholder="e.g., Living Room Board" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="boardName"
            label="Board Type"
            rules={[{ required: true, message: 'Please select a board type' }]}
          >
            <Select
              placeholder="Select board type"
              onChange={handleBoardChange}
              value={selectedBoard}
            >
              <Option value="kilter">Kilter</Option>
              <Option value="tension">Tension</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="layoutId"
            label="Layout"
            rules={[{ required: true, message: 'Please select a layout' }]}
          >
            <Select
              placeholder="Select layout"
              disabled={!selectedBoard}
              onChange={handleLayoutChange}
              value={selectedLayout}
            >
              {layouts.map(({ id, name }) => (
                <Option key={id} value={id}>{name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sizeId"
            label="Size"
            rules={[{ required: true, message: 'Please select a size' }]}
          >
            <Select
              placeholder="Select size"
              disabled={!selectedLayout}
              onChange={handleSizeChange}
              value={selectedSize}
            >
              {sizes.map(({ id, name, description }) => (
                <Option key={id} value={id}>{name} {description}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="setIds"
            label="Hold Sets"
            rules={[{ required: true, message: 'Please select at least one hold set' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select hold sets"
              disabled={!selectedSize}
              onChange={handleSetsChange}
              value={selectedSets}
            >
              {sets.map(({ id, name }) => (
                <Option key={id} value={id}>{name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSaving} block>
            {isSaving ? 'Registering...' : 'Register Controller'}
          </Button>
        </Form>
      </Modal>

      <ApiKeySuccessModal
        isOpen={!!successApiKey}
        apiKey={successApiKey || ''}
        controllerName={successControllerName}
        onClose={handleSuccessClose}
      />
    </>
  );
}

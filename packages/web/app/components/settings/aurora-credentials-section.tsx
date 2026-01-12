'use client';

import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { AuroraCredentialStatus } from '@/app/api/internal/aurora-credentials/route';
import type { UnsyncedCounts } from '@/app/api/internal/aurora-credentials/unsynced/route';
import styles from './aurora-credentials-section.module.css';

const { Text, Title } = Typography;

interface BoardUnsyncedCounts {
  ascents: number;
  climbs: number;
}

interface BoardCredentialCardProps {
  boardType: 'kilter' | 'tension';
  credential: AuroraCredentialStatus | null;
  unsyncedCounts: BoardUnsyncedCounts;
  onAdd: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

function BoardCredentialCard({
  boardType,
  credential,
  unsyncedCounts,
  onAdd,
  onRemove,
  isRemoving,
}: BoardCredentialCardProps) {
  const boardName = boardType.charAt(0).toUpperCase() + boardType.slice(1);
  const totalUnsynced = unsyncedCounts.ascents + unsyncedCounts.climbs;

  const getSyncStatusTag = () => {
    if (!credential) return null;

    switch (credential.syncStatus) {
      case 'active':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Connected
          </Tag>
        );
      case 'error':
        return (
          <Tag icon={<ExclamationCircleOutlined />} color="error">
            Error
          </Tag>
        );
      case 'expired':
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Expired
          </Tag>
        );
      default:
        return (
          <Tag icon={<SyncOutlined spin />} color="processing">
            Syncing
          </Tag>
        );
    }
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!credential) {
    return (
      <Card className={styles.credentialCard}>
        <div className={styles.cardHeader}>
          <Title level={5} style={{ margin: 0 }}>
            {boardName} Board
          </Title>
        </div>
        <Text type="secondary" className={styles.notConnectedText}>
          Not connected. Link your {boardName} account to import your Aurora data.
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} block>
          Link {boardName} Account
        </Button>
      </Card>
    );
  }

  return (
    <Card className={styles.credentialCard}>
      <div className={styles.cardHeader}>
        <Title level={5} style={{ margin: 0 }}>
          {boardName} Board
        </Title>
        {getSyncStatusTag()}
      </div>
      <div className={styles.credentialInfo}>
        <div className={styles.infoRow}>
          <Text type="secondary">Username:</Text>
          <Text strong>{credential.auroraUsername}</Text>
        </div>
        <div className={styles.infoRow}>
          <Text type="secondary">Last synced:</Text>
          <Text>{formatLastSync(credential.lastSyncAt)}</Text>
        </div>
        {credential.syncError && (
          <div className={styles.errorRow}>
            <Text type="danger">{credential.syncError}</Text>
          </div>
        )}
        {totalUnsynced > 0 && (
          <Alert
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            title={`${totalUnsynced} item${totalUnsynced > 1 ? 's' : ''} pending sync`}
            description={
              <Text type="secondary">
                {unsyncedCounts.ascents > 0 && `${unsyncedCounts.ascents} ascent${unsyncedCounts.ascents > 1 ? 's' : ''}`}
                {unsyncedCounts.ascents > 0 && unsyncedCounts.climbs > 0 && ', '}
                {unsyncedCounts.climbs > 0 && `${unsyncedCounts.climbs} climb${unsyncedCounts.climbs > 1 ? 's' : ''}`}
              </Text>
            }
            className={styles.unsyncedAlert}
          />
        )}
      </div>
      <Popconfirm
        title="Remove account link"
        description={`Are you sure you want to unlink your ${boardName} account?`}
        onConfirm={onRemove}
        okText="Yes, unlink"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Button danger icon={<DeleteOutlined />} loading={isRemoving} block>
          Unlink Account
        </Button>
      </Popconfirm>
    </Card>
  );
}

export default function AuroraCredentialsSection() {
  const [credentials, setCredentials] = useState<AuroraCredentialStatus[]>([]);
  const [unsyncedCounts, setUnsyncedCounts] = useState<UnsyncedCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<'kilter' | 'tension'>('kilter');
  const [isSaving, setIsSaving] = useState(false);
  const [removingBoard, setRemovingBoard] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/internal/aurora-credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnsyncedCounts = async () => {
    try {
      const response = await fetch('/api/internal/aurora-credentials/unsynced');
      if (response.ok) {
        const data = await response.json();
        setUnsyncedCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch unsynced counts:', error);
    }
  };

  useEffect(() => {
    fetchCredentials();
    fetchUnsyncedCounts();
  }, []);

  const handleAddClick = (boardType: 'kilter' | 'tension') => {
    setSelectedBoard(boardType);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSaveCredentials = async (values: { username: string; password: string }) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/internal/aurora-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardType: selectedBoard,
          username: values.username,
          password: values.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save credentials');
      }

      message.success(`${selectedBoard.charAt(0).toUpperCase() + selectedBoard.slice(1)} account linked successfully`);
      setIsModalOpen(false);
      form.resetFields();
      fetchCredentials();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to link account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (boardType: 'kilter' | 'tension') => {
    setRemovingBoard(boardType);
    try {
      const response = await fetch('/api/internal/aurora-credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove credentials');
      }

      message.success('Account unlinked successfully');
      fetchCredentials();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to unlink account');
    } finally {
      setRemovingBoard(null);
    }
  };

  const getCredentialForBoard = (boardType: 'kilter' | 'tension') => {
    return credentials.find((c) => c.boardType === boardType) || null;
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
        <Title level={5}>Board Accounts</Title>
        <Text type="secondary" className={styles.sectionDescription}>
          Link your Kilter and Tension board accounts to import your Aurora data to Boardsesh.
          We'll automatically sync your logbook, ascents, and climbs FROM Aurora every 6 hours.
          Data created in Boardsesh stays local and does not sync back to Aurora.
        </Text>

        <Space orientation="vertical" size="middle" className={styles.cardsContainer}>
          <BoardCredentialCard
            boardType="kilter"
            credential={getCredentialForBoard('kilter')}
            unsyncedCounts={unsyncedCounts?.kilter ?? { ascents: 0, climbs: 0 }}
            onAdd={() => handleAddClick('kilter')}
            onRemove={() => handleRemove('kilter')}
            isRemoving={removingBoard === 'kilter'}
          />
          <BoardCredentialCard
            boardType="tension"
            credential={getCredentialForBoard('tension')}
            unsyncedCounts={unsyncedCounts?.tension ?? { ascents: 0, climbs: 0 }}
            onAdd={() => handleAddClick('tension')}
            onRemove={() => handleRemove('tension')}
            isRemoving={removingBoard === 'tension'}
          />
        </Space>
      </Card>

      <Modal
        title={`Link ${selectedBoard.charAt(0).toUpperCase() + selectedBoard.slice(1)} Account`}
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnClose
      >
        <Text type="secondary" className={styles.modalDescription}>
          Enter your {selectedBoard.charAt(0).toUpperCase() + selectedBoard.slice(1)} Board
          username and password to import your Aurora data.
          Your credentials are encrypted and securely stored. Data syncs every 6 hours.
        </Text>
        <Form form={form} layout="vertical" onFinish={handleSaveCredentials}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSaving} block>
            {isSaving ? 'Linking...' : 'Link Account'}
          </Button>
        </Form>
      </Modal>
    </>
  );
}

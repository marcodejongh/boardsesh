'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Space,
  Modal,
  message,
  Spin,
  Tag,
  Popconfirm,
  Alert,
} from 'antd';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import WarningOutlined from '@mui/icons-material/WarningOutlined';
import type { AuroraCredentialStatus } from '@/app/api/internal/aurora-credentials/route';
import type { UnsyncedCounts } from '@/app/api/internal/aurora-credentials/unsynced/route';
import styles from './aurora-credentials-section.module.css';

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
          <Tag icon={<WarningAmberOutlined />} color="error">
            Error
          </Tag>
        );
      case 'expired':
        return (
          <Tag icon={<AccessTimeOutlined />} color="warning">
            Expired
          </Tag>
        );
      default:
        return (
          <Tag icon={<SyncOutlined />} color="processing">
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
        <CardContent>
          <div className={styles.cardHeader}>
            <Typography variant="h5" sx={{ margin: 0 }}>
              {boardName} Board
            </Typography>
          </div>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.notConnectedText}>
            Not connected. Link your {boardName} account to import your Aurora data.
          </Typography>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={onAdd} fullWidth>
            Link {boardName} Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles.credentialCard}>
      <CardContent>
        <div className={styles.cardHeader}>
          <Typography variant="h5" sx={{ margin: 0 }}>
            {boardName} Board
          </Typography>
          {getSyncStatusTag()}
        </div>
        <div className={styles.credentialInfo}>
          <div className={styles.infoRow}>
            <Typography variant="body2" component="span" color="text.secondary">Username:</Typography>
            <Typography variant="body2" component="span" fontWeight={600}>{credential.auroraUsername}</Typography>
          </div>
          <div className={styles.infoRow}>
            <Typography variant="body2" component="span" color="text.secondary">Last synced:</Typography>
            <Typography variant="body2" component="span">{formatLastSync(credential.lastSyncAt)}</Typography>
          </div>
          {credential.syncError && (
            <div className={styles.errorRow}>
              <Typography variant="body2" component="span" color="error">{credential.syncError}</Typography>
            </div>
          )}
          {totalUnsynced > 0 && (
            <Alert
              type="warning"
              icon={<WarningOutlined />}
              showIcon
              title={`${totalUnsynced} item${totalUnsynced > 1 ? 's' : ''} pending sync`}
              description={
                <Typography variant="body2" component="span" color="text.secondary">
                  {unsyncedCounts.ascents > 0 && `${unsyncedCounts.ascents} ascent${unsyncedCounts.ascents > 1 ? 's' : ''}`}
                  {unsyncedCounts.ascents > 0 && unsyncedCounts.climbs > 0 && ', '}
                  {unsyncedCounts.climbs > 0 && `${unsyncedCounts.climbs} climb${unsyncedCounts.climbs > 1 ? 's' : ''}`}
                </Typography>
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
          <Button
            color="error"
            variant="outlined"
            startIcon={isRemoving ? <CircularProgress size={16} /> : <DeleteOutlined />}
            disabled={isRemoving}
            fullWidth
          >
            Unlink Account
          </Button>
        </Popconfirm>
      </CardContent>
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
      await fetchCredentials();
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
      await fetchCredentials();
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
        <CardContent>
          <div className={styles.loadingContainer}>
            <Spin />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5">Board Accounts</Typography>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.sectionDescription}>
            Link your Kilter and Tension board accounts to import your Aurora data to Boardsesh.
            We'll automatically sync your logbook, ascents, and climbs FROM Aurora every 6 hours.
            Data created in Boardsesh stays local and does not sync back to Aurora.
          </Typography>

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
        </CardContent>
      </Card>

      <Modal
        title={`Link ${selectedBoard.charAt(0).toUpperCase() + selectedBoard.slice(1)} Account`}
        open={isModalOpen}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnClose
      >
        <Typography variant="body2" component="span" color="text.secondary" className={styles.modalDescription}>
          Enter your {selectedBoard.charAt(0).toUpperCase() + selectedBoard.slice(1)} Board
          username and password to import your Aurora data.
          Your credentials are encrypted and securely stored. Data syncs every 6 hours.
        </Typography>
        <Form form={form} layout="vertical" onFinish={handleSaveCredentials}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <TextField placeholder="Enter your username" variant="outlined" size="small" fullWidth />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <TextField type="password" placeholder="Enter your password" variant="outlined" size="small" fullWidth />
          </Form.Item>

          <Button
            variant="contained"
            type="submit"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
            fullWidth
          >
            {isSaving ? 'Linking...' : 'Link Account'}
          </Button>
        </Form>
      </Modal>
    </>
  );
}

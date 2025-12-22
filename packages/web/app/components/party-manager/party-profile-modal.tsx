'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, Button, message, Avatar, Space } from 'antd';
import { UserOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { usePartyProfile } from './party-profile-context';

interface PartyProfileModalProps {
  open: boolean;
  onClose: () => void;
  isDaemonMode: boolean;
  daemonUrl?: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const PartyProfileModal: React.FC<PartyProfileModalProps> = ({ open, onClose, isDaemonMode, daemonUrl }) => {
  const { profile, setUsername, uploadAvatar, isLoading } = usePartyProfile();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(profile?.avatarUrl);

  // Initialize form when modal opens or profile changes
  useEffect(() => {
    if (open && profile) {
      form.setFieldsValue({
        username: profile.username,
      });
      setPreviewUrl(profile.avatarUrl);
    }
  }, [open, profile, form]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const beforeUpload = (file: File): boolean => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error('Only JPG, PNG, GIF, and WebP images are allowed');
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      message.error('Image must be smaller than 2MB');
      return false;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Store file for later upload
    setFileList([
      {
        uid: '-1',
        name: file.name,
        status: 'done',
        originFileObj: file as unknown as UploadFile['originFileObj'],
      },
    ]);

    // Prevent automatic upload
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const username = values.username.trim();

      if (!username) {
        message.error('Please enter a username');
        return;
      }

      // Save username first
      await setUsername(username);

      // Upload avatar if there's a new file and we're in daemon mode
      if (isDaemonMode && daemonUrl && fileList.length > 0 && fileList[0].originFileObj) {
        setUploading(true);
        try {
          await uploadAvatar(fileList[0].originFileObj as File, daemonUrl);
          message.success('Profile saved with avatar');
        } catch (error) {
          console.error('Avatar upload failed:', error);
          message.warning('Profile saved but avatar upload failed');
        } finally {
          setUploading(false);
        }
      } else {
        message.success('Profile saved');
      }

      // Reset file list
      setFileList([]);
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      message.error('Failed to save profile');
    }
  };

  const handleRemoveAvatar = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(undefined);
    setFileList([]);
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    fileList: [],
    accept: ALLOWED_TYPES.join(','),
    showUploadList: false,
  };

  const isSaving = isLoading || uploading;

  return (
    <Modal
      title="Party Mode Profile"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={isSaving}>
          Save
        </Button>,
      ]}
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Please enter a username' },
            { max: 30, message: 'Username must be 30 characters or less' },
            { min: 1, message: 'Username is required' },
          ]}
        >
          <Input placeholder="Enter your username" prefix={<UserOutlined />} maxLength={30} />
        </Form.Item>

        {isDaemonMode && daemonUrl && (
          <Form.Item label="Avatar (optional)">
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <Avatar size={80} src={previewUrl} icon={<UserOutlined />} />
              <Space>
                <Upload {...uploadProps}>
                  <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
                    {previewUrl ? 'Change Avatar' : 'Upload Avatar'}
                  </Button>
                </Upload>
                {previewUrl && (
                  <Button onClick={handleRemoveAvatar} disabled={uploading}>
                    Remove
                  </Button>
                )}
              </Space>
              <div style={{ color: '#888', fontSize: 12 }}>JPG, PNG, GIF, or WebP. Max 2MB.</div>
            </Space>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default PartyProfileModal;

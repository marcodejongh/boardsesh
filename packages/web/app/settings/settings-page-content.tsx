'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  Space,
  Typography,
  Divider,
  message,
  Spin,
} from 'antd';
import { UserOutlined, UploadOutlined, LoadingOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import AuroraCredentialsSection from '@/app/components/settings/aurora-credentials-section';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export default function SettingsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Fetch profile on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/internal/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data);
      form.setFieldsValue({
        displayName: data.profile?.displayName || data.name || '',
      });
      setPreviewUrl(data.profile?.avatarUrl || data.image || undefined);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRemoveAvatar = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(undefined);
    setFileList([]);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      let avatarUrl = profile?.profile?.avatarUrl || profile?.image || null;

      // Upload avatar if there's a new file
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('avatar', fileList[0].originFileObj as File);

          const uploadResponse = await fetch('/api/internal/profile/avatar', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            avatarUrl = uploadData.avatarUrl;
            if (uploadData.message) {
              message.info(uploadData.message);
            }
          } else {
            message.warning('Avatar upload is not yet available');
          }
        } catch (error) {
          console.error('Avatar upload failed:', error);
          message.warning('Avatar upload failed');
        } finally {
          setUploading(false);
        }
      }

      // Update profile
      const response = await fetch('/api/internal/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: values.displayName?.trim() || null,
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      message.success('Settings saved successfully');
      setFileList([]);
      // Refresh profile
      await fetchProfile();
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    fileList: [],
    accept: ALLOWED_TYPES.join(','),
    showUploadList: false,
  };

  const isSaving = saving || uploading;

  if (status === 'loading' || loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.back()} />
        <Logo size="sm" showText={false} />
        <Title level={4} style={{ margin: 0, flex: 1 }}>
          Settings
        </Title>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <Card>
          <Title level={5}>Profile</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Customize how you appear on Boardsesh
          </Text>

          <Form form={form} layout="vertical">
            <Form.Item label="Avatar">
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Avatar size={96} src={previewUrl} icon={<UserOutlined />} />
                <Space>
                  <Upload {...uploadProps}>
                    <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={isSaving}>
                      {previewUrl ? 'Change' : 'Upload'}
                    </Button>
                  </Upload>
                  {previewUrl && (
                    <Button onClick={handleRemoveAvatar} disabled={isSaving}>
                      Remove
                    </Button>
                  )}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  JPG, PNG, GIF, or WebP. Max 2MB.
                </Text>
              </Space>
            </Form.Item>

            <Form.Item
              name="displayName"
              label="Display Name"
              rules={[{ max: 100, message: 'Display name must be less than 100 characters' }]}
            >
              <Input placeholder="Enter your display name" prefix={<UserOutlined />} maxLength={100} />
            </Form.Item>

            <Divider />

            <Form.Item label="Email">
              <Input value={profile?.email || session?.user?.email || ''} disabled prefix={<UserOutlined />} />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                Email cannot be changed
              </Text>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Button type="primary" onClick={handleSubmit} loading={isSaving} block>
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Divider />

        <AuroraCredentialsSection />
      </Content>
    </Layout>
  );
}

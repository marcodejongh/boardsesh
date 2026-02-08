'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Form,
  Upload,
  Space,
  Divider,
} from 'antd';
import MuiAvatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import Instagram from '@mui/icons-material/Instagram';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import AuroraCredentialsSection from '@/app/components/settings/aurora-credentials-section';
import ControllersSection from '@/app/components/settings/controllers-section';
import BackButton from '@/app/components/back-button';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { usePartyProfile } from '@/app/components/party-manager/party-profile-context';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
const { Content, Header } = Layout;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Get the backend HTTP URL from the WebSocket URL
 * Converts ws:// to http:// and wss:// to https://
 */
function getBackendHttpUrl(): string | null {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsUrl) return null;

  try {
    const url = new URL(wsUrl);
    // Convert ws/wss to http/https
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    // Remove the /graphql path if present
    url.pathname = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
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
  const { token: authToken } = useWsAuthToken();
  const { refreshProfile: refreshPartyProfile } = usePartyProfile();
  const { showMessage } = useSnackbar();

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
        instagramUrl: data.profile?.instagramUrl || '',
      });
      setPreviewUrl(data.profile?.avatarUrl || data.image || undefined);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      showMessage('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file: File): boolean => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showMessage('Only JPG, PNG, GIF, and WebP images are allowed', 'error');
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showMessage('Image must be smaller than 2MB', 'error');
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
          const backendUrl = getBackendHttpUrl();
          if (!backendUrl) {
            throw new Error('Backend URL not configured');
          }

          if (!authToken) {
            throw new Error('Authentication required for avatar upload');
          }

          if (!profile?.id) {
            throw new Error('User profile not loaded');
          }

          const formData = new FormData();
          formData.append('avatar', fileList[0].originFileObj as File);
          formData.append('userId', profile.id);

          const uploadResponse = await fetch(`${backendUrl}/api/avatars`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            // The backend returns a relative URL, need to make it absolute
            avatarUrl = uploadData.avatarUrl.startsWith('/')
              ? `${backendUrl}${uploadData.avatarUrl}`
              : uploadData.avatarUrl;
          } else {
            const errorData = await uploadResponse.json().catch(() => ({}));
            showMessage(errorData.error || 'Avatar upload failed', 'warning');
          }
        } catch (error) {
          console.error('Avatar upload failed:', error);
          showMessage(error instanceof Error ? error.message : 'Avatar upload failed', 'warning');
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
          instagramUrl: values.instagramUrl?.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      showMessage('Settings saved successfully', 'success');
      setFileList([]);
      // Refresh profile locally and in context (so queue items show updated avatar)
      await fetchProfile();
      await refreshPartyProfile();
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage(error instanceof Error ? error.message : 'Failed to save settings', 'error');
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
      <Layout style={{ minHeight: '100vh', background: 'var(--semantic-background)' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={48} />
        </Content>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--semantic-background)' }}>
      <Header
        style={{
          background: 'var(--semantic-surface)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <BackButton />
        <Logo size="sm" showText={false} />
        <Typography variant="h4" style={{ margin: 0, flex: 1 }}>
          Settings
        </Typography>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <Card>
          <CardContent>
            <Typography variant="h5">Profile</Typography>
            <Typography variant="body2" component="span" color="text.secondary" sx={{ display: 'block', marginBottom: 3 }}>
              Customize how you appear on Boardsesh
            </Typography>

            <Form form={form} layout="vertical">
              <Form.Item label="Avatar">
                <Space orientation="vertical" align="center" style={{ width: '100%' }}>
                  <MuiAvatar sx={{ width: 96, height: 96 }} src={previewUrl ?? undefined}>
                    {!previewUrl && <PersonOutlined />}
                  </MuiAvatar>
                  <Space>
                    <Upload {...uploadProps}>
                      <Button
                        variant="outlined"
                        startIcon={uploading ? <CircularProgress size={16} /> : <UploadOutlined />}
                        disabled={isSaving}
                      >
                        {previewUrl ? 'Change' : 'Upload'}
                      </Button>
                    </Upload>
                    {previewUrl && (
                      <Button variant="outlined" onClick={handleRemoveAvatar} disabled={isSaving}>
                        Remove
                      </Button>
                    )}
                  </Space>
                  <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 12 }}>
                    JPG, PNG, GIF, or WebP. Max 2MB.
                  </Typography>
                </Space>
              </Form.Item>

              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[{ max: 100, message: 'Display name must be less than 100 characters' }]}
              >
                <TextField
                  placeholder="Enter your display name"
                  variant="outlined"
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                  inputProps={{ maxLength: 100 }}
                />
              </Form.Item>

              <Form.Item
                name="instagramUrl"
                label="Instagram Profile"
                rules={[
                  {
                    pattern: /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/,
                    message: 'Please enter a valid Instagram profile URL',
                  },
                ]}
              >
                <TextField
                  placeholder="https://instagram.com/username"
                  variant="outlined"
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Instagram />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Divider />

              <Form.Item label="Email">
                <TextField
                  value={profile?.email || session?.user?.email || ''}
                  disabled
                  variant="outlined"
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 12, marginTop: 0.5, display: 'block' }}>
                  Email cannot be changed
                </Typography>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
                  fullWidth
                >
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </CardContent>
        </Card>

        <Divider />

        <AuroraCredentialsSection />

        <Divider />

        <ControllersSection />
      </Content>
    </Layout>
  );
}

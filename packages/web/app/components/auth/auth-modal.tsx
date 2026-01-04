'use client';

import React from 'react';
import { Modal, Typography, Space, Button } from 'antd';
import { HeartFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
};

export default function AuthModal({
  open,
  onClose,
  title = "Sign in to continue",
  description = "Create an account or sign in to save your favorites and more."
}: AuthModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    onClose();
    // Get the current URL to redirect back after sign-in
    const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
    router.push(`/handler/sign-in?after_auth_return_to=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <HeartFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
          <Text strong style={{ fontSize: 18 }}>{title}</Text>
          <Text type="secondary">{description}</Text>
        </Space>

        <Button
          type="primary"
          block
          size="large"
          onClick={handleSignIn}
        >
          Sign In / Create Account
        </Button>
      </Space>
    </Modal>
  );
}

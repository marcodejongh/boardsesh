'use client';

import React, { useState } from 'react';
import { Modal, Button, Form, Input, message, Tabs, Space, Typography, Alert } from 'antd';
import { InstagramOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import { BoardName } from '@/app/lib/types';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface SubmitBetaModalProps {
  climbUuid: string;
  climbName: string;
  boardName: BoardName;
  grade?: string;
  angle: number;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SubmitBetaModal: React.FC<SubmitBetaModalProps> = ({
  climbUuid,
  climbName,
  boardName,
  grade,
  angle,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Generate share caption for Instagram
  const shareCaption = `Just climbed "${climbName}"${grade ? ` (${grade})` : ''} at ${angle}° on the ${boardName.charAt(0).toUpperCase() + boardName.slice(1)} Board! 🧗\n\nWatch the beta on @boardsesh\n\n#${boardName}board #climbing #bouldering`;

  const handleSubmitUrl = async (values: { instagram_url: string; username?: string }) => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/v1/${boardName}/beta/${climbUuid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: values.instagram_url,
          foreign_username: values.username || undefined,
          angle: angle,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Beta video submitted successfully! It will appear after moderation.');
        form.resetFields();
        onSuccess?.();
        onClose();
      } else {
        message.error(data.error || 'Failed to submit beta video');
      }
    } catch (error) {
      console.error('Error submitting beta video:', error);
      message.error('Failed to submit beta video. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(shareCaption);
    message.success('Caption copied to clipboard!');
  };

  const handleShareToInstagram = () => {
    // Copy caption to clipboard
    navigator.clipboard.writeText(shareCaption);

    // Try to open Instagram app (works on mobile)
    const instagramUrl = 'instagram://';
    const fallbackUrl = 'https://www.instagram.com/';

    // Try to open the app first
    window.location.href = instagramUrl;

    // Fallback to web after a short delay
    setTimeout(() => {
      window.open(fallbackUrl, '_blank');
    }, 500);

    message.info('Caption copied! Paste it when posting your video to Instagram.');
  };

  return (
    <Modal
      title="Share Beta Video"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Tabs
        items={[
          {
            key: 'share',
            label: (
              <span>
                <ShareAltOutlined /> Share to Instagram
              </span>
            ),
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Alert
                  message="How to share your beta"
                  description={
                    <>
                      <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                        <li>Record your send video</li>
                        <li>Click the button below to copy the pre-filled caption</li>
                        <li>Post to Instagram with the caption (including @boardsesh)</li>
                        <li>Come back and submit the link, or we'll find it automatically!</li>
                      </ol>
                    </>
                  }
                  type="info"
                  showIcon
                />

                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Suggested Caption:
                  </Text>
                  <TextArea
                    value={shareCaption}
                    readOnly
                    rows={6}
                    style={{ marginBottom: 12 }}
                  />
                  <Space>
                    <Button icon={<LinkOutlined />} onClick={handleCopyCaption}>
                      Copy Caption
                    </Button>
                    <Button
                      type="primary"
                      icon={<InstagramOutlined />}
                      onClick={handleShareToInstagram}
                    >
                      Open Instagram
                    </Button>
                  </Space>
                </div>

                <Alert
                  message="Your video will appear on this page after moderation"
                  type="success"
                  showIcon
                />
              </Space>
            ),
          },
          {
            key: 'submit',
            label: (
              <span>
                <LinkOutlined /> Submit URL
              </span>
            ),
            children: (
              <Form form={form} layout="vertical" onFinish={handleSubmitUrl}>
                <Alert
                  message="Already posted to Instagram?"
                  description="Paste the link to your Instagram post or reel below."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Form.Item
                  name="instagram_url"
                  label="Instagram Post URL"
                  rules={[
                    { required: true, message: 'Please enter the Instagram URL' },
                    {
                      pattern: /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/,
                      message: 'Please enter a valid Instagram post URL',
                    },
                  ]}
                  extra="Example: https://www.instagram.com/p/ABC123xyz/"
                >
                  <Input
                    prefix={<InstagramOutlined />}
                    placeholder="https://www.instagram.com/p/..."
                  />
                </Form.Item>

                <Form.Item
                  name="username"
                  label="Your Instagram Username (optional)"
                  extra="We'll credit you in the beta video"
                >
                  <Input prefix="@" placeholder="yourusername" />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      Submit Beta Video
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                  </Space>
                </Form.Item>

                <Alert
                  message="Videos are reviewed before appearing on the site"
                  type="info"
                  showIcon
                />
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default SubmitBetaModal;

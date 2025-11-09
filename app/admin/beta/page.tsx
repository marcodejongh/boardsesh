'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, message, Tabs, Badge, Typography, Modal } from 'antd';
import { CheckOutlined, CloseOutlined, InstagramOutlined, EyeOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface BetaVideo {
  board_name: 'kilter' | 'tension';
  climb_uuid: string;
  link: string;
  foreign_username: string | null;
  angle: number | null;
  thumbnail: string | null;
  is_listed: boolean;
  created_at: string;
}

export default function AdminBetaPage() {
  const [loading, setLoading] = useState(false);
  const [pendingVideos, setPendingVideos] = useState<BetaVideo[]>([]);
  const [approvedVideos, setApprovedVideos] = useState<BetaVideo[]>([]);
  const [previewVideo, setPreviewVideo] = useState<BetaVideo | null>(null);

  const fetchVideos = async (status: 'pending' | 'approved') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/beta?status=${status}`);
      const data = await response.json();

      if (status === 'pending') {
        setPendingVideos(data);
      } else {
        setApprovedVideos(data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      message.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos('pending');
    fetchVideos('approved');
  }, []);

  const handleModerate = async (video: BetaVideo, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/beta', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_name: video.board_name,
          climb_uuid: video.climb_uuid,
          link: video.link,
          action,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success(data.message);
        // Refresh both lists
        fetchVideos('pending');
        fetchVideos('approved');
      } else {
        message.error(data.error || 'Failed to moderate video');
      }
    } catch (error) {
      console.error('Error moderating video:', error);
      message.error('Failed to moderate video');
    }
  };

  const handleDelete = async (video: BetaVideo) => {
    Modal.confirm({
      title: 'Delete Beta Video',
      content: 'Are you sure you want to permanently delete this video?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/admin/beta?board_name=${video.board_name}&climb_uuid=${video.climb_uuid}&link=${encodeURIComponent(video.link)}`,
            {
              method: 'DELETE',
            },
          );

          const data = await response.json();

          if (response.ok) {
            message.success(data.message);
            fetchVideos('pending');
            fetchVideos('approved');
          } else {
            message.error(data.error || 'Failed to delete video');
          }
        } catch (error) {
          console.error('Error deleting video:', error);
          message.error('Failed to delete video');
        }
      },
    });
  };

  const getInstagramEmbedUrl = (link: string) => {
    const instagramRegex = /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/;
    const match = link.match(instagramRegex);
    if (match && match[1]) {
      return `https://www.instagram.com/p/${match[1]}/embed`;
    }
    return null;
  };

  const columns = (isPending: boolean) => [
    {
      title: 'Board',
      dataIndex: 'board_name',
      key: 'board_name',
      render: (board: string) => board.charAt(0).toUpperCase() + board.slice(1),
      width: 100,
    },
    {
      title: 'Climb',
      dataIndex: 'climb_uuid',
      key: 'climb_uuid',
      render: (uuid: string, record: BetaVideo) => (
        <a
          href={`/${record.board_name}/view/${uuid}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {uuid.substring(0, 8)}...
        </a>
      ),
      width: 120,
    },
    {
      title: 'Username',
      dataIndex: 'foreign_username',
      key: 'foreign_username',
      render: (username: string | null) => (username ? `@${username}` : '-'),
      width: 150,
    },
    {
      title: 'Angle',
      dataIndex: 'angle',
      key: 'angle',
      render: (angle: number | null) => (angle ? `${angle}°` : '-'),
      width: 80,
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BetaVideo) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewVideo(record)}
            size="small"
          >
            Preview
          </Button>
          <Button
            href={record.link}
            target="_blank"
            rel="noopener noreferrer"
            icon={<InstagramOutlined />}
            size="small"
          >
            View
          </Button>
          {isPending ? (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleModerate(record, 'approve')}
                size="small"
              >
                Approve
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => handleModerate(record, 'reject')}
                size="small"
              >
                Reject
              </Button>
            </>
          ) : (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => handleDelete(record)}
              size="small"
            >
              Remove
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Beta Video Moderation</Title>

      <Tabs
        items={[
          {
            key: 'pending',
            label: (
              <span>
                Pending Review <Badge count={pendingVideos.length} style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <Card>
                <Table
                  dataSource={pendingVideos}
                  columns={columns(true)}
                  loading={loading}
                  rowKey={(record) => `${record.board_name}-${record.climb_uuid}-${record.link}`}
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'approved',
            label: (
              <span>
                Approved <Badge count={approvedVideos.length} style={{ marginLeft: 8 }} />
              </span>
            ),
            children: (
              <Card>
                <Table
                  dataSource={approvedVideos}
                  columns={columns(false)}
                  loading={loading}
                  rowKey={(record) => `${record.board_name}-${record.climb_uuid}-${record.link}`}
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="Preview Beta Video"
        open={!!previewVideo}
        onCancel={() => setPreviewVideo(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewVideo(null)}>
            Close
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              if (previewVideo) {
                handleModerate(previewVideo, 'approve');
                setPreviewVideo(null);
              }
            }}
          >
            Approve
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              if (previewVideo) {
                handleModerate(previewVideo, 'reject');
                setPreviewVideo(null);
              }
            }}
          >
            Reject
          </Button>,
        ]}
        width={800}
      >
        {previewVideo && (
          <div>
            <p>
              <strong>Board:</strong> {previewVideo.board_name.charAt(0).toUpperCase() + previewVideo.board_name.slice(1)}
            </p>
            <p>
              <strong>Username:</strong> {previewVideo.foreign_username ? `@${previewVideo.foreign_username}` : 'Unknown'}
            </p>
            <p>
              <strong>Angle:</strong> {previewVideo.angle ? `${previewVideo.angle}°` : 'Not specified'}
            </p>
            <div style={{ position: 'relative', paddingBottom: '140%', overflow: 'hidden', marginTop: 16 }}>
              <iframe
                src={getInstagramEmbedUrl(previewVideo.link) || ''}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                scrolling="no"
                title="Beta video preview"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

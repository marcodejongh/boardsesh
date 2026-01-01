'use client';

import React, { useState } from 'react';
import { Drawer, Card, Row, Col, Typography, Empty, Modal, Spin } from 'antd';
import { InstagramOutlined, UserOutlined } from '@ant-design/icons';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { BoardName, Climb } from '@/app/lib/types';
import { themeTokens } from '@/app/theme/theme-config';
import { useBetaLinks } from './use-beta-links';

const { Text } = Typography;

interface InstagramDrawerProps {
  open: boolean;
  onClose: () => void;
  climb: Climb | null;
  boardName: BoardName;
}

const getInstagramEmbedUrl = (link: string) => {
  const instagramRegex = /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/;
  const match = link.match(instagramRegex);

  if (match && match[1]) {
    return `https://www.instagram.com/p/${match[1]}/embed`;
  }

  return null;
};

const InstagramDrawer: React.FC<InstagramDrawerProps> = ({ open, onClose, climb, boardName }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BetaLink | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const { betaLinks, loading, error } = useBetaLinks({
    climbUuid: climb?.uuid,
    boardName,
    enabled: open,
  });

  const handleVideoClick = (betaLink: BetaLink) => {
    setSelectedVideo(betaLink);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setIframeKey((prev) => prev + 1);
    setModalVisible(false);
    setSelectedVideo(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    if (betaLinks.length === 0) {
      return <Empty description="No beta videos available for this climb" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <Row gutter={[12, 12]}>
        {betaLinks.map((betaLink, index) => {
          const embedUrl = getInstagramEmbedUrl(betaLink.link);

          return (
            <Col xs={24} sm={12} key={betaLink.link}>
              <Card
                hoverable
                size="small"
                styles={{ body: { padding: 0 } }}
                onClick={() => handleVideoClick(betaLink)}
              >
                {embedUrl ? (
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      overflow: 'hidden',
                      borderRadius: `${themeTokens.borderRadius.md}px ${themeTokens.borderRadius.md}px 0 0`,
                    }}
                  >
                    <iframe
                      src={embedUrl}
                      style={{
                        position: 'absolute',
                        top: '-20%',
                        left: 0,
                        width: '100%',
                        height: '140%',
                        border: 'none',
                        pointerEvents: 'none',
                      }}
                      scrolling="no"
                      title={`Beta video ${index + 1} thumbnail`}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      padding: themeTokens.spacing[8],
                      textAlign: 'center',
                      background: themeTokens.neutral[100],
                    }}
                  >
                    <InstagramOutlined style={{ fontSize: 32, color: themeTokens.neutral[400] }} />
                    <p style={{ margin: `${themeTokens.spacing[2]}px 0 0`, color: themeTokens.neutral[500] }}>
                      Unable to load video
                    </p>
                  </div>
                )}
                <div
                  style={{
                    padding: themeTokens.spacing[3],
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: `1px solid ${themeTokens.neutral[100]}`,
                  }}
                >
                  {betaLink.foreign_username && (
                    <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                      <UserOutlined style={{ marginRight: 4 }} />@{betaLink.foreign_username}
                      {betaLink.angle && <span style={{ marginLeft: 8 }}>{betaLink.angle}°</span>}
                    </Text>
                  )}
                  <a
                    href={betaLink.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: themeTokens.colors.primary,
                      fontSize: themeTokens.typography.fontSize.sm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <InstagramOutlined /> View
                  </a>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: themeTokens.spacing[2] }}>
            <InstagramOutlined style={{ color: themeTokens.colors.primary }} />
            <span>Beta Videos</span>
            {climb?.name && (
              <Text type="secondary" style={{ fontWeight: 'normal', fontSize: themeTokens.typography.fontSize.sm }}>
                - {climb.name}
              </Text>
            )}
          </div>
        }
        placement="bottom"
        height="90%"
        open={open}
        onClose={onClose}
        styles={{
          body: {
            padding: themeTokens.spacing[4],
            overflow: 'auto',
          },
        }}
      >
        {renderContent()}
      </Drawer>

      {modalVisible && (
        <Modal
          title={selectedVideo?.foreign_username ? `Beta by @${selectedVideo.foreign_username}` : 'Beta Video'}
          open={modalVisible}
          onCancel={handleModalClose}
          footer={
            <a
              href={selectedVideo?.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: themeTokens.colors.primary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <InstagramOutlined /> View on Instagram
            </a>
          }
          width="90%"
          style={{ maxWidth: '500px' }}
          centered
          destroyOnClose
        >
          {selectedVideo && (
            <div
              style={{
                position: 'relative',
                paddingBottom: '140%',
                overflow: 'hidden',
                borderRadius: themeTokens.borderRadius.md,
              }}
            >
              <iframe
                key={iframeKey}
                src={getInstagramEmbedUrl(selectedVideo.link) || ''}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                scrolling="no"
                title="Beta video"
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

export default InstagramDrawer;

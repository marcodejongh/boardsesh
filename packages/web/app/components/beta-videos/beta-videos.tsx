'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Empty, Modal } from 'antd';
import { InstagramOutlined, UserOutlined } from '@ant-design/icons';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { themeTokens } from '@/app/theme/theme-config';

const { Title, Text } = Typography;

interface BetaVideosProps {
  betaLinks: BetaLink[];
}

const BetaVideos: React.FC<BetaVideosProps> = ({ betaLinks }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BetaLink | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const getInstagramEmbedUrl = (link: string) => {
    // Extract Instagram post ID from the URL
    const instagramRegex = /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/;
    const match = link.match(instagramRegex);

    if (match && match[1]) {
      // Return the embed URL for the Instagram post
      return `https://www.instagram.com/p/${match[1]}/embed`;
    }

    return null;
  };

  const handleVideoClick = (betaLink: BetaLink) => {
    setSelectedVideo(betaLink);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    // Force iframe to remount by changing key
    setIframeKey((prev) => prev + 1);
    setModalVisible(false);
    setSelectedVideo(null);
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: themeTokens.spacing[4], marginTop: 0 }}>
        Beta Videos
      </Title>

      {betaLinks.length === 0 ? (
        <Empty description="No beta videos available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[12, 12]}>
          {betaLinks.map((betaLink, index) => {
            const embedUrl = getInstagramEmbedUrl(betaLink.link);

            return (
              <Col xs={24} key={index}>
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
      )}

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
    </div>
  );
};

export default BetaVideos;

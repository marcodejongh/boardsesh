'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Empty, Modal } from 'antd';
import { InstagramOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { themeTokens } from '@/app/theme/theme-config';

const { Title } = Typography;

interface ThumbnailProps {
  betaLink: BetaLink;
}

const BetaThumbnail: React.FC<ThumbnailProps> = ({ betaLink }) => {
  const [hasError, setHasError] = useState(false);

  // If no thumbnail or it failed to load, show placeholder
  if (!betaLink.thumbnail || hasError) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${themeTokens.neutral[200]} 0%, ${themeTokens.neutral[100]} 100%)`,
        }}
      >
        <PlayCircleOutlined style={{ fontSize: 28, color: themeTokens.neutral[400] }} />
      </div>
    );
  }

  return (
    <img
      src={betaLink.thumbnail}
      alt={`Beta by ${betaLink.foreign_username || 'unknown'}`}
      onError={() => setHasError(true)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
};

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
        <Row gutter={[8, 8]}>
          {betaLinks.map((betaLink, index) => (
            <Col xs={8} sm={6} md={8} lg={6} key={index}>
              <Card
                hoverable
                size="small"
                styles={{ body: { padding: 0 } }}
                onClick={() => handleVideoClick(betaLink)}
              >
                <div
                  style={{
                    position: 'relative',
                    paddingBottom: '100%',
                    overflow: 'hidden',
                    borderRadius: themeTokens.borderRadius.md,
                    background: themeTokens.neutral[100],
                  }}
                >
                  <BetaThumbnail betaLink={betaLink} />
                  {(betaLink.foreign_username || betaLink.angle) && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[2]}px`,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        color: 'white',
                        fontSize: themeTokens.typography.fontSize.xs,
                      }}
                    >
                      {betaLink.foreign_username && (
                        <span>@{betaLink.foreign_username}</span>
                      )}
                      {betaLink.angle && (
                        <span style={{ marginLeft: betaLink.foreign_username ? 4 : 0 }}>
                          {betaLink.angle}°
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
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

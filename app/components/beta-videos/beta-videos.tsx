'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Empty, Modal } from 'antd';
import { InstagramOutlined, UserOutlined } from '@ant-design/icons';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';

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
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Beta Videos
      </Title>

      {betaLinks.length === 0 ? (
        <Empty description="No beta videos available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[16, 16]}>
          {betaLinks.map((betaLink, index) => {
            const embedUrl = getInstagramEmbedUrl(betaLink.link);

            return (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card
                  hoverable
                  styles={{ body: { padding: 0 } }}
                  onClick={() => handleVideoClick(betaLink)}
                  style={{ cursor: 'pointer' }}
                  cover={
                    embedUrl ? (
                      <div
                        style={{
                          position: 'relative',
                          paddingBottom: '140%',
                          overflow: 'hidden',
                        }}
                      >
                        <iframe
                          src={embedUrl}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            pointerEvents: 'none', // Prevent interaction with thumbnail
                          }}
                          scrolling="no"
                          title={`Beta video ${index + 1} thumbnail`}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', background: '#f0f0f0' }}>
                        <InstagramOutlined style={{ fontSize: 48, color: '#999' }} />
                        <p>Unable to load video</p>
                      </div>
                    )
                  }
                  actions={[
                    <a
                      key="view"
                      href={betaLink.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <InstagramOutlined /> View on Instagram
                    </a>,
                  ]}
                >
                  {betaLink.foreign_username && (
                    <Card.Meta
                      description={
                        <div style={{ padding: '12px' }}>
                          <Text type="secondary">
                            <UserOutlined /> @{betaLink.foreign_username}
                          </Text>
                          {betaLink.angle && (
                            <Text type="secondary" style={{ marginLeft: 12 }}>
                              {betaLink.angle}°
                            </Text>
                          )}
                        </div>
                      }
                    />
                  )}
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
          footer={[
            <a
              key="instagram"
              href={selectedVideo?.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginRight: 8 }}
            >
              <InstagramOutlined /> View on Instagram
            </a>,
          ]}
          width="90%"
          style={{ maxWidth: '800px', maxHeight: '90vh' }}
          centered
          destroyOnClose={true}
        >
          {selectedVideo && (
            <div style={{ position: 'relative', paddingBottom: '140%', overflow: 'hidden' }}>
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

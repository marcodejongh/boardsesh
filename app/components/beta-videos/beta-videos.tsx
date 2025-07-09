'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Empty, Spin, Modal } from 'antd';
import { InstagramOutlined, UserOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { fetchBetaLinks } from '@/app/components/rest-api/api';
import { BoardName } from '@/app/lib/types';

const { Title, Text } = Typography;

interface BetaVideosProps {
  boardName: BoardName;
  climbUuid: string;
}

const BetaVideos: React.FC<BetaVideosProps> = ({ boardName, climbUuid }) => {
  const [betaLinks, setBetaLinks] = useState<BetaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BetaLink | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const loadBetaLinks = async () => {
      try {
        const links = await fetchBetaLinks(boardName, climbUuid);
        console.log('Fetched beta links:', links);
        
        // Ensure links is always an array
        setBetaLinks(Array.isArray(links) ? links : []);
        
        // Add test data if no links found (for development)
        if ((!links || links.length === 0) && process.env.NODE_ENV === 'development') {
          const testLinks = [
            {
              climb_uuid: climbUuid,
              link: 'https://www.instagram.com/p/C1234567890/',
              foreign_username: 'test_user',
              angle: 45,
              thumbnail: null,
              is_listed: true,
              created_at: new Date().toISOString(),
            }
          ];
          setBetaLinks(testLinks);
        }
      } catch (error) {
        console.error('Error loading beta links:', error);
        setBetaLinks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBetaLinks();
  }, [boardName, climbUuid]);

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
    setIframeKey(prev => prev + 1);
    setModalVisible(false);
    setSelectedVideo(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (betaLinks.length === 0) {
    return (
      <Empty
        description="No beta videos available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Beta Videos
      </Title>
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
                    <div style={{ 
                      position: 'relative', 
                      paddingBottom: '140%', 
                      overflow: 'hidden'
                    }}>
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
            </a>
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
                src={getInstagramEmbedUrl(selectedVideo.link)}
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
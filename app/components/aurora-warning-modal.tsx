'use client';

import React, { useState, useEffect } from 'react';
import Modal from 'antd/es/modal';
import Button from 'antd/es/button';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const STORAGE_KEY = 'aurora-warning-dismissed';

const AuroraWarningModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <Modal
      open={isVisible}
      onCancel={handleDismiss}
      footer={[
        <Button key="dismiss" type="primary" onClick={handleDismiss}>
          I understand
        </Button>,
      ]}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          Important Update About BoardSesh
        </div>
      }
      width={600}
    >
      <div style={{ lineHeight: 1.6 }}>
        <p>
          <strong>We hope you've enjoyed using BoardSesh - BoardSesh isn't going away!</strong>
        </p>
        <p>
          However, Aurora is implementing technical measures to block third-party apps from accessing climbing route data. This means BoardSesh will soon lose access to new routes and updates.
        </p>
        <p>
          We've attempted to reach a collaborative solution with Aurora, but they've chosen to restrict access rather than work with the climbing community.
        </p>
        <p>
          <strong>Your climbing data belongs to you.</strong> If you'd like Aurora to reconsider this decision, you can contact them directly:
        </p>
        <p>
          📧 <strong><a href="mailto:peter@auroraclimbing.com">peter@auroraclimbing.com</a></strong>
        </p>
        <p>
          💡 <strong>EU customers:</strong> Don't forget to mention Aurora's obligations under GDPR Article 20 to provide your personal data (including climbing routes and performance data) in a portable format.
        </p>
        <p>
          Join our Discord community to stay updated and discuss alternatives:
        </p>
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Button 
            type="default" 
            href="https://discord.gg/YXA8GsXfQK" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              backgroundColor: '#5865F2', 
              borderColor: '#5865F2', 
              color: 'white' 
            }}
          >
            Join our Discord
          </Button>
        </div>
        <p>
          <em>
            Note: Your expensive climbing wall investment shouldn't be dependent on a single vendor's software decisions. We're exploring hardware solutions to ensure long-term access to your equipment.
          </em>
        </p>
      </div>
    </Modal>
  );
};

export default AuroraWarningModal;
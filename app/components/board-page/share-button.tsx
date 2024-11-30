import React, { useState } from 'react';
import { ShareAltOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Input, Modal, QRCode, Flex, message } from 'antd';
import { usePeerContext } from '../connection-manager/peer-context';
import { usePathname, useSearchParams } from 'next/navigation';

const getShareUrl = (pathname: string, searchParams: URLSearchParams, peerId: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('hostId', peerId);
  return `${window.location.origin}${pathname}?${params.toString()}`;
};

export type ShareButtonProps = {
  peerId: string;
  hostId: string;
  pathname: string;
  search: string;
};
export const ShareBoardButton = () => {
  const { peerId } = usePeerContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  // Add hostId || back at some point
  const shareUrl = getShareUrl(pathname, searchParams, peerId || '');

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        message.success('Share URL copied to clipboard!');
        handleOk();
      })
      .catch(() => {
        message.error('Failed to copy URL.');
      });
  };

  return (
    <>
      <Button type="default" onClick={showModal} icon={<ShareAltOutlined />} />
      <Modal
        title="Share Session"
        style={{ top: 20 }}
        footer={[
          <Button type="primary" key="share-modal-ok" onClick={handleOk}>
            Ok
          </Button>,
        ]}
        open={isModalOpen}
        onOk={handleOk}
      >
        <Flex gap="middle" align="start" vertical>
          <Flex style={{ width: '100%' }} justify="center" align="center">
            <Input
              width="100%"
              value={shareUrl}
              readOnly
              addonAfter={<Button icon={<CopyOutlined />} onClick={copyToClipboard} />}
            />
          </Flex>
          <Flex justify="center" align="center">
            <QRCode value={shareUrl} size={200} bordered={false} />
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

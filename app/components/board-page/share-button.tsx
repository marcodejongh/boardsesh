import React, { useState } from "react";
import { ShareAltOutlined, CopyOutlined } from "@ant-design/icons";
import { Button, Input, Modal, QRCode, Flex, message } from "antd";

const getShareUrl = (pathname, search, peerId) => {
  const params = new URLSearchParams(search);
  params.set("hostId", peerId);

  return `${window.location.origin}${pathname}?${params.toString()}`;
};

export const ShareBoardButton = ({ peerId, hostId, pathname, search }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const shareUrl = getShareUrl(pathname, search, hostId || peerId);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        message.success("Share URL copied to clipboard!");
        handleOk();
      })
      .catch(() => {
        message.error("Failed to copy URL.");
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
          <Flex style={{ width: "100%" }} justify="center" align="center">
            <Input
              width="100%"
              value={shareUrl}
              readOnly
              addonAfter={
                <Button icon={<CopyOutlined />} onClick={copyToClipboard} />
              }
            />
          </Flex>
          <Flex justify="center" align="center">
            {/* Increase QR code size to 200px */}
            <QRCode value={shareUrl} size={200} bordered={false} />
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

import React from 'react';
import Modal from 'antd/es/modal';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCard from './climb-card';

type ClimbPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  climb?: Climb;
  boardDetails: BoardDetails;
};

const ClimbCardModal = ({ isOpen, onClose, climb, boardDetails }: ClimbPreviewModalProps) => {
  return (
    <Modal open={isOpen} onCancel={onClose} footer={null} height="100%" width="100%" bodyStyle={{ padding: 0 }}>
      {/* Large version of the BoardRenderer */}
      <ClimbCard climb={climb} boardDetails={boardDetails} onCoverClick={onClose} />
    </Modal>
  );
};

export default ClimbCardModal;

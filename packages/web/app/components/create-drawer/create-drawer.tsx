'use client';

import React from 'react';
import { Drawer, List } from 'antd';
import { EditOutlined, TagOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BoardDetails, BoardRouteParameters } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';

interface CreateDrawerProps {
  boardDetails: BoardDetails;
  open: boolean;
  onClose: () => void;
}

const CreateDrawer: React.FC<CreateDrawerProps> = ({ boardDetails, open, onClose }) => {
  const params = useParams<BoardRouteParameters>();

  const canBuildSlugUrls = boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names;
  const isMoonboard = boardDetails.board_name === 'moonboard';

  const buildUrl = (suffix: string) => {
    if (canBuildSlugUrls) {
      return `/${boardDetails.board_name}/${generateLayoutSlug(boardDetails.layout_name!)}/${generateSizeSlug(boardDetails.size_name!, boardDetails.size_description)}/${generateSetSlug(boardDetails.set_names!)}/${params.angle}/${suffix}`;
    }
    return `/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/${params.angle}/${suffix}`;
  };

  const items = [
    {
      key: 'create-climb',
      icon: <EditOutlined style={{ fontSize: themeTokens.typography.fontSize.xl, color: themeTokens.colors.primary }} />,
      title: 'Create Climb',
      description: 'Set holds and publish a new climb',
      href: buildUrl('create'),
    },
    ...(!isMoonboard ? [{
      key: 'playlists',
      icon: <TagOutlined style={{ fontSize: themeTokens.typography.fontSize.xl, color: themeTokens.colors.primary }} />,
      title: 'My Playlists',
      description: 'View and manage your playlists',
      href: buildUrl('playlists'),
    }] : []),
  ];

  return (
    <Drawer
      title="Create"
      placement="bottom"
      open={open}
      onClose={onClose}
      height="auto"
      styles={{
        body: { padding: '0 0 env(safe-area-inset-bottom, 0px)' },
      }}
    >
      <List
        dataSource={items}
        renderItem={(item) => (
          <Link href={item.href} onClick={onClose}>
            <List.Item style={{ padding: `${themeTokens.spacing[4]}px ${themeTokens.spacing[6]}px`, cursor: 'pointer' }}>
              <List.Item.Meta
                avatar={item.icon}
                title={item.title}
                description={item.description}
              />
            </List.Item>
          </Link>
        )}
      />
    </Drawer>
  );
};

export default CreateDrawer;

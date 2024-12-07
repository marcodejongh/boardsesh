'use client';
import React, { useState } from 'react';
import { Button, Form, Select, Typography, Input, Divider } from 'antd';
import { useRouter } from 'next/navigation';
import { LayoutRow } from '@/app/lib/data/queries';
import { BoardType } from '@/lib/board-api';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { BoardName } from '@/app/lib/types';

const { Option } = Select;
const { Title, Text } = Typography;

const LayoutSelection = ({ layouts = [], boardName }: { layouts: LayoutRow[], boardName: BoardName }) => {
  const router = useRouter();
  const { login, isAuthenticated } = useBoardProvider();
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onLayoutChange = (value: number) => {
    setSelectedLayout(value);
  };

  const handleNext = () => {
    router.push(`${window.location.pathname}/${selectedLayout}`);
  };

  const handleLogin = async () => {
    if (!username || !password) return;
    
    setIsLoggingIn(true);
    try {
      await login(boardName, username, password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f7f7f7', borderRadius: '8px' }}>
      <Title level={4}>Select a layout</Title>
      <Form layout="vertical">
        <Form.Item 
          label="Layout"
          required
          tooltip="Choose the layout you want to work with"
        >
          <Select onChange={onLayoutChange}>
            {layouts.map(({ id: layoutId, name: layoutName }) => (
              <Option key={layoutId} value={layoutId}>
                {layoutName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>
          <Text type="secondary">Optional Login</Text>
        </Divider>

        {isAuthenticated ? (
          <div style={{ marginBottom: '16px' }}>
            <Text type="success">
              Logged in to {boardName} board
            </Text>
          </div>
        ) : (
          <div>
            <Form.Item
              label="Username"
              tooltip="Your board account username"
            >
              <Input 
                placeholder="Enter username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="Password"
              tooltip="Your board account password"
            >
              <Input.Password 
                placeholder="Enter password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Form.Item>

            <Button 
              type="default" 
              block 
              loading={isLoggingIn}
              onClick={handleLogin}
            >
              {isLoggingIn ? 'Logging in...' : 'Login (Optional)'}
            </Button>
          </div>
        )}

        <Button 
          type="primary" 
          block 
          style={{ marginTop: '16px' }} 
          onClick={handleNext}
          disabled={!selectedLayout}
        >
          Next
        </Button>
      </Form>
    </div>
  );
};

export default LayoutSelection;
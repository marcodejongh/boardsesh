'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Select, Typography, Input, Divider, Card, Row, Col } from 'antd';
import { useRouter } from 'next/navigation';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import { fetchLayouts, fetchSizes, fetchSets } from '../rest-api/api';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';

const { Option } = Select;
const { Title, Text } = Typography;

const ConsolidatedBoardConfig = () => {
  const router = useRouter();
  
  // Selection states
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);
  
  // Data states
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  
  // Loading states
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  
  // Login states - for now just skip login on setup page
  const [showLoginSection, setShowLoginSection] = useState(false);

  // Load layouts when board changes
  useEffect(() => {
    if (!selectedBoard) {
      setLayouts([]);
      setSelectedLayout(undefined);
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }

    const loadLayouts = async () => {
      setIsLoadingLayouts(true);
      try {
        const layoutData = await fetchLayouts(selectedBoard);
        setLayouts(layoutData);
      } catch (error) {
        console.error('Failed to load layouts:', error);
        setLayouts([]);
      } finally {
        setIsLoadingLayouts(false);
      }
    };
    
    loadLayouts();
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard]);

  // Load sizes when layout changes
  useEffect(() => {
    if (!selectedLayout) return;
    
    const loadSizes = async () => {
      setIsLoadingSizes(true);
      try {
        const sizeData = await fetchSizes(selectedBoard, selectedLayout);
        setSizes(sizeData);
      } catch (error) {
        console.error('Failed to load sizes:', error);
        setSizes([]);
      } finally {
        setIsLoadingSizes(false);
      }
    };
    
    loadSizes();
    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard, selectedLayout]);

  // Load sets when size changes
  useEffect(() => {
    if (!selectedLayout || !selectedSize) return;
    
    const loadSets = async () => {
      setIsLoadingSets(true);
      try {
        const setData = await fetchSets(selectedBoard, selectedLayout, selectedSize);
        setSets(setData);
      } catch (error) {
        console.error('Failed to load sets:', error);
        setSets([]);
      } finally {
        setIsLoadingSets(false);
      }
    };
    
    loadSets();
    setSelectedSets([]);
  }, [selectedBoard, selectedLayout, selectedSize]);

  const handleBoardChange = (value: BoardName) => {
    setSelectedBoard(value);
  };

  const handleLayoutChange = (value: number) => {
    setSelectedLayout(value);
  };

  const handleSizeChange = (value: number) => {
    setSelectedSize(value);
  };

  const handleSetsChange = (value: number[]) => {
    setSelectedSets(value);
  };

  // Login will be handled after reaching the main board page

  const handleStartClimbing = () => {
    if (selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0) {
      const setsString = selectedSets.join(',');
      const defaultAngle = 40; // Default angle
      router.push(`/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${defaultAngle}/list`);
    }
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Board Configuration
        </Title>
        
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Board" required>
                <Select value={selectedBoard} onChange={handleBoardChange} placeholder="Please select">
                  {SUPPORTED_BOARDS.map((board_name) => (
                    <Option key={board_name} value={board_name}>
                      {board_name.charAt(0).toUpperCase() + board_name.slice(1)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item label="Layout" required>
                <Select 
                  value={selectedLayout} 
                  onChange={handleLayoutChange}
                  loading={isLoadingLayouts}
                  placeholder="Select layout"
                  disabled={!selectedBoard}
                >
                  {layouts.map(({ id: layoutId, name: layoutName }) => (
                    <Option key={layoutId} value={layoutId}>
                      {layoutName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Size" required>
                <Select 
                  value={selectedSize} 
                  onChange={handleSizeChange}
                  loading={isLoadingSizes}
                  placeholder="Select size"
                  disabled={!selectedLayout}
                >
                  {sizes.map(({ id, name, description }) => (
                    <Option key={id} value={id}>
                      {`${name} ${description}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item label="Hold Sets" required>
                <Select 
                  mode="multiple"
                  value={selectedSets} 
                  onChange={handleSetsChange}
                  loading={isLoadingSets}
                  placeholder="Select hold sets"
                  disabled={!selectedSize}
                >
                  {sets.map(({ id, name }) => (
                    <Option key={id} value={id}>
                      {name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <Text type="secondary">
              You can login after reaching the board page
            </Text>
          </div>

          <Button 
            type="primary" 
            size="large"
            block 
            onClick={handleStartClimbing} 
            disabled={!isFormComplete}
          >
            Start Climbing
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ConsolidatedBoardConfig;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Select, Typography, Input, Divider, Card, Row, Col, Checkbox, Tooltip, Space, Flex, Collapse } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { openDB } from 'idb';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { fetchLayouts, fetchSizes, fetchSets } from '../rest-api/api';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';
import BoardConfigPreview from './board-config-preview';
import BoardConfigLivePreview from './board-config-live-preview';

const { Option } = Select;
const { Title, Text } = Typography;

// IndexedDB configuration
const DB_NAME = 'boardsesh-config';
const DB_VERSION = 1;
const STORE_NAME = 'board-configurations';

// Types for stored configuration
type StoredBoardConfig = {
  name: string;
  board: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  useAsDefault: boolean;
  createdAt: string;
  lastUsed?: string;
};

const ConsolidatedBoardConfig = () => {
  const router = useRouter();
  
  // Selection states
  const [configName, setConfigName] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<number>(40);
  
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
  
  // Additional states
  const [useAsDefault, setUseAsDefault] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [activeCollapsePanels, setActiveCollapsePanels] = useState<string[]>(['saved']);
  const [isStartingClimbing, setIsStartingClimbing] = useState(false);

  // IndexedDB helper functions
  const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        }
      },
    });
  };

  const saveConfiguration = async (config: StoredBoardConfig) => {
    try {
      const db = await initDB();
      await db.put(STORE_NAME, config);
      
      // If this is set as default, clear other defaults
      if (config.useAsDefault) {
        const allConfigs = await db.getAll(STORE_NAME);
        for (const existingConfig of allConfigs) {
          if (existingConfig.name !== config.name && existingConfig.useAsDefault) {
            existingConfig.useAsDefault = false;
            await db.put(STORE_NAME, existingConfig);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const loadDefaultConfiguration = async () => {
    try {
      const db = await initDB();
      const allConfigs = await db.getAll(STORE_NAME);
      return allConfigs.find(config => config.useAsDefault) || null;
    } catch (error) {
      console.error('Failed to load default configuration:', error);
      return null;
    }
  };

  const loadAllConfigurations = async () => {
    try {
      const db = await initDB();
      const allConfigs = await db.getAll(STORE_NAME);
      return allConfigs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to load configurations:', error);
      return [];
    }
  };

  const deleteConfiguration = async (configName: string) => {
    try {
      const db = await initDB();
      await db.delete(STORE_NAME, configName);
      // Reload configurations
      const updatedConfigs = await loadAllConfigurations();
      setSavedConfigurations(updatedConfigs);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
    }
  };

  // Generate suggested name based on current selections
  const generateSuggestedName = useCallback(async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize) {
      setSuggestedName('');
      return;
    }

    try {
      const [layoutsData, sizesData] = await Promise.all([
        fetchLayouts(selectedBoard),
        fetchSizes(selectedBoard, selectedLayout)
      ]);
      
      const layout = layoutsData.find(l => l.id === selectedLayout);
      const size = sizesData.find(s => s.id === selectedSize);
      
      const layoutName = layout?.name || `Layout ${selectedLayout}`;
      const sizeName = size?.name || `Size ${selectedSize}`;
      
      setSuggestedName(`${layoutName} ${sizeName}`);
    } catch (error) {
      console.error('Failed to generate suggested name:', error);
      setSuggestedName(`${selectedBoard} Configuration`);
    }
  }, [selectedBoard, selectedLayout, selectedSize]);

  // Load configurations on mount
  useEffect(() => {
    const loadConfigurations = async () => {
      // Load all saved configurations
      const allConfigs = await loadAllConfigurations();
      setSavedConfigurations(allConfigs);
      
      // Check for default configuration
      const defaultConfig = allConfigs.find(config => config.useAsDefault);
      if (defaultConfig) {
        setConfigName(defaultConfig.name);
        setSelectedBoard(defaultConfig.board);
        setSelectedLayout(defaultConfig.layoutId);
        setSelectedSize(defaultConfig.sizeId);
        setSelectedSets(defaultConfig.setIds);
        setSelectedAngle(defaultConfig.angle || 40);
        setUseAsDefault(defaultConfig.useAsDefault);
        
        // Redirect immediately if there's a default
        const setsString = defaultConfig.setIds.join(',');
        const savedAngle = defaultConfig.angle || 40;
        router.push(`/${defaultConfig.board}/${defaultConfig.layoutId}/${defaultConfig.sizeId}/${setsString}/${savedAngle}/list`);
      }
    };
    
    loadConfigurations();
  }, [router]);

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
    if (!selectedBoard || !selectedLayout) return;
    
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
    if (!selectedBoard || !selectedLayout || !selectedSize) return;
    
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

  // Update suggested name when selections change
  useEffect(() => {
    generateSuggestedName();
  }, [selectedBoard, selectedLayout, selectedSize, generateSuggestedName]);

  const handleFormChange = () => {
    // When form changes, keep saved configurations visible
    if (savedConfigurations.length > 0) {
      setActiveCollapsePanels(['saved']);
    }
  };

  const handleBoardChange = (value: BoardName) => {
    setSelectedBoard(value);
    handleFormChange();
  };

  const handleLayoutChange = (value: number) => {
    setSelectedLayout(value);
    handleFormChange();
  };

  const handleSizeChange = (value: number) => {
    setSelectedSize(value);
    handleFormChange();
  };

  const handleSetsChange = (value: number[]) => {
    setSelectedSets(value);
    handleFormChange();
  };

  const handleAngleChange = (value: number) => {
    setSelectedAngle(value);
    handleFormChange();
  };


  // Login will be handled after reaching the main board page

  const handleStartClimbing = async () => {
    if (selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0) {
      setIsStartingClimbing(true);
      
      try {
        // Generate default name if none provided
        let configurationName = configName.trim();
        if (!configurationName) {
          // Get layout and size names for default name
          try {
            const [layoutsData, sizesData] = await Promise.all([
              fetchLayouts(selectedBoard),
              fetchSizes(selectedBoard, selectedLayout)
            ]);
            
            const layout = layoutsData.find(l => l.id === selectedLayout);
            const size = sizesData.find(s => s.id === selectedSize);
            
            const layoutName = layout?.name || `Layout ${selectedLayout}`;
            const sizeName = size?.name || `Size ${selectedSize}`;
            
            configurationName = `${layoutName} ${sizeName}`;
          } catch (error) {
            console.error('Failed to generate default name:', error);
            configurationName = `${selectedBoard} Configuration`;
          }
        }
        
        // Always save configuration with either user-provided or generated name
        const config: StoredBoardConfig = {
          name: configurationName,
          board: selectedBoard,
          layoutId: selectedLayout,
          sizeId: selectedSize,
          setIds: selectedSets,
          angle: selectedAngle,
          useAsDefault,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
        
        await saveConfiguration(config);
        // Refresh the saved configurations list
        const updatedConfigs = await loadAllConfigurations();
        setSavedConfigurations(updatedConfigs);
        
        const setsString = selectedSets.join(',');
        router.push(`/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${selectedAngle}/list`);
      } catch (error) {
        console.error('Error starting climbing session:', error);
        setIsStartingClimbing(false);
      }
    }
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <Title level={1} style={{ textAlign: 'center', marginBottom: '8px' }}>
          BoardSesh
        </Title>
        <Title level={4} style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Configure your climbing board
        </Title>

        {savedConfigurations.length > 0 && (
          <>
            <Collapse
              activeKey={activeCollapsePanels}
              onChange={(keys) => setActiveCollapsePanels(keys as string[])}
              size="small"
              items={[
                {
                  key: 'saved',
                  label: `Saved Configurations (${savedConfigurations.length})`,
                  children: (
                    <Flex gap="middle" wrap="wrap">
                      {savedConfigurations.map((config) => (
                        <BoardConfigPreview
                          key={config.name}
                          config={config}
                          onDelete={deleteConfiguration}
                        />
                      ))}
                    </Flex>
                  ),
                },
              ]}
            />
            <Divider />
          </>
        )}
        
        <Form layout="vertical">
          <Form.Item label="Configuration Name (Optional)">
            <Input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder={suggestedName || "Enter a name for this configuration"}
              maxLength={50}
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
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
            
            <Col xs={24} sm={12}>
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

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
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
            
            <Col xs={24} sm={12}>
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

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label="Angle" required>
                <Select 
                  value={selectedAngle} 
                  onChange={handleAngleChange}
                  disabled={!selectedBoard}
                >
                  {selectedBoard && ANGLES[selectedBoard].map((angle) => (
                    <Option key={angle} value={angle}>
                      {angle}°
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

          {/* TODO: Improve UX for default board selection
          <Form.Item>
            <Checkbox
              checked={useAsDefault}
              onChange={(e) => setUseAsDefault(e.target.checked)}
              disabled={!isFormComplete}
            >
              Use this board configuration as default
              <Tooltip title="When this option is selected, navigating to BoardSesh will always load this board configuration immediately">
                <InfoCircleOutlined style={{ marginLeft: '4px', color: '#1890ff' }} />
              </Tooltip>
            </Checkbox>
          </Form.Item>
          */}

          <Button 
            type="primary" 
            size="large"
            block 
            onClick={handleStartClimbing} 
            disabled={!isFormComplete || isStartingClimbing}
            loading={isStartingClimbing}
          >
            {isStartingClimbing ? 'Starting...' : 'Start Climbing'}
          </Button>
        </Form>

        {isFormComplete && (
          <>
            <Divider />
            <Collapse
              activeKey={activeCollapsePanels.includes('preview') ? ['preview'] : []}
              onChange={(keys) => {
                const updatedKeys = keys as string[];
                if (updatedKeys.includes('preview')) {
                  setActiveCollapsePanels([...activeCollapsePanels.filter(k => k !== 'preview'), 'preview']);
                } else {
                  setActiveCollapsePanels(activeCollapsePanels.filter(k => k !== 'preview'));
                }
              }}
              size="small"
              items={[
                {
                  key: 'preview',
                  label: 'Preview',
                  children: (
                    <Flex gap="middle" wrap="wrap">
                      <BoardConfigLivePreview
                        boardName={selectedBoard}
                        layoutId={selectedLayout}
                        sizeId={selectedSize}
                        setIds={selectedSets}
                        angle={selectedAngle}
                        configName={configName || suggestedName || 'New Configuration'}
                        useAsDefault={useAsDefault}
                      />
                    </Flex>
                  ),
                },
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ConsolidatedBoardConfig;
/**
 * 
 */

//@ts-ignore
'use client';
import React, { useState, useEffect } from 'react';
import { Form, Select, Input, Button, Typography, Divider, Steps } from 'antd';
import { useRouter } from 'next/navigation';
import { fetchLayouts, fetchSizes, fetchSets } from '../components/rest-api/api';
import { ANGLES } from '@/app/lib/board-data';
import { useBoardProvider } from '../components/board-provider/board-provider-context';
import { LayoutRow, SetRow, SizeRow } from '../lib/data/queries';
import { BoardName } from '../lib/types';

const { Option } = Select;
const { Text } = Typography;

const CombinedWizard = () => {
  const router = useRouter();
  const [form] = Form.useForm();
  const { login, isAuthenticated } = useBoardProvider();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data states
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [angles, setAngles] = useState<number[]>([]);

  // Loading states
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Fetch layouts when board is selected
  useEffect(() => {
    const boardName = form.getFieldValue('boardName');
    if (boardName) {
      setIsLoadingLayouts(true);
      fetchLayouts(boardName)
        .then(setLayouts)
        .finally(() => setIsLoadingLayouts(false));
    }
  }, [form.getFieldValue('boardName')]);

  // Fetch sizes when layout is selected
  useEffect(() => {
    const boardName = form.getFieldValue('boardName');
    const layoutId = form.getFieldValue('layoutId');
    if (boardName && layoutId) {
      setIsLoadingSizes(true);
      fetchSizes(boardName, layoutId)
        .then(setSizes)
        .finally(() => setIsLoadingSizes(false));
    }
  }, [form.getFieldValue('layoutId')]);

  // Fetch sets when size is selected
  useEffect(() => {
    const boardName = form.getFieldValue('boardName');
    const layoutId = form.getFieldValue('layoutId');
    const sizeId = form.getFieldValue('sizeId');
    if (boardName && layoutId && sizeId) {
      setIsLoadingSets(true);
      fetchSets(boardName, layoutId, sizeId)
        .then(setSets)
        .finally(() => setIsLoadingSets(false));
    }
  }, [form.getFieldValue('sizeId')]);

  // Update angles when board is selected
  useEffect(() => {
    const boardName = form.getFieldValue('boardName') as BoardName;
    if (boardName && ANGLES[boardName]) {
      setAngles(ANGLES[boardName]);
    }
  }, [form.getFieldValue('boardName')]);

  const handleLogin = async () => {
    const values = form.getFieldsValue(['username', 'password', 'boardName']);
    if (!values.username || !values.password) return;

    setIsLoggingIn(true);
    try {
      await login(values.boardName, values.username, values.password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };
  //@ts-expect-error
  const handleFinish = async (values) => {
    const { boardName, layoutId, sizeId, setIds, angle } = values;
    const setIdsString = Array.isArray(setIds) ? setIds.join(',') : setIds;
    router.push(`/${boardName}/${layoutId}/${sizeId}/${setIdsString}/${angle}/list`);
  };

  const steps = [
    { title: 'Board Selection', content: 'boardName' },
    { title: 'Layout', content: 'layoutId' },
    { title: 'Size', content: 'sizeId' },
    { title: 'Sets', content: 'setIds' },
    { title: 'Angle', content: 'angle' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <Steps current={currentStep} items={steps} className="mb-8" />

      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ angle: 40 }}>
        <div className={currentStep === 0 ? 'block' : 'hidden'}>
          <Form.Item name="boardName" label="Select Board" required tooltip="Choose your board type">
            <Select placeholder="Select board type">
              <Option value="kilter">Kilter</Option>
              <Option value="tension">Tension</Option>
            </Select>
          </Form.Item>

          {form.getFieldValue('boardName') && (
            <>
              <Divider>
                <Text type="secondary">Optional Login</Text>
              </Divider>

              {isAuthenticated ? (
                <div className="mb-4">
                  <Text type="success">Logged in to {form.getFieldValue('boardName')} board</Text>
                </div>
              ) : (
                <>
                  <Form.Item name="username" label="Username">
                    <Input placeholder="Enter username" />
                  </Form.Item>
                  <Form.Item name="password" label="Password">
                    <Input.Password placeholder="Enter password" />
                  </Form.Item>
                  <Button block loading={isLoggingIn} onClick={handleLogin} className="mb-4">
                    {isLoggingIn ? 'Logging in...' : 'Login (Optional)'}
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        <div className={currentStep === 1 ? 'block' : 'hidden'}>
          <Form.Item name="layoutId" label="Select Layout" required tooltip="Choose your board layout">
            <Select loading={isLoadingLayouts} placeholder="Select layout">
              {layouts.map(({ id, name }) => (
                <Option key={id} value={id}>
                  {name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className={currentStep === 2 ? 'block' : 'hidden'}>
          <Form.Item name="sizeId" label="Select Size" required tooltip="Choose your board size">
            <Select loading={isLoadingSizes} placeholder="Select size">
              {sizes.map(({ id, name, description }) => (
                <Option key={id} value={id}>
                  {`${name} ${description}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className={currentStep === 3 ? 'block' : 'hidden'}>
          <Form.Item name="setIds" label="Select Sets" required tooltip="Choose your hold sets">
            <Select mode="multiple" loading={isLoadingSets} placeholder="Select sets">
              {sets.map(({ id, name }) => (
                <Option key={id} value={id}>
                  {name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className={currentStep === 4 ? 'block' : 'hidden'}>
          <Form.Item name="angle" label="Select Angle" required tooltip="Choose your board angle">
            <Select placeholder="Select angle">
              {angles.map((angle) => (
                <Option key={angle} value={angle}>
                  {angle}°
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className="flex justify-between mt-8">
          <Button onClick={() => setCurrentStep((current) => current - 1)} disabled={currentStep === 0}>
            Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={() => setCurrentStep((current) => current + 1)}>
              Next
            </Button>
          ) : (
            <Button type="primary" htmlType="submit">
              Start Climbing
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

export default CombinedWizard;

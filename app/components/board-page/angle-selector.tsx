'use client';

import React, { useState } from 'react';
import { Button, Drawer, Card, Row, Col } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName } from '@/app/lib/types';

type AngleSelectorProps = {
  boardName: BoardName;
  currentAngle: number;
};

export default function AngleSelector({ boardName, currentAngle }: AngleSelectorProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleAngleChange = (newAngle: number) => {
    track('Angle Changed', {
      angle: newAngle,
    });

    // Replace the current angle in the URL with the new one
    const pathSegments = pathname.split('/');
    const angleIndex = pathSegments.findIndex((segment) => segment === currentAngle.toString());

    if (angleIndex !== -1) {
      pathSegments[angleIndex] = newAngle.toString();
      const newPath = pathSegments.join('/');
      router.push(newPath);
    }

    setIsDrawerOpen(false);
  };

  return (
    <>
      <Button type="default" onClick={() => setIsDrawerOpen(true)} style={{ minWidth: '45px', padding: '4px 8px' }}>
        {currentAngle}°
      </Button>

      <Drawer
        title="Select Angle"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={300}
      >
        <Row gutter={[0, 16]}>
          {ANGLES[boardName].map((angle) => (
            <Col span={24} key={angle}>
              <Card
                hoverable
                onClick={() => handleAngleChange(angle)}
                style={{
                  backgroundColor: angle === currentAngle ? '#e6f7ff' : undefined,
                  borderColor: angle === currentAngle ? '#1890ff' : undefined,
                }}
              >
                <Card.Meta title={`${angle}°`} description="Click to select this angle" />
              </Card>
            </Col>
          ))}
        </Row>
      </Drawer>
    </>
  );
}

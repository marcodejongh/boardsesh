'use client';

import React from 'react';
import { Select } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ANGLES } from '@/app/lib/board-data';
import { BoardName } from '@/app/lib/types';

const { Option } = Select;

type AngleSelectorProps = {
  boardName: BoardName;
  currentAngle: number;
};

export default function AngleSelector({ boardName, currentAngle }: AngleSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleAngleChange = (newAngle: string) => {
    track('Angle Changed', {
      angle: parseInt(newAngle),
    });

    // Replace the current angle in the URL with the new one
    const pathSegments = pathname.split('/');
    const angleIndex = pathSegments.findIndex((segment) => segment === currentAngle.toString());

    if (angleIndex !== -1) {
      pathSegments[angleIndex] = newAngle;
      const newPath = pathSegments.join('/');
      router.push(newPath);
    }
  };

  return (
    <Select
      value={currentAngle.toString()}
      onChange={handleAngleChange}
      style={{ width: 65 }}
      size="small"
      placeholder="Angle"
    >
      {ANGLES[boardName].map((angle) => (
        <Option key={angle} value={angle.toString()}>
          {angle}°
        </Option>
      ))}
    </Select>
  );
}

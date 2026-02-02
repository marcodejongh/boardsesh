import React from 'react';

interface BluetoothIconProps {
  style?: React.CSSProperties;
  className?: string;
}

/**
 * A discrete Bluetooth icon for queue items added via ESP32 controller.
 * Uses a standard Bluetooth symbol in a muted grey color.
 */
const BluetoothIcon: React.FC<BluetoothIconProps> = ({ style, className }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    className={className}
    style={style}
  >
    <path d="M14.88 12L17.24 9.64C17.71 9.17 17.71 8.41 17.24 7.94L12.71 3.41C12.32 3.02 11.69 3.02 11.3 3.41L11 3.71V9.59L7.41 6L6 7.41L10.59 12L6 16.59L7.41 18L11 14.41V20.29L11.3 20.59C11.69 20.98 12.32 20.98 12.71 20.59L17.24 16.06C17.71 15.59 17.71 14.83 17.24 14.36L14.88 12ZM13 5.83L15.17 8L13 10.17V5.83ZM13 18.17V13.83L15.17 16L13 18.17Z" />
  </svg>
);

export default BluetoothIcon;

'use client';

import React from 'react';
import Link from 'next/link';
import { themeTokens } from '@/app/theme/theme-config';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkToHome?: boolean;
};

// 90s vibe colors from Kilter board holds
const KILTER_CYAN = '#00FFFF'; // Hand hold color
const KILTER_PINK = '#FF00FF'; // Finish hold color
const BG_COLOR = '#0a0a14'; // Dark background

const sizes = {
  sm: { icon: 28, fontSize: 14, gap: 6 },
  md: { icon: 34, fontSize: 16, gap: 8 },
  lg: { icon: 44, fontSize: 20, gap: 10 },
};

// Pixel art letter definitions (each letter on a grid)
// B letter - 7 wide x 9 tall pixels
const B_PIXELS = [
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
];

// S letter - 7 wide x 9 tall pixels
const S_PIXELS = [
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
];

const PixelLetter = ({
  pixels,
  startX,
  startY,
  pixelSize,
  fill,
}: {
  pixels: number[][];
  startX: number;
  startY: number;
  pixelSize: number;
  fill: string;
}) => (
  <>
    {pixels.map((row, y) =>
      row.map((pixel, x) =>
        pixel ? (
          <rect
            key={`${x}-${y}`}
            x={startX + x * pixelSize}
            y={startY + y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={fill}
          />
        ) : null,
      ),
    )}
  </>
);

export const Logo = ({ size = 'md', showText = true, linkToHome = true }: LogoProps) => {
  const { icon, fontSize, gap } = sizes[size];
  const pixelSize = 3;
  const shadowOffset = 2;

  const logoContent = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Boardsesh logo"
      >
        {/* Background */}
        <rect x="0" y="0" width="48" height="48" rx="4" fill={BG_COLOR} />

        {/* Pink shadow layer for B */}
        <PixelLetter pixels={B_PIXELS} startX={3 + shadowOffset} startY={6 + shadowOffset} pixelSize={pixelSize} fill={KILTER_PINK} />

        {/* Pink shadow layer for S */}
        <PixelLetter pixels={S_PIXELS} startX={24 + shadowOffset} startY={6 + shadowOffset} pixelSize={pixelSize} fill={KILTER_PINK} />

        {/* Cyan B letter */}
        <PixelLetter pixels={B_PIXELS} startX={3} startY={6} pixelSize={pixelSize} fill={KILTER_CYAN} />

        {/* Cyan S letter */}
        <PixelLetter pixels={S_PIXELS} startX={24} startY={6} pixelSize={pixelSize} fill={KILTER_CYAN} />
      </svg>
      {showText && (
        <span
          style={{
            fontSize,
            fontWeight: themeTokens.typography.fontWeight.bold,
            color: themeTokens.neutral[800],
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Boardsesh
        </span>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default Logo;

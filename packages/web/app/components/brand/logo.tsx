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

const sizes = {
  sm: { icon: 24, fontSize: 14, gap: 6 },
  md: { icon: 28, fontSize: 16, gap: 8 },
  lg: { icon: 36, fontSize: 20, gap: 10 },
};

export const Logo = ({ size = 'md', showText = true, linkToHome = true }: LogoProps) => {
  const { icon, fontSize, gap } = sizes[size];

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
        <defs>
          {/* Gradient for 90s vibe */}
          <linearGradient id="bs-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={KILTER_CYAN} />
            <stop offset="100%" stopColor={KILTER_PINK} />
          </linearGradient>
          {/* Drop shadow filter */}
          <filter id="bs-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background with rounded corners */}
        <rect x="2" y="2" width="44" height="44" rx="8" fill="#1a1a2e" />

        {/* Decorative corner triangles - 90s geometric style */}
        <polygon points="2,10 2,2 10,2" fill={KILTER_CYAN} opacity="0.6" />
        <polygon points="46,38 46,46 38,46" fill={KILTER_PINK} opacity="0.6" />

        {/* Bold "B" letter - clean geometric style */}
        <text
          x="8"
          y="35"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="28"
          fontWeight="900"
          fill={KILTER_CYAN}
          filter="url(#bs-shadow)"
        >
          B
        </text>

        {/* Bold "S" letter - offset for depth effect */}
        <text
          x="24"
          y="35"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="28"
          fontWeight="900"
          fill={KILTER_PINK}
          filter="url(#bs-shadow)"
        >
          S
        </text>

        {/* Accent line - 90s style */}
        <rect x="2" y="42" width="44" height="4" rx="2" fill="url(#bs-gradient)" />
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

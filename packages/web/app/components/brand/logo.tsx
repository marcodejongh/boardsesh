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
  sm: { icon: 28, fontSize: 14, gap: 6 },
  md: { icon: 34, fontSize: 16, gap: 8 },
  lg: { icon: 44, fontSize: 20, gap: 10 },
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
          <linearGradient id="bs-gradient-reverse" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={KILTER_PINK} />
            <stop offset="100%" stopColor={KILTER_CYAN} />
          </linearGradient>
        </defs>

        {/* Background with rounded corners */}
        <rect x="2" y="2" width="44" height="44" rx="6" fill="#0d0d1a" />

        {/* Diagonal stripes background - 90s pattern */}
        <g clipPath="url(#bg-clip)">
          <clipPath id="bg-clip">
            <rect x="2" y="2" width="44" height="44" rx="6" />
          </clipPath>
          <line x1="0" y1="48" x2="16" y2="0" stroke={KILTER_CYAN} strokeWidth="1" opacity="0.15" />
          <line x1="16" y1="48" x2="32" y2="0" stroke={KILTER_PINK} strokeWidth="1" opacity="0.15" />
          <line x1="32" y1="48" x2="48" y2="0" stroke={KILTER_CYAN} strokeWidth="1" opacity="0.15" />
        </g>

        {/* Geometric accent shapes */}
        <polygon points="2,2 14,2 2,14" fill={KILTER_CYAN} opacity="0.8" />
        <polygon points="46,46 34,46 46,34" fill={KILTER_PINK} opacity="0.8" />

        {/* "B" shadow layer - offset for 90s depth effect */}
        <text
          x="10"
          y="36"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize="32"
          fontWeight="900"
          fill="#000"
          opacity="0.5"
        >
          B
        </text>

        {/* "B" main letter */}
        <text
          x="8"
          y="34"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize="32"
          fontWeight="900"
          fill={KILTER_CYAN}
          stroke="#000"
          strokeWidth="1"
        >
          B
        </text>

        {/* "S" shadow layer */}
        <text
          x="26"
          y="38"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize="32"
          fontWeight="900"
          fill="#000"
          opacity="0.5"
        >
          S
        </text>

        {/* "S" main letter - slightly overlapping B */}
        <text
          x="24"
          y="36"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize="32"
          fontWeight="900"
          fill={KILTER_PINK}
          stroke="#000"
          strokeWidth="1"
        >
          S
        </text>

        {/* Bottom accent bar with gradient */}
        <rect x="4" y="42" width="40" height="3" rx="1.5" fill="url(#bs-gradient)" />
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

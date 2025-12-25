'use client';

import React from 'react';
import Link from 'next/link';
import { themeTokens } from '@/app/theme/theme-config';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkToHome?: boolean;
};

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
        {/* Board background with rounded corners */}
        <rect x="2" y="2" width="44" height="44" rx="8" fill={themeTokens.colors.primary} />

        {/* Climbing holds pattern - arranged like a real board */}
        {/* Top row */}
        <circle cx="14" cy="12" r="4" fill={themeTokens.semantic.selected} />
        <circle cx="34" cy="14" r="3.5" fill={themeTokens.semantic.selected} />

        {/* Middle section */}
        <circle cx="24" cy="22" r="5" fill={themeTokens.semantic.selected} />
        <circle cx="10" cy="26" r="3" fill={themeTokens.semantic.selected} />
        <circle cx="38" cy="28" r="3.5" fill={themeTokens.semantic.selected} />

        {/* Bottom row */}
        <circle cx="18" cy="38" r="4" fill={themeTokens.semantic.selected} />
        <circle cx="32" cy="36" r="3" fill={themeTokens.semantic.selected} />
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

'use client';

import { useId } from 'react';

interface HannyangEmblemProps {
  size?: number;
  className?: string;
}

/**
 * 한냥 (Hannyang) 엽전 브라스 코인 엠블럼 — 한냥 Studio · 한냥 AirGuard 패밀리 룩 동일 로고
 */
export function HannyangEmblem({
  size = 34,
  className = '',
}: HannyangEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const rimId = `yeopRim_${uid}`;
  const faceId = `yeopFace_${uid}`;
  const maskId = `yeopMask_${uid}`;

  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={rimId} x1="10%" y1="5%" x2="90%" y2="95%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={faceId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="55%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="36" height="36" fill="#FFFFFF" />
          <rect x="13.2" y="13.2" width="9.6" height="9.6" rx="1.2" fill="#000000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <circle
          cx="18"
          cy="18"
          r="16.5"
          fill={`url(#${rimId})`}
          stroke="#78350F"
          strokeWidth="0.8"
        />
        <circle cx="18" cy="18" r="13.1" fill={`url(#${faceId})`} />
        <rect
          x="16.9"
          y="6.3"
          width="2.2"
          height="4.2"
          rx="1"
          fill={`url(#${rimId})`}
          opacity="0.95"
        />
        <rect
          x="16.9"
          y="25.5"
          width="2.2"
          height="4.2"
          rx="1"
          fill={`url(#${rimId})`}
          opacity="0.95"
        />
        <rect
          x="6.3"
          y="16.9"
          width="4.2"
          height="2.2"
          rx="1"
          fill={`url(#${rimId})`}
          opacity="0.95"
        />
        <rect
          x="25.5"
          y="16.9"
          width="4.2"
          height="2.2"
          rx="1"
          fill={`url(#${rimId})`}
          opacity="0.95"
        />
        <rect
          x="11.4"
          y="11.4"
          width="13.2"
          height="13.2"
          rx="1.8"
          fill={`url(#${rimId})`}
        />
        <path
          d="M7.5 11.5 A13.5 13.5 0 0 1 26.5 9.2"
          fill="none"
          stroke="#FEF9C3"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
    </svg>
  );
}

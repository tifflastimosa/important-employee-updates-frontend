import { useId } from 'react';

export const COMPANY_NAME = 'Summer Retail Group';
export const APP_NAME = 'Important Updates';

/** Summer Retail Group sun mark. */
export function LogoMark({ size = 32 }) {
  // Unique per instance: a hidden duplicate id would make the gradient disappear.
  const gradientId = `srg-sun-${useId().replace(/:/g, '')}`;
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#0e5e6f" />
      <g stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round">
        <path d="M24 7v4M24 37v4M7 24h4M37 24h4M12 12l2.8 2.8M33.2 33.2 36 36M12 36l2.8-2.8M33.2 14.8 36 12" />
      </g>
      <circle cx="24" cy="24" r="8" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function Wordmark({ size = 32, subtitle = true }) {
  return (
    <span className="wordmark">
      <LogoMark size={size} />
      <span className="wordmark-text">
        <span className="wordmark-name">{COMPANY_NAME}</span>
        {subtitle && <span className="wordmark-sub">{APP_NAME}</span>}
      </span>
    </span>
  );
}

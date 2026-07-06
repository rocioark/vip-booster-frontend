'use client'
import { useId } from 'react'

interface LogoProps {
  className?: string
}

export function Logo({ className = 'h-11 w-11' }: LogoProps) {
  const gradientId = `vip-booster-logo-${useId()}`

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a21caf" />
          <stop offset="100%" stopColor="#701a75" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill={`url(#${gradientId})`} />
      <path
        d="M20 9 L22.47 16.6 L30.46 16.6 L24 21.3 L26.47 28.9 L20 24.2 L13.53 28.9 L16 21.3 L9.54 16.6 L17.53 16.6 Z"
        fill="white"
      />
    </svg>
  )
}

import React from 'react';

interface GlowOrbProps {
  /** Color of the orb glow. Default: primary accent */
  color?: string;
  /** Size in pixels. Default: 600 */
  size?: number;
  /** CSS position. Default: centered top */
  position?: 'top-center' | 'top-left' | 'top-right' | 'center' | 'bottom-center';
  /** Opacity. Default: 0.15 */
  intensity?: number;
  /** Enable floating animation */
  animated?: boolean;
  className?: string;
}

const positionStyles: Record<string, string> = {
  'top-center': 'top-[-20%] left-1/2 -translate-x-1/2',
  'top-left': 'top-[-15%] left-[-10%]',
  'top-right': 'top-[-15%] right-[-10%]',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'bottom-center': 'bottom-[-20%] left-1/2 -translate-x-1/2',
};

/**
 * Decorative animated gradient orb for hero backgrounds and section accents.
 * Pure CSS — no JavaScript overhead.
 */
export function GlowOrb({
  color = 'rgba(108, 123, 255, 1)',
  size = 600,
  position = 'top-center',
  intensity = 0.15,
  animated = true,
  className,
}: GlowOrbProps) {
  return (
    <div
      className={[
        'pointer-events-none absolute z-0 rounded-full blur-[120px]',
        animated ? 'anim-float' : '',
        positionStyles[position],
        className,
      ].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: intensity,
      }}
      aria-hidden="true"
    />
  );
}

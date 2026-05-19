'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  formatOptions?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
}

/**
 * Animated counter that smoothly transitions between values.
 * Uses Framer Motion spring for premium feel.
 */
export function AnimatedNumber({
  value,
  className,
  duration = 0.8,
  formatOptions,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const springValue = useSpring(0, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });

  const prevValue = useRef(value);

  useEffect(() => {
    springValue.set(value);
    prevValue.current = value;
  }, [value, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  const formatted = formatOptions
    ? new Intl.NumberFormat('en-US', formatOptions).format(displayValue)
    : displayValue.toLocaleString();

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {prefix}{formatted}{suffix}
    </motion.span>
  );
}

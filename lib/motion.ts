import { type Transition, type Variants } from 'framer-motion';

/* ══════════════════════════════════════════════════════════════
   Centralized Motion System — AdvaitAI
   
   Shared animation configurations for consistent, premium
   motion across the entire application.
   ══════════════════════════════════════════════════════════════ */

// ── Springs ───────────────────────────────────────────────────
export const spring: Transition = {
  type: 'spring',
  damping: 26,
  stiffness: 280,
};

export const springGentle: Transition = {
  type: 'spring',
  damping: 30,
  stiffness: 200,
};

export const springSnappy: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 400,
};

export const springBouncy: Transition = {
  type: 'spring',
  damping: 15,
  stiffness: 350,
};

// ── Durations ─────────────────────────────────────────────────
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
  slowest: 0.8,
} as const;

// ── Easings ───────────────────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  expo: [0.19, 1, 0.22, 1] as [number, number, number, number],
};

// ── Fade Variants ─────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: ease.out } },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: ease.out } },
};

export const fadeUpLarge: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slower, ease: ease.out } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.slower, ease: ease.out } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.slower, ease: ease.out } },
};

export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: ease.out } },
};

// ── Slide Up — for section reveals ────────────────────────────
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slowest, ease: ease.out },
  },
};

// ── Stagger Container ─────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

export const staggerContainerHero: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

// ── Scale Variants ────────────────────────────────────────────
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: duration.fast } },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

// ── Card Hover — interactive elevation ────────────────────────
export const cardHover: Variants = {
  rest: {
    y: 0,
    scale: 1,
    transition: { duration: duration.normal, ease: ease.out },
  },
  hover: {
    y: -4,
    scale: 1.01,
    transition: { duration: duration.normal, ease: ease.out },
  },
};

// ── Glow Pulse — for spotlight/featured elements ──────────────
export const glowPulse: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      ...spring,
      opacity: { duration: duration.slower },
    },
  },
};

// ── Page Transition ───────────────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast },
  },
};

// ── List Item — for staggered list animations ─────────────────
export const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
};

// ── Count Up — number animation ───────────────────────────────
export const countUp: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.slower, ease: ease.spring },
  },
};

// ── Hover helpers (inline use) ────────────────────────────────
export const hoverLift = {
  whileHover: { y: -3, transition: { duration: duration.fast, ease: ease.out } },
};

export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: duration.fast } },
};

export const hoverGlow = {
  whileHover: {
    y: -2,
    boxShadow: '0 0 32px rgba(108, 123, 255, 0.2)',
    transition: { duration: duration.normal },
  },
};

export const tapShrink = {
  whileTap: { scale: 0.97 },
};

// ── View-triggered reveal ─────────────────────────────────────
export const viewReveal = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, margin: '-80px' },
};

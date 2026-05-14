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

// ── Durations ─────────────────────────────────────────────────
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

// ── Easings ───────────────────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
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

// ── Hover helpers (inline use) ────────────────────────────────
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: duration.fast } },
};

export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: duration.fast } },
};

export const tapShrink = {
  whileTap: { scale: 0.98 },
};

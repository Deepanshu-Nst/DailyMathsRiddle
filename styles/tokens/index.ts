/**
 * AdvaitAI Design Tokens
 * Inspired by LeetCode's professional, high-density visual system.
 */

export const colors = {
  bg: '#ffffff',
  bgSubtle: '#f7f8fa',
  surface: '#ffffff',
  surfaceHover: '#f2f3f5',
  
  border: '#eeeeee',
  borderDark: '#e5e5e5',
  
  text: {
    primary: '#262626',
    secondary: '#5c5c5c',
    muted: '#8c8c8c',
    disabled: '#bfbfbf',
  },
  
  primary: {
    DEFAULT: '#ffa116', // LeetCode Orange
    hover: '#ffb84d',
    active: '#e68a00',
    contrast: '#ffffff',
  },
  
  success: {
    DEFAULT: '#2cbb5d',
    bg: '#e6f7ed',
  },
  
  error: {
    DEFAULT: '#ef4743',
    bg: '#fdeeee',
  },
  
  warning: {
    DEFAULT: '#fac02e',
    bg: '#fff9e6',
  },
  
  info: {
    DEFAULT: '#007aff',
    bg: '#e6f2ff',
  }
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  huge: '64px',
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

export const typography = {
  family: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", // Moving away from Bricolage for product feel
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  },
  size: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    huge: '32px',
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  }
};

/**
 * lib/publishing/image-generator.ts
 *
 * Generates a 1080×1080 SVG-based shareable image for each riddle.
 * Zero native dependencies — pure SVG rendered to base64 data URL.
 * Vercel-deployable with no build-time compilation issues.
 *
 * Design zones:
 *   1. Header  — "🧠 Can you solve this?" (small, muted)
 *   2. Hero    — riddle question (large, centered, white)
 *   3. Badge   — difficulty pill (monochrome)
 *   4. Footer  — AdvaitAI branding + CTA
 */

interface ImageInput {
  question: string;
  difficulty: string;
  category: string;
  date: string;
  streak?: number;
  isSolved?: boolean;
}

const DIFF_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy:   { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
  medium: { bg: 'rgba(255, 161, 22, 0.1)', text: '#ffa116', border: 'rgba(255, 161, 22, 0.2)' },
  hard:   { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
};

const DIFF_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** Wrap text into lines of ~maxChars each */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Escape characters that break SVG text */
function escSvg(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateRiddleImage(input: ImageInput): string {
  const { question, difficulty, category, streak = 0, isSolved = false } = input;
  const diff = DIFF_COLORS[difficulty] ?? DIFF_COLORS.medium;
  const diffLabel = DIFF_LABELS[difficulty] ?? 'Medium';

  // Wrap question — 26 chars per line gives ~3 lines for most riddles
  const lines = wrapText(question, 28);
  const lineHeight = 76;
  const fontSize = lines.length > 3 ? 48 : 58;
  const totalTextH = lines.length * lineHeight;
  // Center text block vertically (hero zone: y=220 to y=820)
  const heroMid = 520;
  const textStartY = heroMid - totalTextH / 2 + fontSize * 0.35;

  // Grid dot pattern as background decoration
  const dots: string[] = [];
  for (let x = 60; x <= 1020; x += 60) {
    for (let y = 60; y <= 1020; y += 60) {
      dots.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="rgba(255,255,255,0.03)"/>`);
    }
  }

  // Premium Header
  const headerText = isSolved ? "CHALLENGE SOLVED" : "DAILY INTELLIGENCE RITUAL";
  const headerColor = isSolved ? "#4ade80" : "#a1a1aa";
  const headerIcon = isSolved 
    ? `<path d="M20 6L9 17l-5-5" fill="none" stroke="${headerColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(380, 96)"/>`
    : `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="${headerColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(350, 96)"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#030303;stop-opacity:1"/>
      <stop offset="55%" style="stop-color:#0c0c10;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#111116;stop-opacity:1"/>
    </linearGradient>
    <radialGradient id="heroGlow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" style="stop-color:rgba(244,162,58,0.14);stop-opacity:1"/>
      <stop offset="45%" style="stop-color:rgba(96,165,250,0.06);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0);stop-opacity:1"/>
    </radialGradient>
    <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.14);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.03);stop-opacity:1"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#heroGlow)"/>

  <!-- Subtle radial glow behind text -->
  <circle cx="540" cy="520" r="300" fill="rgba(255,255,255,0.025)" filter="url(#glow)"/>

  <!-- Grid dots -->
  ${dots.join('\n  ')}

  <!-- Border frame -->
  <rect x="40" y="40" width="1000" height="1000" rx="32" ry="32"
    fill="none" stroke="url(#frameGradient)" stroke-width="2"/>

  <!-- ── Zone 1: Header ─────────────────────────────── -->
  ${headerIcon}
  <text x="540" y="116"
    font-family="'Inter', system-ui, sans-serif"
    font-size="24" font-weight="700" letter-spacing="0.12em"
    fill="${headerColor}" text-anchor="middle" text-rendering="optimizeLegibility">
    ${headerText}
  </text>

  <!-- ── Zone 2: Streak Badge (If applicable) ───────── -->
  ${streak > 0 ? `
  <rect x="440" y="150" width="200" height="48" rx="24" fill="rgba(255, 161, 22, 0.1)" stroke="rgba(255, 161, 22, 0.2)" stroke-width="1"/>
  <text x="540" y="181" font-family="'Inter', system-ui, sans-serif" font-size="20" font-weight="700" fill="#ffa116" text-anchor="middle">
    🔥 ${streak} DAY STREAK
  </text>
  ` : ''}

  <!-- ── Zone 3: Hero — Riddle Question ─────────────── -->
  ${lines.map((line, i) => `
  <text x="540" y="${textStartY + i * lineHeight}"
    font-family="'Inter', system-ui, sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="-0.02em"
    fill="#ffffff" text-anchor="middle" text-rendering="optimizeLegibility">
    ${escSvg(line)}
  </text>`).join('')}

  <!-- ── Zone 4: Difficulty + Category badges ─────────── -->
  <rect x="${540 - 160}" y="820" width="320" height="60" rx="30"
    fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
  
  <rect x="${540 - 150}" y="828" width="120" height="44" rx="22"
    fill="${diff.bg}" stroke="${diff.border}" stroke-width="1"/>
  <text x="${540 - 90}" y="856"
    font-family="'Inter', system-ui, sans-serif"
    font-size="18" font-weight="700" letter-spacing="0.08em"
    fill="${diff.text}" text-anchor="middle">
    ${escSvg(diffLabel.toUpperCase())}
  </text>

  <text x="${540 + 50}" y="856"
    font-family="'Inter', system-ui, sans-serif"
    font-size="20" font-weight="500" letter-spacing="0.02em"
    fill="#a1a1aa" text-anchor="middle">
    ${escSvg(category)}
  </text>

  <!-- ── Zone 5: Footer ─────────────────────────────── -->
  <rect x="40" y="940" width="1000" height="100" rx="0" fill="rgba(255,255,255,0.02)"/>
  <rect x="40" y="940" width="1000" height="1" fill="rgba(255,255,255,0.08)"/>

  <!-- AdvaitAI logo box -->
  <rect x="80" y="966" width="48" height="48" rx="12" fill="#ffffff"/>
  <text x="104" y="998"
    font-family="'Inter', system-ui, sans-serif"
    font-size="26" font-weight="800"
    fill="#000000" text-anchor="middle">∑</text>

  <!-- Brand name -->
  <text x="144" y="996"
    font-family="'Inter', system-ui, sans-serif"
    font-size="26" font-weight="800" letter-spacing="-0.02em"
    fill="#ffffff">AdvaitAI</text>

  <!-- CTA -->
  <text x="1000" y="986"
    font-family="'Inter', system-ui, sans-serif"
    font-size="22" font-weight="600"
    fill="#ffffff" text-anchor="end">${isSolved ? "Join the ritual" : "Can you solve it?"}</text>
  <text x="1000" y="1014"
    font-family="'Inter', system-ui, sans-serif"
    font-size="16" font-weight="400"
    fill="#a1a1aa" text-anchor="end">daily-maths-riddle.vercel.app</text>

</svg>`;

  // Encode as base64 data URL
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

/** Also return raw SVG string for testing/debugging */
export function generateRiddleImageSvg(input: ImageInput): string {
  const dataUrl = generateRiddleImage(input);
  const b64 = dataUrl.replace('data:image/svg+xml;base64,', '');
  return Buffer.from(b64, 'base64').toString('utf8');
}

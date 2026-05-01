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
}

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#27272a', text: '#d4d4d8' },
  medium: { bg: '#27272a', text: '#a1a1aa' },
  hard:   { bg: '#27272a', text: '#71717a' },
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
  const { question, difficulty, category, date } = input;
  const diff = DIFF_COLORS[difficulty] ?? DIFF_COLORS.medium;
  const diffLabel = DIFF_LABELS[difficulty] ?? 'Medium';

  // Wrap question — 26 chars per line gives ~3 lines for most riddles
  const lines = wrapText(question, 28);
  const lineHeight = 72;
  const fontSize = lines.length > 3 ? 46 : 54;
  const totalTextH = lines.length * lineHeight;
  // Center text block vertically (hero zone: y=220 to y=820)
  const heroMid = 520;
  const textStartY = heroMid - totalTextH / 2 + fontSize * 0.35;

  // Grid dot pattern as background decoration
  const dots: string[] = [];
  for (let x = 60; x <= 1020; x += 56) {
    for (let y = 60; y <= 1020; y += 56) {
      dots.push(`<circle cx="${x}" cy="${y}" r="1.2" fill="rgba(255,255,255,0.06)"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#09090b;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#111113;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3f3f46;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#27272a;stop-opacity:1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)"/>

  <!-- Grid dots -->
  ${dots.join('\n  ')}

  <!-- Border frame -->
  <rect x="32" y="32" width="1016" height="1016" rx="24" ry="24"
    fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

  <!-- Top accent line -->
  <rect x="32" y="32" width="200" height="3" rx="1.5" fill="url(#accent)"/>

  <!-- ── Zone 1: Header ─────────────────────────────── -->
  <text x="540" y="116"
    font-family="'Bricolage Grotesque', 'Inter', system-ui, sans-serif"
    font-size="28" font-weight="600" letter-spacing="0.08em"
    fill="#3f3f46" text-anchor="middle" text-rendering="optimizeLegibility">
    DAILY INTELLIGENCE RITUAL
  </text>

  <!-- Divider -->
  <rect x="160" y="144" width="760" height="1" fill="rgba(255,255,255,0.06)"/>

  <!-- ── Zone 2: Brain emoji + frame heading ─────────── -->
  <text x="540" y="210"
    font-family="'Inter', system-ui, sans-serif"
    font-size="32" fill="#52525b" text-anchor="middle">
    🧠 Can you solve this?
  </text>

  <!-- ── Zone 3: Hero — Riddle Question ─────────────── -->
  ${lines.map((line, i) => `
  <text x="540" y="${textStartY + i * lineHeight}"
    font-family="'Bricolage Grotesque', 'Inter', system-ui, sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="-0.02em"
    fill="#fafafa" text-anchor="middle" text-rendering="optimizeLegibility">
    ${escSvg(line)}
  </text>`).join('')}

  <!-- ── Zone 4: Difficulty + Category badges ─────────── -->
  <!-- Difficulty pill -->
  <rect x="${540 - 80}" y="830" width="160" height="44" rx="8"
    fill="${diff.bg}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="540" y="858"
    font-family="'Inter', system-ui, sans-serif"
    font-size="20" font-weight="600" letter-spacing="0.06em"
    fill="${diff.text}" text-anchor="middle">
    ${escSvg(diffLabel.toUpperCase())}
  </text>

  <!-- Category tag -->
  <text x="540" y="916"
    font-family="'Inter', system-ui, sans-serif"
    font-size="18" font-weight="400" letter-spacing="0.04em"
    fill="#3f3f46" text-anchor="middle">
    ${escSvg(category)}
  </text>

  <!-- ── Zone 5: Footer ─────────────────────────────── -->
  <rect x="32" y="960" width="1016" height="88" rx="0"
    fill="rgba(0,0,0,0.4)"/>
  <rect x="32" y="960" width="1016" height="1" fill="rgba(255,255,255,0.06)"/>

  <!-- AdvaitAI logo box -->
  <rect x="64" y="980" width="40" height="40" rx="8" fill="#fafafa"/>
  <text x="84" y="1007"
    font-family="'Bricolage Grotesque', 'Inter', system-ui, sans-serif"
    font-size="22" font-weight="800"
    fill="#09090b" text-anchor="middle">∑</text>

  <!-- Brand name -->
  <text x="116" y="1005"
    font-family="'Bricolage Grotesque', 'Inter', system-ui, sans-serif"
    font-size="22" font-weight="700" letter-spacing="-0.02em"
    fill="#fafafa">AdvaitAI</text>

  <!-- Date -->
  <text x="116" y="1025"
    font-family="'Inter', system-ui, sans-serif"
    font-size="14" font-weight="400"
    fill="#52525b">${escSvg(date)}</text>

  <!-- CTA -->
  <text x="1016" y="998"
    font-family="'Inter', system-ui, sans-serif"
    font-size="18" font-weight="500"
    fill="#a1a1aa" text-anchor="end">Drop your answer 👇</text>
  <text x="1016" y="1022"
    font-family="'Inter', system-ui, sans-serif"
    font-size="14" font-weight="400"
    fill="#3f3f46" text-anchor="end">I'll reply with the full solution</text>

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

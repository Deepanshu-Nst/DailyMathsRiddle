import { evaluate } from 'mathjs';

const WORD_MAP: Record<string, string> = {
  zero:'0', one:'1', two:'2', three:'3', four:'4', five:'5',
  six:'6', seven:'7', eight:'8', nine:'9', ten:'10',
  eleven:'11', twelve:'12', thirteen:'13', fourteen:'14', fifteen:'15',
  sixteen:'16', seventeen:'17', eighteen:'18', nineteen:'19', twenty:'20',
  thirty:'30', forty:'40', fifty:'50', sixty:'60', seventy:'70',
  eighty:'80', ninety:'90', hundred:'100',
  'twenty-one':'21','twenty-two':'22','twenty-three':'23','twenty-four':'24',
  'thirty-two':'32','thirty-five':'35','thirty-six':'36',
  'forty-five':'45','fifty-five':'55','fifty-six':'56','sixty-four':'64',
  'seventy-five':'75','eighty-three':'83',
};

function wordToNumber(str: string): string {
  const lower = str.toLowerCase().trim();
  if (WORD_MAP[lower]) return WORD_MAP[lower];
  // Replace word occurrences in longer strings
  let result = lower;
  for (const [word, num] of Object.entries(WORD_MAP)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  }
  return result;
}

function normalizeFraction(str: string): string {
  const fractionRe = /^(-?\d+)\s*\/\s*(-?\d+)$/;
  const match = str.match(fractionRe);
  if (match) {
    const num = parseFloat(match[1]);
    const den = parseFloat(match[2]);
    if (den !== 0) return String(num / den);
  }
  return str;
}

function tryEvaluate(str: string): string {
  try {
    const result = evaluate(str);
    if (typeof result === 'number') return String(Math.round(result * 10000) / 10000);
  } catch {}
  return str;
}

export function normalizeAnswer(raw: string): string {
  let s = raw.trim().toLowerCase();
  // Remove currency symbols
  s = s.replace(/[$€£]/g, '');
  // Remove units like km, cm, m, kg, litres, etc.
  s = s.replace(/\s?(km²?|cm²?|m²?|kg|g|l|litres?|liters?|seconds?|s|hours?|h|degrees?|°)\s?/gi, '');
  // Word to number
  s = wordToNumber(s);
  // Fraction
  s = normalizeFraction(s);
  // Try math eval
  s = tryEvaluate(s);
  return s.trim();
}

export function validateAnswer(userAnswer: string, canonical: string, variants: string[]): boolean {
  const userNorm = normalizeAnswer(userAnswer);
  const canonNorm = normalizeAnswer(canonical);

  // Direct string match
  if (userNorm === canonNorm) return true;

  // Numeric fuzzy match (±0.001)
  const userNum = parseFloat(userNorm);
  const canonNum = parseFloat(canonNorm);
  if (!isNaN(userNum) && !isNaN(canonNum)) {
    if (Math.abs(userNum - canonNum) < 0.01) return true;
  }

  // Check variants
  for (const v of variants) {
    const vNorm = normalizeAnswer(v);
    if (userNorm === vNorm) return true;
    const vNum = parseFloat(vNorm);
    if (!isNaN(userNum) && !isNaN(vNum) && Math.abs(userNum - vNum) < 0.01) return true;
  }

  return false;
}

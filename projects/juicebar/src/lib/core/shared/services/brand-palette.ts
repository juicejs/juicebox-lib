type Rgb = [number, number, number];

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
/** --color-background in dark mode */
const DARK_PAGE: Rgb = [10, 10, 11];

function parseHex(hex: string): Rgb | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim());
  if (!match) {
    return null;
  }
  const digits = match[1].length === 3 ? match[1].replace(/./g, digit => digit + digit) : match[1];
  return [0, 2, 4].map(start => parseInt(digits.slice(start, start + 2), 16)) as Rgb;
}

const toHex = (color: Rgb) => '#' + color.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
const toRgbList = (color: Rgb) => color.map(Math.round).join(', ');

/** `color` moved `amount` (0–1) of the way to `target` */
const mix = (color: Rgb, target: Rgb, amount: number): Rgb =>
  color.map((value, index) => value + (target[index] - value) * amount) as Rgb;

/** WCAG relative luminance */
function luminance(color: Rgb): number {
  const [red, green, blue] = color.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Black, white and greys have no hue to lighten or darken into */
const isNeutral = (color: Rgb) => (Math.max(...color) - Math.min(...color)) / 255 < 0.1;

/** The colour moved toward `target` (black or white) just far enough to reach `ratio` against `background` */
function reach(color: Rgb, background: Rgb, ratio: number, target: Rgb): Rgb {
  for (let amount = 0; amount <= 1; amount += 0.02) {
    const shade = mix(color, target, amount);
    if (contrast(shade, background) >= ratio) {
      return shade;
    }
  }
  return target;
}

function accentTokens(base: Rgb, darker: Rgb, lighter: Rgb, extraLight: Rgb, contrastText: string, activeBackground: Rgb, activeText: Rgb) {
  return {
    '--color-secondary': toHex(base),
    '--color-secondary-dark': toHex(darker),
    '--color-secondary-light': toHex(lighter),
    '--color-secondary-extra-light': toHex(extraLight),
    '--color-secondary-contrast': contrastText,
    '--color-secondary-rgb': toRgbList(base),
    '--color-secondary-dark-rgb': toRgbList(darker),
    '--color-secondary-light-rgb': toRgbList(lighter),
    '--color-secondary-extra-light-rgb': toRgbList(extraLight),
    '--color-secondary-active-bg': toHex(activeBackground),
    '--color-secondary-active-text': toHex(activeText),
  };
}

export type BrandTokens = Record<string, string>;

/**
 * The accent tokens of both themes from one brand colour, like the old juicebox `$primary`.
 * Each theme gets the shade that keeps AA contrast: white text on buttons and accent text on white in light mode,
 * dark text on buttons and accent text on the dark page in dark mode.
 */
export function brandTokens(primary: string): { dark: BrandTokens; light: BrandTokens } | null {
  const brand = parseHex(primary);
  if (!brand) {
    return null;
  }
  // A neutral brand becomes monochrome: near-black in light mode, near-white in dark mode (a mid grey would look disabled)
  const neutral = isNeutral(brand);
  const light = reach(brand, WHITE, neutral ? 12 : 4.5, BLACK);
  const dark = reach(brand, DARK_PAGE, neutral ? 15 : 5, WHITE);
  // Tinted from each theme's shade, so the tint shows on its page (black on the dark page would not)
  const lightActiveBackground = mix(WHITE, light, 0.12);
  const darkActiveBackground = mix(DARK_PAGE, dark, 0.16);
  return {
    light: accentTokens(
      light, mix(light, BLACK, 0.2), mix(light, WHITE, 0.15), mix(brand, WHITE, 0.45), '#ffffff',
      lightActiveBackground, reach(light, lightActiveBackground, 4.5, BLACK),
    ),
    dark: accentTokens(
      dark, mix(dark, BLACK, 0.1), mix(dark, WHITE, 0.15), mix(dark, WHITE, 0.4), '#0a0a0b',
      darkActiveBackground, reach(dark, darkActiveBackground, 4.5, WHITE),
    ),
  };
}

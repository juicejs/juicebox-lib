import {brandTokens} from './brand-palette';

const luminance = (hex: string) => {
  const [red, green, blue] = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
/** The ratio as contrast checkers show it, to two decimals: the palette rounds a shade to hex after reaching its ratio */
const contrast = (first: string, second: string) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return Math.round((lighter + 0.05) / (darker + 0.05) * 100) / 100;
};

/** --color-panel and --color-background of the themes in styles.scss */
const LIGHT_PANEL = '#faf8f5';
const DARK_PAGE = '#0a0a0b';

describe('brandTokens', () => {
  it('a project\'s colour becomes the accent and the action colour of both themes', () => {
    const tokens = brandTokens('#1d4ed8')!;
    // Dark enough as it is: the light theme takes the colour itself
    expect(tokens.light['--color-secondary']).toBe('#1d4ed8');
    expect(tokens.light['--color-action']).toBe('#1d4ed8');
    expect(tokens.light['--color-secondary-rgb']).toBe('29, 78, 216');
    // The dark theme takes a lighter shade of it, with dark text on buttons
    expect(tokens.dark['--color-action']).toBe(tokens.dark['--color-secondary']);
    expect(tokens.dark['--color-secondary-contrast']).toBe('#0a0a0b');
    for (const theme of [tokens.light, tokens.dark]) {
      expect(Object.keys(theme)).toEqual(expect.arrayContaining([
        '--color-action', '--color-action-hover', '--color-secondary', '--color-secondary-dark',
        '--color-secondary-light', '--color-secondary-active-bg', '--color-secondary-active-text',
      ]));
    }
  });

  it.each(['#1d4ed8', '#243088', '#f97316', '#facc15', '#16a34a'])('%s keeps AA contrast in both themes', primary => {
    const {light, dark} = brandTokens(primary)!;
    expect(contrast(light['--color-secondary'], LIGHT_PANEL)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', light['--color-action'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', light['--color-action-hover'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['--color-secondary-active-text'], light['--color-secondary-active-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark['--color-secondary'], DARK_PAGE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#0a0a0b', dark['--color-action'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark['--color-secondary-active-text'], dark['--color-secondary-active-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  it('a light colour is darkened for the light theme: less for buttons than for accent text', () => {
    const {light} = brandTokens('#f97316')!;
    expect(light['--color-secondary']).not.toBe('#f97316');
    expect(luminance(light['--color-action'])).toBeGreaterThanOrEqual(luminance(light['--color-secondary']));
  });

  it('is null for a colour that is not hex, so the default colours stay', () => {
    expect(brandTokens('blue')).toBeNull();
  });
});

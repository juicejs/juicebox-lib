/** What a piece of JSON text is, for its colour; `null` is the plain text between tokens */
export type JsonTokenKind = 'key' | 'string' | 'number' | 'literal' | 'punctuation' | null;

export interface JsonToken {
  text: string;
  kind: JsonTokenKind;
}

/** Strings (a key when a colon follows), numbers, true/false/null and the punctuation */
const TOKEN = /("(?:[^"\\\n]|\\.)*")(?=\s*:)|("(?:[^"\\\n]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

/** The text cut into coloured pieces; joined again they are the text itself, also where it is not valid JSON */
export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) tokens.push({text: text.slice(last, match.index), kind: null});
    const kind: JsonTokenKind = match[1] ? 'key' : match[2] ? 'string' : match[3] ? 'number' : match[4] ? 'literal' : 'punctuation';
    tokens.push({text: match[0], kind});
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({text: text.slice(last), kind: null});
  return tokens;
}

const WHITESPACE = ' \t\n\r';
const ESCAPES = '"\\/bfnrt';
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const HEX4 = /^[0-9a-fA-F]{4}$/;

/**
 * Where the text stops being JSON, as an offset into it, or null when it is JSON. `JSON.parse` says only whether
 * it is; browsers word the place differently, so this walks the text the way the JSON grammar does.
 */
export function jsonErrorOffset(text: string): number | null {
  let at = 0;
  const fail = (): never => {
    throw new JsonSyntaxError(at);
  };
  const skipWhitespace = (): void => {
    while (at < text.length && WHITESPACE.includes(text[at])) at++;
  };
  const string = (): void => {
    at++; // the opening quote
    while (at < text.length) {
      const char = text[at];
      if (char === '"') {
        at++;
        return;
      }
      if (char === '\\') {
        const escaped = text[at + 1];
        if (escaped === 'u') {
          if (!HEX4.test(text.slice(at + 2, at + 6))) fail();
          at += 6;
          continue;
        }
        if (escaped === undefined || !ESCAPES.includes(escaped)) {
          at++;
          fail();
        }
        at += 2;
        continue;
      }
      if (char < ' ') fail();
      at++;
    }
    fail();
  };
  const value = (): void => {
    skipWhitespace();
    const char = text[at];
    if (char === '{') {
      at++;
      skipWhitespace();
      if (text[at] === '}') {
        at++;
        return;
      }
      for (;;) {
        skipWhitespace();
        if (text[at] !== '"') fail();
        string();
        skipWhitespace();
        if (text[at] !== ':') fail();
        at++;
        value();
        skipWhitespace();
        if (text[at] === ',') {
          at++;
          continue;
        }
        if (text[at] === '}') {
          at++;
          return;
        }
        fail();
      }
    }
    if (char === '[') {
      at++;
      skipWhitespace();
      if (text[at] === ']') {
        at++;
        return;
      }
      for (;;) {
        value();
        skipWhitespace();
        if (text[at] === ',') {
          at++;
          continue;
        }
        if (text[at] === ']') {
          at++;
          return;
        }
        fail();
      }
    }
    if (char === '"') return string();
    NUMBER.lastIndex = at;
    if (NUMBER.test(text)) {
      at = NUMBER.lastIndex;
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, at)) {
        at += literal.length;
        return;
      }
    }
    fail();
  };

  try {
    value();
    skipWhitespace();
    if (at < text.length) fail();
    return null;
  } catch (error) {
    // Anything else is nesting too deep to walk: the place is then not known
    return error instanceof JsonSyntaxError ? Math.min(error.offset, text.length) : text.length;
  }
}

class JsonSyntaxError {
  constructor(readonly offset: number) {}
}

/** The 1-based line an offset of the text is on */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset && index < text.length; index++) {
    if (text[index] === '\n') line++;
  }
  return line;
}

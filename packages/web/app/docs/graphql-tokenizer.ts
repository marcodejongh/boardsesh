/**
 * GraphQL Syntax Tokenizer
 *
 * Tokenizes GraphQL schema code for syntax highlighting.
 * Uses a regex-based approach that is safe from XSS as it returns
 * structured data instead of HTML strings.
 */

export type TokenType = 'keyword' | 'type' | 'string' | 'comment' | 'parameter' | 'default';

export type Token = {
  text: string;
  type: TokenType;
};

/**
 * Tokenizes a line of GraphQL code for syntax highlighting.
 * Returns an array of tokens with their types - no HTML injection.
 */
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  const patterns: Array<{ regex: RegExp; type: TokenType }> = [
    // Comments (must be first to capture entire comment)
    { regex: /^(#.*)/, type: 'comment' },
    // Triple-quoted strings (descriptions)
    { regex: /^("""[\s\S]*?""")/, type: 'string' },
    // Double-quoted strings
    { regex: /^("[^"\\]*(?:\\.[^"\\]*)*")/, type: 'string' },
    // Keywords
    {
      regex: /^(type|input|enum|union|scalar|query|mutation|subscription|fragment|on|implements|interface|extend|schema|directive)\b/i,
      type: 'keyword',
    },
    // Types (capitalized words)
    { regex: /^([A-Z][a-zA-Z0-9]*)/, type: 'type' },
    // Booleans and null
    { regex: /^(true|false|null)\b/, type: 'keyword' },
    // Parameter names (word followed by colon)
    { regex: /^(\w+)(?=:)/, type: 'parameter' },
    // Whitespace and punctuation
    { regex: /^(\s+|[{}[\]()!:,=@])/, type: 'default' },
    // Other identifiers
    { regex: /^(\w+)/, type: 'default' },
    // Any other character
    { regex: /^(.)/, type: 'default' },
  ];

  while (remaining.length > 0) {
    let matched = false;

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        tokens.push({ text: match[1], type });
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Safety fallback - should never happen with the catch-all pattern
      tokens.push({ text: remaining[0], type: 'default' });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * Tokenizes multiple lines of GraphQL code.
 */
export function tokenizeGraphQL(code: string): Token[][] {
  return code.split('\n').map(tokenizeLine);
}

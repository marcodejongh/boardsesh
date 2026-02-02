import { describe, it, expect } from 'vitest';
import { tokenizeLine, tokenizeGraphQL, type Token } from '../graphql-tokenizer';

describe('GraphQL Tokenizer', () => {
  describe('tokenizeLine', () => {
    it('tokenizes keywords correctly', () => {
      const tokens = tokenizeLine('type User {');
      expect(tokens).toEqual([
        { text: 'type', type: 'keyword' },
        { text: ' ', type: 'default' },
        { text: 'User', type: 'type' },
        { text: ' ', type: 'default' },
        { text: '{', type: 'default' },
      ]);
    });

    it('tokenizes field definitions with types', () => {
      const tokens = tokenizeLine('  id: ID!');
      expect(tokens).toEqual([
        { text: '  ', type: 'default' },
        { text: 'id', type: 'parameter' },
        { text: ':', type: 'default' },
        { text: ' ', type: 'default' },
        { text: 'ID', type: 'type' },
        { text: '!', type: 'default' },
      ]);
    });

    it('tokenizes comments', () => {
      const tokens = tokenizeLine('# This is a comment');
      expect(tokens).toEqual([{ text: '# This is a comment', type: 'comment' }]);
    });

    it('tokenizes inline comments', () => {
      const tokens = tokenizeLine('name: String # user name');
      expect(tokens).toEqual([
        { text: 'name', type: 'parameter' },
        { text: ':', type: 'default' },
        { text: ' ', type: 'default' },
        { text: 'String', type: 'type' },
        { text: ' ', type: 'default' },
        { text: '# user name', type: 'comment' },
      ]);
    });

    it('tokenizes double-quoted strings', () => {
      const tokens = tokenizeLine('"This is a description"');
      expect(tokens).toEqual([{ text: '"This is a description"', type: 'string' }]);
    });

    it('tokenizes strings with escaped characters', () => {
      const tokens = tokenizeLine('"Hello \\"world\\""');
      expect(tokens).toEqual([{ text: '"Hello \\"world\\""', type: 'string' }]);
    });

    it('tokenizes all GraphQL keywords', () => {
      const keywords = [
        'type',
        'input',
        'enum',
        'union',
        'scalar',
        'query',
        'mutation',
        'subscription',
        'fragment',
        'on',
        'implements',
        'interface',
        'extend',
        'schema',
        'directive',
      ];

      for (const keyword of keywords) {
        const tokens = tokenizeLine(keyword);
        expect(tokens[0]).toEqual({ text: keyword, type: 'keyword' });
      }
    });

    it('tokenizes keywords case-insensitively', () => {
      const tokens = tokenizeLine('TYPE User');
      expect(tokens[0]).toEqual({ text: 'TYPE', type: 'keyword' });
    });

    it('tokenizes boolean and null values', () => {
      const trueTokens = tokenizeLine('enabled: true');
      expect(trueTokens).toContainEqual({ text: 'true', type: 'keyword' });

      const falseTokens = tokenizeLine('disabled: false');
      expect(falseTokens).toContainEqual({ text: 'false', type: 'keyword' });

      const nullTokens = tokenizeLine('value: null');
      expect(nullTokens).toContainEqual({ text: 'null', type: 'keyword' });
    });

    it('tokenizes array types', () => {
      const tokens = tokenizeLine('  items: [Item!]!');
      expect(tokens).toContainEqual({ text: 'Item', type: 'type' });
      expect(tokens).toContainEqual({ text: '[', type: 'default' });
      expect(tokens).toContainEqual({ text: ']', type: 'default' });
    });

    it('tokenizes empty lines', () => {
      const tokens = tokenizeLine('');
      expect(tokens).toEqual([]);
    });

    it('tokenizes whitespace-only lines', () => {
      const tokens = tokenizeLine('    ');
      expect(tokens).toEqual([{ text: '    ', type: 'default' }]);
    });

    it('handles special characters safely (XSS prevention)', () => {
      // These should be tokenized as plain text, not interpreted as HTML
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        "'; DROP TABLE users; --",
      ];

      for (const input of xssAttempts) {
        const tokens = tokenizeLine(input);
        // Verify the tokens reconstruct to the original input
        const reconstructed = tokens.map((t) => t.text).join('');
        expect(reconstructed).toBe(input);
        // Verify no token type is 'html' or similar
        for (const token of tokens) {
          expect(['keyword', 'type', 'string', 'comment', 'parameter', 'default']).toContain(
            token.type
          );
        }
      }
    });

    it('preserves exact input text in tokens', () => {
      const inputs = [
        'type Query { users: [User!]! }',
        '"""Description""" type Mutation {}',
        '# Comment with special chars: <>&"\'',
      ];

      for (const input of inputs) {
        const tokens = tokenizeLine(input);
        const reconstructed = tokens.map((t) => t.text).join('');
        expect(reconstructed).toBe(input);
      }
    });
  });

  describe('tokenizeGraphQL', () => {
    it('tokenizes multiple lines', () => {
      const code = `type User {
  id: ID!
  name: String
}`;
      const result = tokenizeGraphQL(code);

      expect(result).toHaveLength(4);
      expect(result[0]).toContainEqual({ text: 'type', type: 'keyword' });
      expect(result[1]).toContainEqual({ text: 'id', type: 'parameter' });
      expect(result[2]).toContainEqual({ text: 'name', type: 'parameter' });
      expect(result[3]).toContainEqual({ text: '}', type: 'default' });
    });

    it('handles empty input', () => {
      const result = tokenizeGraphQL('');
      expect(result).toEqual([[]]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { gameTitleMatchesSearchQuery, normalizeGameTitleSearchQuery } from './game-search';

describe('normalizeGameTitleSearchQuery', () => {
    it('trims whitespace and lowercases the query', () => {
        expect(normalizeGameTitleSearchQuery('  Code Quest  ')).toBe('code quest');
    });

    it('returns an empty string when query is only whitespace', () => {
        expect(normalizeGameTitleSearchQuery('   ')).toBe('');
    });
});

describe('gameTitleMatchesSearchQuery', () => {
    it('matches titles case-insensitively', () => {
        expect(gameTitleMatchesSearchQuery('Code Quest', 'code')).toBe(true);
        expect(gameTitleMatchesSearchQuery('Code Quest', 'QUEST')).toBe(true);
    });

    it('matches all titles when query is empty', () => {
        expect(gameTitleMatchesSearchQuery('Code Quest', '')).toBe(true);
        expect(gameTitleMatchesSearchQuery('Code Quest', '   ')).toBe(true);
    });

    it('returns false when the title does not include the query', () => {
        expect(gameTitleMatchesSearchQuery('Code Quest', 'engine')).toBe(false);
    });
});

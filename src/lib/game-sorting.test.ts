import { describe, expect, it } from 'vitest';
import { compareGamesBySort, isGameSortOption, sortGames, type SortableGame } from './game-sorting';

function createSortableGame(title: string, starRating: number | null): SortableGame {
    return { title, starRating };
}

describe('isGameSortOption', () => {
    it('returns true for supported options', () => {
        expect(isGameSortOption('title-asc')).toBe(true);
        expect(isGameSortOption('title-desc')).toBe(true);
        expect(isGameSortOption('rating-desc')).toBe(true);
    });

    it('returns false for unsupported options', () => {
        expect(isGameSortOption('rating-asc')).toBe(false);
        expect(isGameSortOption('newest')).toBe(false);
    });
});

describe('compareGamesBySort', () => {
    it('orders by title ascending', () => {
        const left = createSortableGame('Alpha', 4.5);
        const right = createSortableGame('Beta', 4.5);
        expect(compareGamesBySort(left, right, 'title-asc')).toBeLessThan(0);
        expect(compareGamesBySort(right, left, 'title-asc')).toBeGreaterThan(0);
    });

    it('orders by title descending', () => {
        const left = createSortableGame('Alpha', 4.5);
        const right = createSortableGame('Beta', 4.5);
        expect(compareGamesBySort(left, right, 'title-desc')).toBeGreaterThan(0);
        expect(compareGamesBySort(right, left, 'title-desc')).toBeLessThan(0);
    });

    it('orders by rating descending and puts unrated games last', () => {
        const higher = createSortableGame('Alpha', 4.8);
        const lower = createSortableGame('Beta', 4.2);
        const unrated = createSortableGame('Gamma', null);

        expect(compareGamesBySort(higher, lower, 'rating-desc')).toBeLessThan(0);
        expect(compareGamesBySort(lower, higher, 'rating-desc')).toBeGreaterThan(0);
        expect(compareGamesBySort(higher, unrated, 'rating-desc')).toBeLessThan(0);
        expect(compareGamesBySort(unrated, higher, 'rating-desc')).toBeGreaterThan(0);
    });

    it('uses title as a deterministic tie-breaker when rating values match', () => {
        const left = createSortableGame('Alpha', 4.4);
        const right = createSortableGame('Beta', 4.4);
        expect(compareGamesBySort(left, right, 'rating-desc')).toBeLessThan(0);
    });
});

describe('sortGames', () => {
    const sourceGames: SortableGame[] = [
        createSortableGame('Delta', null),
        createSortableGame('Alpha', 4.2),
        createSortableGame('Charlie', 4.9),
        createSortableGame('Bravo', 4.2),
    ];

    it('returns a new sorted array without mutating the original input', () => {
        const sorted = sortGames(sourceGames, 'title-asc');
        expect(sorted).not.toBe(sourceGames);
        expect(sourceGames.map((game) => game.title)).toEqual(['Delta', 'Alpha', 'Charlie', 'Bravo']);
    });

    it('sorts by title descending', () => {
        const sorted = sortGames(sourceGames, 'title-desc');
        expect(sorted.map((game) => game.title)).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha']);
    });

    it('sorts by rating descending and keeps unrated games at the end', () => {
        const sorted = sortGames(sourceGames, 'rating-desc');
        expect(sorted.map((game) => `${game.title}:${game.starRating ?? 'null'}`)).toEqual([
            'Charlie:4.9',
            'Alpha:4.2',
            'Bravo:4.2',
            'Delta:null',
        ]);
    });
});

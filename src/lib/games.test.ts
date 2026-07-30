import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getGamesByFilters,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

type FilterFixtures = {
    strategyCategoryId: number;
    puzzleCategoryId: number;
    pixelPublisherId: number;
    binaryPublisherId: number;
};

async function seedFilterFixtures(db: Database): Promise<FilterFixtures> {
    const [strategyCategory] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'category' })
        .returning({ id: categories.id });
    const [puzzleCategory] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'category' })
        .returning({ id: categories.id });

    const [pixelPublisher] = await db
        .insert(publishers)
        .values({ name: 'Pixel Forge', description: 'publisher' })
        .returning({ id: publishers.id });
    const [binaryPublisher] = await db
        .insert(publishers)
        .values({ name: 'Binary Barn', description: 'publisher' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Architect',
            description: 'desc',
            starRating: 4.7,
            categoryId: strategyCategory.id,
            publisherId: pixelPublisher.id,
        },
        {
            title: 'Beta Builder',
            description: 'desc',
            starRating: 4.1,
            categoryId: strategyCategory.id,
            publisherId: binaryPublisher.id,
        },
        {
            title: 'Delta Decoder',
            description: 'desc',
            starRating: 4.5,
            categoryId: puzzleCategory.id,
            publisherId: binaryPublisher.id,
        },
        {
            title: 'Gamma Grid',
            description: 'desc',
            starRating: 4.2,
            categoryId: puzzleCategory.id,
            publisherId: pixelPublisher.id,
        },
    ]);

    return {
        strategyCategoryId: strategyCategory.id,
        puzzleCategoryId: puzzleCategory.id,
        pixelPublisherId: pixelPublisher.id,
        binaryPublisherId: binaryPublisher.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by a single category id', async () => {
        const fixtures = await seedFilterFixtures(db);
        const filtered = await getGamesByFilters(db, { categoryIds: [fixtures.strategyCategoryId] });
        expect(filtered.map((game) => game.title)).toEqual(['Alpha Architect', 'Beta Builder']);
    });

    it('filters games by multiple category ids', async () => {
        const fixtures = await seedFilterFixtures(db);
        const filtered = await getGamesByFilters(db, {
            categoryIds: [fixtures.strategyCategoryId, fixtures.puzzleCategoryId],
        });
        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Architect',
            'Beta Builder',
            'Delta Decoder',
            'Gamma Grid',
        ]);
    });

    it('filters games by a single publisher id', async () => {
        const fixtures = await seedFilterFixtures(db);
        const filtered = await getGamesByFilters(db, { publisherIds: [fixtures.pixelPublisherId] });
        expect(filtered.map((game) => game.title)).toEqual(['Alpha Architect', 'Gamma Grid']);
    });

    it('combines category and publisher filters', async () => {
        const fixtures = await seedFilterFixtures(db);
        const filtered = await getGamesByFilters(db, {
            categoryIds: [fixtures.puzzleCategoryId],
            publisherIds: [fixtures.binaryPublisherId],
        });
        expect(filtered.map((game) => game.title)).toEqual(['Delta Decoder']);
    });

    it('ignores empty filters and returns all games ordered by title', async () => {
        await seedFilterFixtures(db);
        const filtered = await getGamesByFilters(db, { categoryIds: [], publisherIds: [] });
        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Architect',
            'Beta Builder',
            'Delta Decoder',
            'Gamma Grid',
        ]);
    });
});

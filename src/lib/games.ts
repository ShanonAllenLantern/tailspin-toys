import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

/**
 * Defines the optional category and publisher filters used when querying games.
 */
export interface GameFilters {
    categoryIds?: readonly number[];
    publisherIds?: readonly number[];
}

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

function normalizeFilterIds(ids: readonly number[] | undefined): number[] {
    if (!ids || ids.length === 0) {
        return [];
    }

    const parsedIds = ids
        .map((id) => Number.isInteger(id) ? id : null)
        .filter((id): id is number => id !== null && id > 0);

    return [...new Set(parsedIds)];
}

/**
 * Returns all games ordered alphabetically by title with publisher and category populated.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @returns A promise resolving to every game ordered by title.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Returns all games that match the requested category and publisher filters.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @param filters - Optional category and publisher filters. Empty arrays are ignored.
 * @returns A promise resolving to matching games ordered by title.
 */
export async function getGamesByFilters(db: Database, filters: GameFilters): Promise<Game[]> {
    const categoryIds = normalizeFilterIds(filters.categoryIds);
    const publisherIds = normalizeFilterIds(filters.publisherIds);

    const conditions = [];
    if (categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds.length > 0) {
        conditions.push(inArray(games.publisherId, publisherIds));
    }

    const query = baseGamesQuery(db);
    const rows = conditions.length === 0
        ? await query.orderBy(asc(games.title))
        : await query.where(and(...conditions)).orderBy(asc(games.title));

    return rows.map(mapGame);
}

/**
 * Returns all game ids ordered alphabetically by title.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @returns A promise resolving to ordered game ids.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Returns one game by id with publisher and category populated.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @param id - The numeric game id.
 * @returns A promise resolving to the matching game, or null when no game exists.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const rows = await baseGamesQuery(db).where(eq(games.id, id)).limit(1);
    return rows.length > 0 ? mapGame(rows[0]) : null;
}

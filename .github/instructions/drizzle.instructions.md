---
description: 'Drizzle ORM + libSQL data layer patterns for the Astro app'
applyTo: 'db/**/*.ts,src/lib/*.ts'
---

# Drizzle ORM + libSQL Instructions

The app's data lives in a local SQLite database accessed through **Drizzle ORM** over a **libSQL** client (`@libsql/client`). It is consumed at **build time** from Astro page frontmatter — there is no runtime API server. Schema changes are managed with **drizzle-kit** migrations.

## Layout

- `db/schema.ts` — Drizzle table definitions (`publishers`, `categories`, `games`) and inferred row types. The single source of truth for the schema.
- `db/transforms.ts` — **pure** functions (CSV parsing, description building, de-duplication, deterministic `ratingFromTitle`). No DB access — easy to unit test.
- `db/seed.ts` — idempotent seeding from `db/games.csv` using the transforms.
- `db/migrate.ts` — applies generated migrations.
- `db/migrations/` — generated SQL migrations (do not hand-edit).
- `db/test-helpers.ts` — `createTestDatabase()` returns a migrated in-memory libSQL db for tests.
- `src/lib/db.ts` — `createDatabase(url)` / `getDatabase()` build the Drizzle client from `DATABASE_URL` (defaults to a local file under `.data/`).
- `src/lib/games.ts` — typed, **injectable-db** data-access helpers used by pages and tests.

## Schema Conventions

- Use `sqliteTable` with explicit column names (`text`, `integer`, `real`).
- Primary keys: `integer('id').primaryKey({ autoIncrement: true })`.
- Mark required columns `.notNull()`; nullable columns (e.g. `starRating`) are left nullable.
- Foreign keys use `.references(() => other.id)`.
- Export inferred types (`typeof table.$inferSelect`) and build app-facing types from them — don't redeclare row shapes by hand.

## Migrations Workflow

1. Edit `schema.ts`.
2. Generate a migration: `npm run db:generate` (drizzle-kit).
3. Apply + seed locally: `npm run db:setup` (`db:migrate` + `db:seed`).
4. Commit both the schema change **and** the generated migration in `db/migrations/`.

> [!IMPORTANT]
> The database must be migrated and seeded **before** `astro build`. The `prebuild`/`predev` npm scripts run `db:setup` automatically; CI relies on this ordering.

## Data-Access Helpers (injectable db)

Helpers take the `db` instance as their first argument so they work both with the real client (in pages) and an in-memory client (in tests):

```ts
import { asc, count, eq } from 'drizzle-orm';
import type { Database } from './db';
import { games } from '../../db/schema';

export async function getAllGameIds(db: Database): Promise<number[]> {
  const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
  return rows.map((r) => r.id);
}
```

- Always `order by` a stable column (title) so static builds are deterministic.
- Map raw rows to the app-facing `Game`/`Publisher`/`Category` types in one place; don't leak Drizzle row shapes into components.
- Keep ordering/lookup logic in `games.ts`, not in pages.

## Determinism

Seed-derived values must be reproducible across builds. Derive star ratings from a stable hash of the title (`ratingFromTitle`) — **never** `Math.random()`.

## Comments & Documentation

Follow the project comment philosophy — see [`comments.instructions.md`](comments.instructions.md) for the full conventions.

Key requirements for this layer:

- Every **exported function** in `db/` and `src/lib/` must have a TSDoc comment with a purpose sentence, a `@param` tag for each argument (including `db`), and a `@returns` tag.
- Always document the `db` parameter explicitly so the injectable testing pattern is self-evident to readers.
- Comment *why* — explain non-obvious constraints (e.g. why a value must be deterministic, or why a particular query shape is used) rather than restating what the code does.

Example:

```ts
/**
 * Returns the game with the given id, with its publisher and category populated.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @param id - The numeric primary key of the game to retrieve.
 * @returns The matching Game object, or null if no game with that id exists.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> { ... }
```

## Testing

Unit-test transforms directly and helpers against `createTestDatabase()`. See [`unit-tests.instructions.md`](unit-tests.instructions.md).

## Type checking

The data layer (`db/**/*.ts`, `src/lib/*.ts`) is type-checked by `npm run typecheck`, which runs the native **TypeScript 7** compiler (`tsgo`, from `@typescript/native-preview`) against `tsconfig.tsgo.json`. Keep helpers exported with explicit parameter and return types so `tsgo` can verify them. Linting is unaffected — ESLint + `typescript-eslint` still run on the classic `typescript` package.


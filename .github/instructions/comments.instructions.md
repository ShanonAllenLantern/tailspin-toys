---
description: 'Commenting and documentation conventions for TypeScript and Astro files'
applyTo: '**/*.{ts,astro}'
---

# Commenting & Documentation Standards

## Comment Philosophy: Intent, Not Mechanics

Comments exist to explain *why* code does something — the reasoning, the trade-off, or the non-obvious constraint — not to restate *what* the code already says. If a comment merely paraphrases the line below it, delete it.

**Don't** paraphrase the code:

```ts
// Increment the counter
count++;

// Return the filtered list
return games.filter((g) => g.published);
```

**Do** explain intent or non-obvious decisions:

```ts
// Seed-derived ratings must be deterministic across builds; Math.random() is forbidden here.
const rating = ratingFromTitle(game.title);

// libSQL does not support RETURNING on multi-row inserts, so we insert individually to capture each id.
for (const row of rows) { ... }
```

## Keep Comments Current

Treat outdated comments as bugs. When you change logic, update or remove any comment that no longer accurately describes the code. A stale comment actively misleads — it is worse than no comment at all. Update comments in the same commit that touches the related code.

## TSDoc/JSDoc for Exported Functions

Every **exported function** in `db/` and `src/lib/` must have a TSDoc comment describing its purpose, each parameter, and its return value. This keeps the injectable-db testing pattern self-documenting and makes the data layer easy to navigate.

Use standard TSDoc tags:

```ts
/**
 * Returns all games ordered alphabetically by title, with their publisher and category populated.
 *
 * @param db - The Drizzle database instance (injectable for testing).
 * @returns A promise that resolves to an array of Game objects, or an empty array if none exist.
 */
export async function getAllGames(db: Database): Promise<Game[]> { ... }
```

Required tags:
- **Opening sentence** — one sentence describing what the function does (no tag needed).
- **`@param <name>`** — one tag per parameter. Always document the `db` argument so the injectable testing pattern is explicit.
- **`@returns`** — describe what is returned, including the empty/`null` case when applicable.

Internal (non-exported) helpers do not require TSDoc, but a brief single-line comment is encouraged when the logic is non-obvious.

## Props Interfaces in Astro Components

Each reusable `.astro` component must document its `Props` interface so the component contract is self-explanatory. Add a JSDoc description to the interface itself, and a `@prop`-style inline comment for any property whose name alone does not make its purpose clear:

```astro
---
/**
 * Displays a single game as a card with its title, publisher, and star rating.
 */
interface Props {
  /** The game data to display, including its publisher and category. */
  game: Game;
  /** Renders a compact variant without the description. Defaults to false. */
  compact?: boolean;
}
---
```

For trivially obvious props (e.g., `title: string` on a `<Layout>` component), a description on the interface itself is sufficient; per-property comments are optional.

## TypeScript Formatting Conventions

These rules apply across all TypeScript and Astro frontmatter code:

- **Explicit types on exports** — All exported functions must declare explicit parameter types and return types. Do not rely on inference for public API surfaces.
- **`import type` for type-only imports** — When importing a symbol used only as a type, use `import type { ... }` to make the dependency clear and improve tree-shaking.
- **No `any`** — Avoid `any` in favour of precise types or `unknown` with a narrowing guard. `any` bypasses type safety and hides bugs.
- **One concept per comment** — Do not combine multiple thoughts into one comment block.
- **Active voice, present tense** — *"Returns all games…"* not *"This function will return all games…"*.
- **No author names or dates in comments** — Version history belongs in git, not in code.

> [!NOTE]
> The `no-explicit-any` and `no-unused-vars` rules are enforced via ESLint (`npm run lint`). Explicit return types and `import type` consistency are verified by the TypeScript compiler (`npm run typecheck` / `npm run typecheck:astro`).

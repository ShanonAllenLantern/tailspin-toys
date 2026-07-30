/**
 * Normalizes a user-provided title search query for case-insensitive matching.
 *
 * @param query - The raw user input from the search field.
 * @returns A trimmed lowercase query string.
 */
export function normalizeGameTitleSearchQuery(query: string): string {
    return query.trim().toLocaleLowerCase();
}

/**
 * Returns whether a game title satisfies a search query.
 *
 * Empty queries match every title so the full catalog remains visible until the
 * user intentionally narrows results.
 *
 * @param title - The game title being tested.
 * @param query - The raw user query to match against the title.
 * @returns True when the title includes the normalized query (case-insensitive).
 */
export function gameTitleMatchesSearchQuery(title: string, query: string): boolean {
    const normalizedQuery = normalizeGameTitleSearchQuery(query);

    if (normalizedQuery.length === 0) {
        return true;
    }

    return title.toLocaleLowerCase().includes(normalizedQuery);
}

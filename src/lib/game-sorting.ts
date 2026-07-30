/**
 * Represents the sortable game fields used by catalog ordering controls.
 */
export interface SortableGame {
    title: string;
    starRating: number | null;
}

/**
 * Supported game sort options for the catalog UI.
 */
export const GAME_SORT_OPTIONS = ['title-asc', 'title-desc', 'rating-desc'] as const;

/** The default sort option applied by the catalog. */
export const DEFAULT_GAME_SORT_OPTION: GameSortOption = 'title-asc';

/** Union of supported game sort option values. */
export type GameSortOption = (typeof GAME_SORT_OPTIONS)[number];

/**
 * Returns whether a value is a valid game sort option.
 *
 * @param value - The raw value to validate.
 * @returns True when the value matches a supported game sort option.
 */
export function isGameSortOption(value: string): value is GameSortOption {
    return GAME_SORT_OPTIONS.includes(value as GameSortOption);
}

/**
 * Compares two games using a selected sort option.
 *
 * When sorting by rating, unrated games (`null`) always sort after rated games so
 * backers can evaluate scored titles first. Ties fall back to title ordering for
 * deterministic output.
 *
 * @param left - The first game to compare.
 * @param right - The second game to compare.
 * @param sortOption - The active sort option.
 * @returns A negative number when `left` should come first, a positive number when
 * `right` should come first, or zero when both are equivalent for the selected sort.
 */
export function compareGamesBySort(
    left: SortableGame,
    right: SortableGame,
    sortOption: GameSortOption,
): number {
    const titleComparison = left.title.localeCompare(right.title);

    if (sortOption === 'title-asc') {
        return titleComparison;
    }

    if (sortOption === 'title-desc') {
        return -titleComparison;
    }

    if (left.starRating === null && right.starRating === null) {
        return titleComparison;
    }

    if (left.starRating === null) {
        return 1;
    }

    if (right.starRating === null) {
        return -1;
    }

    if (left.starRating !== right.starRating) {
        return right.starRating - left.starRating;
    }

    return titleComparison;
}

/**
 * Returns a sorted copy of games for the selected catalog ordering.
 *
 * @param games - The source games to sort.
 * @param sortOption - The sort option to apply.
 * @returns A new array sorted according to the selected option.
 */
export function sortGames(games: readonly SortableGame[], sortOption: GameSortOption): SortableGame[] {
    return [...games].sort((left, right) => compareGamesBySort(left, right, sortOption));
}

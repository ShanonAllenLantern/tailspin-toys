import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should filter games by selected categories', async ({ page }) => {
    let categoryId: string | null;

    await test.step('Navigate to homepage and capture a category from the first game card', async () => {
      await page.goto('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();

      categoryId = await page.getByTestId('game-card').first().getAttribute('data-category-id');
      expect(categoryId).not.toBeNull();
    });

    await test.step('Apply category filter', async () => {
      await page.getByTestId(`category-filter-option-${categoryId}`).check();
      await expect(page.getByTestId('filter-results-status')).toContainText('Showing');
    });

    await test.step('Verify all visible cards match selected category', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      const cardCount = await visibleCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        await expect(visibleCards.nth(i)).toHaveAttribute('data-category-id', String(categoryId));
      }
    });
  });

  test('should filter games by selected publishers', async ({ page }) => {
    let publisherId: string | null;

    await test.step('Navigate to homepage and capture a publisher from the first game card', async () => {
      await page.goto('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();

      publisherId = await page.getByTestId('game-card').first().getAttribute('data-publisher-id');
      expect(publisherId).not.toBeNull();
    });

    await test.step('Apply publisher filter', async () => {
      await page.getByTestId(`publisher-filter-option-${publisherId}`).check();
      await expect(page.getByTestId('filter-results-status')).toContainText('Showing');
    });

    await test.step('Verify all visible cards match selected publisher', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      const cardCount = await visibleCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        await expect(visibleCards.nth(i)).toHaveAttribute('data-publisher-id', String(publisherId));
      }
    });
  });

  test('should combine category and publisher filters', async ({ page }) => {
    let categoryId: string | null;
    let publisherId: string | null;

    await test.step('Navigate to homepage and capture filter values from the first card', async () => {
      await page.goto('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();

      const firstCard = page.getByTestId('game-card').first();
      categoryId = await firstCard.getAttribute('data-category-id');
      publisherId = await firstCard.getAttribute('data-publisher-id');
      expect(categoryId).not.toBeNull();
      expect(publisherId).not.toBeNull();
    });

    await test.step('Apply category and publisher filters together', async () => {
      await page.getByTestId(`category-filter-option-${categoryId}`).check();
      await page.getByTestId(`publisher-filter-option-${publisherId}`).check();
      await expect(page.getByTestId('filter-results-status')).toContainText('Showing');
    });

    await test.step('Verify all visible cards satisfy both filters', async () => {
      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      const cardCount = await visibleCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const currentCard = visibleCards.nth(i);
        await expect(currentCard).toHaveAttribute('data-category-id', String(categoryId));
        await expect(currentCard).toHaveAttribute('data-publisher-id', String(publisherId));
      }
    });
  });

  test('should clear active filters and show all games again', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('games-grid')).toBeVisible();

    const allCards = page.getByTestId('game-card');
    const baselineCount = await allCards.count();
    const firstCard = allCards.first();
    const categoryId = await firstCard.getAttribute('data-category-id');
    const publisherId = await firstCard.getAttribute('data-publisher-id');

    await test.step('Apply filters to reduce the visible set', async () => {
      expect(categoryId).not.toBeNull();
      expect(publisherId).not.toBeNull();

      await page.getByTestId(`category-filter-option-${categoryId}`).check();
      await page.getByTestId(`publisher-filter-option-${publisherId}`).check();
      await expect(page.getByTestId('filter-results-status')).toContainText('Showing');
    });

    await test.step('Clear filters and verify all cards become visible', async () => {
      await page.getByTestId('clear-filters-button').click();

      const visibleCards = page.getByTestId('game-card').filter({ visible: true });
      await expect(visibleCards).toHaveCount(baselineCount);
      await expect(page.getByTestId('filter-results-status')).toContainText(`Showing all ${baselineCount} games.`);
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});

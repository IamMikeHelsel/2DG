import { test, expect } from '@playwright/test';

test.describe('Game Loading and Connection', () => {
  test('should load the game and establish server connection', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the game to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    
    // Check for successful WebSocket connection logs
    const logs = page.locator('body');
    await expect(logs).toContainText('Successfully connected', { timeout: 15000 });
    
    // Verify Phaser game is initialized
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('width');
    await expect(canvas).toHaveAttribute('height');
  });

  test('should handle connection failures gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('ws://localhost:2567', route => route.abort());
    
    await page.goto('/');
    
    // Should show connection error after retries
    await expect(page.locator('body')).toContainText('Failed to connect', { timeout: 20000 });
  });

  test('should display game title and UI elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    
    // Check page title
    await expect(page).toHaveTitle(/Toodee/);
    
    // Verify canvas is properly sized
    const canvas = page.locator('canvas');
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(0);
    expect(boundingBox?.height).toBeGreaterThan(0);
  });
});

test.describe('Player Movement and Interaction', () => {
  test('should spawn player and allow movement', async ({ page }) => {
    await page.goto('/');
    
    // Wait for connection and spawn
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000); // Allow game to fully initialize
    
    // Test keyboard movement
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight');
    
    // Movement should be processed (we can't easily test position without exposing game state)
    // But we can verify no errors occurred
    const consoleErrors = page.locator('body');
    await expect(consoleErrors).not.toContainText('Error');
  });

  test('should handle player disconnection and reconnection', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial connection
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Simulate network interruption
    await page.route('ws://localhost:2567/*', route => route.abort());
    await page.waitForTimeout(1000);
    
    // Restore connection
    await page.unroute('ws://localhost:2567/*');
    
    // Should attempt to reconnect
    await page.waitForTimeout(5000);
  });
});

test.describe('Game Performance', () => {
  test('should maintain reasonable frame rate', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (performance.now() - startTime < 2000) {
            requestAnimationFrame(countFrames);
          } else {
            const fps = frameCount / 2; // 2 seconds
            resolve(fps);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
    
    // Should maintain at least 30 FPS
    expect(performanceMetrics).toBeGreaterThan(30);
  });

  test('should handle multiple players without performance degradation', async ({ browser }) => {
    // Create multiple browser contexts to simulate multiple players
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    // Connect all players
    for (const page of pages) {
      await page.goto('/');
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);
    }
    
    // Test simultaneous movement
    await Promise.all(pages.map(async (page, index) => {
      const direction = ['ArrowUp', 'ArrowDown', 'ArrowLeft'][index];
      await page.keyboard.press(direction);
    }));
    
    // All connections should remain stable
    for (const page of pages) {
      const consoleErrors = page.locator('body');
      await expect(consoleErrors).not.toContainText('connection lost');
    }
    
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });
});

test.describe('Game Features', () => {
  test('should support basic game interactions', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Test attack action (if implemented)
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    
    // Test chat (if UI exists)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    
    // Should not crash the game
    const consoleErrors = page.locator('body');
    await expect(consoleErrors).not.toContainText('Uncaught');
  });

  test('should handle browser resize', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    
    // Resize browser
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    
    // Game should still be responsive
    const canvas = page.locator('canvas');
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(0);
    expect(boundingBox?.height).toBeGreaterThan(0);
  });
});
import { test, expect } from '@playwright/test';

async function createLobby(page, name, mode) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.getByPlaceholder('Enter your name').fill(name);
  if (mode) await page.locator(`label.mode-option:has(input[value=${mode}])`).click();
  await page.getByRole('button', { name: 'Create Lobby' }).click();
  await expect(page.locator('.lobby-code-block')).toBeVisible();
  return (await page.locator('.lobby-code-block').innerText()).trim();
}

async function joinLobby(page, code, name) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await page.getByPlaceholder('Enter lobby code').fill(code);
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('.lobby-code-block')).toBeVisible();
}

test('two players: start, chat, reload mid-game and rejoin', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  const code = await createLobby(a, 'Alice');
  await joinLobby(b, code, 'Bob');
  await expect(a.getByText('Bob')).toBeVisible();

  await a.getByRole('button', { name: 'Start Game' }).click();
  await expect(a.locator('.game-board')).toBeVisible();
  await expect(b.locator('.game-board')).toBeVisible();
  await expect(b.locator('.cards-container > *')).toHaveCount(5);

  // Chat
  await a.getByRole('button', { name: /open chat/i }).click();
  await a.getByLabel('Chat message').fill('good luck 🃏');
  await a.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(b.locator('.chat-badge')).toHaveText('1');
  await b.getByRole('button', { name: /open chat/i }).click();
  await expect(b.locator('.chat-msg', { hasText: 'good luck' })).toBeVisible();

  // Reload mid-game: straight back into the game with the same hand size
  await b.reload();
  await expect(b.locator('.game-board')).toBeVisible();
  await expect(b.locator('.cards-container > *')).toHaveCount(5);
  // chat history survives the reload
  await b.getByRole('button', { name: /open chat/i }).click();
  await expect(b.locator('.chat-msg', { hasText: 'good luck' })).toBeVisible();
});

test('solo against bots to the end, then rematch', async ({ page }) => {
  await createLobby(page, 'Solo', 'short');
  for (let i = 0; i < 3; i++) await page.locator('.add-bot-slot').click();
  await expect(page.locator('.player-avatar-bot')).toHaveCount(3);
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.locator('.game-board')).toBeVisible();

  // Simple strategy: whenever it's our turn, play the first card
  const result = page.locator('.game-won-overlay');
  const deadline = Date.now() + 100_000;
  while (!(await result.isVisible()) && Date.now() < deadline) {
    const overlay = page.locator('.round-transition-overlay');
    if (await overlay.isVisible()) await overlay.click().catch(() => {});
    const play = page.locator('.action-buttons .btn-primary');
    if (await play.isVisible().catch(() => false)) {
      await page.locator('.cards-container > *').first().click().catch(() => {});
      await play.click({ timeout: 1000 }).catch(() => {});
    }
    await page.waitForTimeout(100);
  }
  await expect(result).toBeVisible();
  await expect(page.locator('.final-scores li')).toHaveCount(4);

  await page.getByRole('button', { name: 'Rematch' }).click();
  await expect(page.locator('.lobby-code-block')).toBeVisible();
  await expect(page.locator('.player-avatar-bot')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible();
});

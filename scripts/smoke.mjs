#!/usr/bin/env node
/**
 * Live end-to-end smoke test for Qadam.
 *
 * Boots the production build (`vite preview`), drives it in headless Chrome,
 * and walks the core PRD flows: Rule-of-3 slots, quick add, keyboard
 * shortcuts, the Parking Lot, the calendar, reload persistence (local-first),
 * and the morning reconciliation prompt.
 *
 *   npm run build && node scripts/smoke.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/#/`;
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';

mkdirSync('artifacts', { recursive: true });

const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Boot the preview server
 * ------------------------------------------------------------------ */
console.log('• starting preview server…');
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PATH: process.env.PATH },
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
process.on('exit', () => {
  try {
    server.kill('SIGTERM');
  } catch {
    /* already gone */
  }
});

const up = await waitForServer(`http://localhost:${PORT}/`);
if (!up) {
  console.error('preview server never came up:\n' + serverLog);
  server.kill();
  process.exit(1);
}

const pageErrors = [];
const consoleErrors = [];

let browser;
try {
  browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('• Today dashboard');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=focus step', { timeout: 20000 });

  const emptySlots = await page.locator('button:has-text("Add a focus task")').count();
  check('renders exactly 3 empty focus slots by default', emptySlots === 3, `found ${emptySlots}`);

  const progress = await page.locator('text=0 of 3 focus steps').count();
  check('shows 0 of 3 focus steps', progress === 1);

  console.log('• Quick add via empty slot');
  await page.locator('button:has-text("Add a focus task")').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  check('quick add dialog opens', true);

  await page.fill('#qadam-title', 'Ship the Qadam MVP');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Ship the Qadam MVP', { timeout: 5000 });
  check('task added and occupies a slot', true);

  const afterAdd = await page.locator('button:has-text("Add a focus task")').count();
  check('two empty slots remain', afterAdd === 2, `found ${afterAdd}`);

  console.log('• Keyboard shortcuts (PRD §4.3)');
  await page.keyboard.press('n');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.waitForTimeout(300);
  const dialogOpenAfterN = await page.locator('[role="dialog"]').count();
  check('N opens Quick Add', dialogOpenAfterN === 1);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const dialogAfterEsc = await page.locator('[role="dialog"]').count();
  check('Escape closes the modal', dialogAfterEsc === 0, `left ${dialogAfterEsc}`);

  console.log('• Completing a focus step');
  await page.locator('[role="checkbox"]').first().click();
  await page.waitForTimeout(500);
  const progressDone = await page.locator('text=1 of 3 focus steps').count();
  check('progress advances to 1 of 3', progressDone === 1);

  console.log('• Reminders sub-section (PRD §5.1)');
  try {
    const slotsBefore = await page
      .locator('button:has-text("Add a focus task")')
      .count();

    await page.keyboard.press('n');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.locator('[role="dialog"] button:has-text("Reminder")').click();
    await page.fill('#qadam-title', 'Doctor appointment');
    await page.fill('#qadam-time', '17:30');
    await page.keyboard.press('Enter');

    await page.waitForSelector('text=Today’s reminders', { timeout: 5000 });
    check('reminder banner renders for today’s reminders', true);

    const timeShown = await page.locator('text=17:30').count();
    check('reminder renders as "17:30 — Title"', timeShown >= 1, `${timeShown} match`);

    const slotsAfter = await page
      .locator('button:has-text("Add a focus task")')
      .count();
    check(
      'a reminder does not consume a focus slot',
      slotsAfter === slotsBefore,
      `${slotsBefore} -> ${slotsAfter}`,
    );
  } catch (error) {
    check('reminders sub-section works', false, String(error));
  }

  console.log('• Mental Parking Lot (PRD §5.2)');
  await page.locator('a:has-text("Brain dump / Parking Lot")').first().click();
  await page.waitForSelector('#qadam-dump', { timeout: 5000 });
  await page.fill('#qadam-dump', 'Learn to cook tahdig');
  await page.locator('button:has-text("Park it")').click();
  await page.waitForSelector('text=Learn to cook tahdig', { timeout: 5000 });
  check('a thought can be parked', true);

  await page.locator('button:has-text("Promote to Today")').click();
  await page.waitForTimeout(600);
  const parkedLeft = await page.locator('text=Learn to cook tahdig').count();
  check('promote moves it out of the Parking Lot', parkedLeft === 0, `left ${parkedLeft}`);

  console.log('• Calendar (PRD §5.3)');
  await page.locator('nav[aria-label="Primary"] a:has-text("Calendar")').click();
  await page.waitForSelector('ul[role="list"]', { timeout: 5000 });

  const headers = await page.locator('[data-testid="weekday-headers"] > div').allTextContents();
  check(
    'Jalali weekday headers use compact Persian letters',
    headers.length === 7 && headers[0] === 'ش',
    JSON.stringify(headers),
  );

  const dayButtons = await page.locator('ul[role="list"] button').count();
  check('month grid renders a full set of days', dayButtons >= 28 && dayButtons <= 31, `${dayButtons} days`);

  const zeroGuiltLegend = await page.locator('text=Grey days are simply days').count();
  check('shows the zero-guilt legend', zeroGuiltLegend === 1);

  await page.locator('ul[role="list"] button').first().click();
  await page.waitForSelector('text=completed', { timeout: 5000 });
  const goalLabel = await page.locator('text=goal').count();
  check('day detail card shows Tasks Completed / Goal', goalLabel >= 1);

  const guiltWords = await page
    .getByText(/failed|streak|missed|overdue|failure/i)
    .count();
  check('no guilt-inducing language anywhere', guiltWords === 0, `${guiltWords} matches`);

  console.log('• Local-first persistence across reload');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=focus step', { timeout: 20000 });
  const persisted = await page.locator('text=Ship the Qadam MVP').count();
  check('tasks survive a full reload (IndexedDB)', persisted === 1);

  console.log('• Morning reconciliation (PRD §6.1)');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await page.keyboard.press('n');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.fill('#qadam-title', 'Leftover from yesterday');
  await page.fill('#qadam-date', yesterday);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);

  // Pretend the previous session happened yesterday.
  await page.evaluate(async (lastOpen) => {
    const req = indexedDB.open('qadam');
    const db = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({ key: 'lastOpenDate', value: lastOpen });
    await new Promise((res) => {
      tx.oncomplete = res;
      tx.onerror = res;
    });
    db.close();
  }, yesterday);

  await page.reload({ waitUntil: 'domcontentloaded' });
  const promptAppeared = await page
    .locator('text=A gentle check-in')
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check('gentle prompt appears on the next session', promptAppeared);

  if (promptAppeared) {
    await page.locator('button:has-text("Move to Today")').click();
    await page.waitForTimeout(700);
    const carried = await page.locator('text=Leftover from yesterday').count();
    check('carry-forward moves it into today’s slots', carried >= 1, `${carried} visible`);
  }

  console.log('• Cross-tab sync (PRD §6.4)');
  try {
    const tab2 = await context.newPage();
    tab2.on('pageerror', (err) => pageErrors.push('[tab2] ' + String(err)));
    await tab2.goto(BASE, { waitUntil: 'domcontentloaded' });
    await tab2.waitForSelector('text=focus step', { timeout: 20000 });

    // Mutate in tab 1 and expect tab 2 to refresh without a reload.
    await page.bringToFront();
    await page.keyboard.press('n');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.fill('#qadam-title', 'Synced across tabs');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);

    const inTab2 = await tab2.locator('text=Synced across tabs').count();
    check('a change in one tab propagates to another live', inTab2 === 1, `found ${inTab2}`);
    await tab2.close();
  } catch (error) {
    check('a change in one tab propagates to another live', false, String(error));
  }

  console.log('• Screenshots');
  await page.screenshot({ path: 'artifacts/today.png', fullPage: true });

  await page.goto(BASE + 'calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('ul[role="list"]', { timeout: 5000 });
  await page.screenshot({ path: 'artifacts/calendar.png', fullPage: true });

  // Dark mode (PRD §4.1 design tokens).
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=focus step', { timeout: 20000 });
  await page.locator('button[aria-label="Switch to dark theme"]').click();
  await page.waitForTimeout(700);
  const darkApplied = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  check('theme toggle applies dark mode', darkApplied);
  await page.screenshot({ path: 'artifacts/today-dark.png', fullPage: true });

  // Back to light, then check the mobile bottom pill nav (PRD §4.2).
  await page.locator('button[aria-label="Switch to light theme"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=focus step', { timeout: 20000 });
  const bottomNav = await page.locator('nav[aria-label="Primary (mobile)"]').isVisible();
  check('mobile bottom pill nav is visible', bottomNav);
  await page.screenshot({ path: 'artifacts/today-mobile.png', fullPage: true });

  check('screenshots written', true);
} catch (error) {
  check('smoke run completed without exceptions', false, String(error));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

console.log('\n• runtime errors');
check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
const realConsoleErrors = consoleErrors.filter(
  (e) => !/favicon|apple-touch|manifest/i.test(e),
);
check('no console errors', realConsoleErrors.length === 0, realConsoleErrors.join(' | '));

console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);


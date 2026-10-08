import { readFileSync } from 'node:fs';

/**
 * Static sanity check on the production bundle: confirms the built app still
 * carries the pieces the PRD depends on, so a refactor cannot silently drop
 * them.
 *
 *   node scripts/check-bundle.mjs dist/assets/index-<hash>.js
 */
const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/check-bundle.mjs <bundle.js>');
  process.exit(2);
}

const src = readFileSync(file, 'utf8');

// The seven single-letter Persian headers, in any quoting style the minifier
// picks (`ی`,`د`… or 'ی','د'…).
const headerRun = /([`'"])ی\1,\1د\1,\1س\1,\1چ\1,\1پ\1,\1ج\1,\1ش\1/.test(src);

const probes = {
  'compact Persian weekday headers': headerRun,
  'full Persian weekday names (WEEKDAYS_FA)': src.includes('یکشنبه'),
  'old slice(0,4) truncation removed': !src.includes('.slice(0,4)'),
  'Jalali month names': src.includes('فروردین'),
  'idle_gray design token': src.includes('idle-soft'),
  'celebration copy (PRD §5.1)': src.includes('The rest of the day'),
  'morning prompt copy (PRD §6.1)': src.includes('gentle check-in'),
  'zero-guilt calendar legend (PRD §5.3)': src.includes('Grey days are simply days'),
  'service worker registration (PWA)': src.includes('serviceWorker'),
};

let failed = 0;
for (const [name, ok] of Object.entries(probes)) {
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}`);
  if (!ok) failed++;
}

const total = Object.keys(probes).length;
console.log(`${total - failed}/${total} bundle probes passed`);
process.exit(failed ? 1 : 0);

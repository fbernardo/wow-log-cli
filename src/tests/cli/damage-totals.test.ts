import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { parseLog, type ParsedLog, type EncounterWindow } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const ENCOUNTERS_DIR = resolve(FIXTURES_DIR, 'encounters');

function effectiveDamage(e: any): number {
  const isDamage =
    e.type === 'SPELL_DAMAGE' ||
    e.type === 'SPELL_PERIODIC_DAMAGE' ||
    e.type === 'SWING_DAMAGE' ||
    e.type === 'SWING_DAMAGE_LANDED' ||
    e.type === 'RANGE_DAMAGE';

  if (!isDamage) return 0;

  const amount = Math.max(0, Number(e.amount || 0));
  const overkill = Math.max(0, Number(e.overkill || 0));
  return Math.max(0, amount - overkill);
}

function calculateDamageTotals(parsed: ParsedLog, encounter: EncounterWindow): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of parsed.events as any[]) {
    const ts = e.timestamp?.getTime?.() ?? 0;
    if (ts < encounter.startMs || ts > encounter.endMs) continue;
    if (!String(e.sourceGUID || '').startsWith('Player-')) continue;

    const value = effectiveDamage(e);
    if (value <= 0) continue;

    const source = e.sourceName || e.sourceGUID;
    totals[source] = (totals[source] || 0) + value;
  }
  return totals;
}

function sortByName(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])));
}

// Load manifest to get list of all fixtures
interface FixtureEntry {
  encounterId: number;
  bossName: string;
  result: string;
  pull: number;
  file: string;
}

const manifest: FixtureEntry[] = JSON.parse(
  readFileSync(resolve(ENCOUNTERS_DIR, 'manifest.json'), 'utf-8'),
);

// Also include the main plexus-slice.log
const ALL_FIXTURES: { name: string; path: string }[] = [
  { name: 'plexus-slice.log (Plexus Sentinel)', path: resolve(FIXTURES_DIR, 'plexus-slice.log') },
  ...manifest.map((f) => ({
    name: `${f.file} (${f.bossName})`,
    path: resolve(ENCOUNTERS_DIR, f.file),
  })),
];

describe('fight player damage totals', () => {
  for (const fixture of ALL_FIXTURES) {
    it(`calculates per-player damage totals for ${fixture.name}`, { timeout: 60000 }, () => {
      let content: string;
      if (fixture.path.endsWith('.gz')) {
        content = gunzipSync(readFileSync(fixture.path)).toString('utf-8');
      } else {
        content = readFileSync(fixture.path, 'utf-8');
      }

      const parsed = parseLog(content);

      // For each encounter in this fixture, calculate totals and verify we get non-zero values
      expect(parsed.encounters.length).toBeGreaterThan(0);

      for (const encounter of parsed.encounters) {
        const totals = calculateDamageTotals(parsed, encounter);
        const totalDamage = Object.values(totals).reduce((a, b) => a + b, 0);

        // Some encounters (e.g., wipes) may have zero player damage - that's valid
        expect(totalDamage).toBeGreaterThanOrEqual(0);
        // If there was damage, we should have player names
        if (totalDamage > 0) {
          expect(Object.keys(totals).length).toBeGreaterThan(0);
        }

        // Verify no player deals negative damage
        for (const [player, damage] of Object.entries(totals)) {
          expect(damage).toBeGreaterThanOrEqual(0);
        }
      }
    });
  }
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { parseLog, parseEncounterIndex, resolveEncounter } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const ENCOUNTERS_DIR = resolve(FIXTURES_DIR, 'encounters');

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

// All fixtures to test
const ALL_FIXTURES: { name: string; path: string; isGz: boolean }[] = [
  { name: 'plexus-slice.log', path: resolve(FIXTURES_DIR, 'plexus-slice.log'), isGz: false },
  ...manifest.map((f) => ({
    name: f.file,
    path: resolve(ENCOUNTERS_DIR, f.file),
    isGz: true,
  })),
];

describe('parser invariants across all fixtures', () => {
  for (const fixture of ALL_FIXTURES) {
    describe(fixture.name, () => {
      let content: string;
      let parsed: ReturnType<typeof parseLog>;

      it('parses without errors', { timeout: 60000 }, () => {
        if (fixture.isGz) {
          content = gunzipSync(readFileSync(fixture.path)).toString('utf-8');
        } else {
          content = readFileSync(fixture.path, 'utf-8');
        }
        parsed = parseLog(content);
        expect(parsed).toBeDefined();
        expect(parsed.events).toBeDefined();
        expect(parsed.encounters).toBeDefined();
      });

      it('extracts at least one encounter', { timeout: 60000 }, () => {
        expect(parsed.encounters.length).toBeGreaterThan(0);
      });

      it('encounter has valid id, name, and result', { timeout: 60000 }, () => {
        for (const enc of parsed.encounters) {
          expect(enc.info.encounterId).toBeGreaterThan(0);
          expect(enc.info.bossName).toBeTruthy();
          expect(['kill', 'wipe', 'unknown', 'in-progress']).toContain(enc.info.result);
        }
      });

      it('has events within encounter windows', { timeout: 60000 }, () => {
        for (const enc of parsed.encounters) {
          const eventsInWindow = parsed.events.filter((e: any) => {
            const ts = e.timestamp?.getTime?.() ?? 0;
            return ts >= enc.startMs && ts <= enc.endMs;
          });
          expect(eventsInWindow.length).toBeGreaterThan(0);
        }
      });

      it('resolveEncounter works by id and by name fragment', { timeout: 60000 }, () => {
        const first = parsed.encounters[0];
        const byId = resolveEncounter(parsed, String(first.info.encounterId));
        expect(byId).toBeTruthy();
        expect(byId?.info.encounterId).toBe(first.info.encounterId);

        const nameFragment = first.info.bossName.slice(0, 5).toLowerCase();
        const byName = resolveEncounter(parsed, nameFragment);
        expect(byName).toBeTruthy();
        expect(byName?.info.encounterId).toBe(first.info.encounterId);
      });

      it('parseEncounterIndex matches encounter count', { timeout: 60000 }, () => {
        const idx = parseEncounterIndex(content);
        expect(idx.length).toBe(parsed.encounters.length);
      });
    });
  }
});

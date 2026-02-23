import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseLog, parseEncounterIndex, resolveEncounter, resolveEncounters } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');
const DIMENSIUS_PULL_1 = resolve(__dirname, '../fixtures/encounters/enc-3135-pull-1-dimensius-the-all-devouring.log.gz');
const DIMENSIUS_PULL_2 = resolve(__dirname, '../fixtures/encounters/enc-3135-pull-2-dimensius-the-all-devouring.log.gz');

function readGz(path: string): string {
  return gunzipSync(readFileSync(path)).toString('utf-8');
}

describe('encounter index', () => {
  it('parses encounters from fixture', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    expect(parsed.encounters.length).toBeGreaterThan(0);
    expect(parsed.encounters[0].info.bossName).toBeTruthy();
  });

  it('resolves encounter by id and name', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const first = parsed.encounters[0]?.info;
    if (!first) throw new Error('Expected at least one encounter in fixture');

    expect(resolveEncounter(parsed, String(first.encounterId))?.info.encounterId).toBe(first.encounterId);
    expect(resolveEncounter(parsed, first.bossName.toLowerCase().slice(0, 5))?.info.encounterId).toBe(first.encounterId);
  });

  it('resolveEncounters returns all matches for encounter id', () => {
    const content = `${readGz(DIMENSIUS_PULL_1)}\n${readGz(DIMENSIUS_PULL_2)}`;
    const parsed = parseLog(content);

    const fights3135 = resolveEncounters(parsed, '3135');
    expect(fights3135.length).toBe(2);
    expect(fights3135.every((f) => f.info.encounterId === 3135)).toBe(true);
  });

  it('parseEncounterIndex matches encounter count from full parse', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const full = parseLog(content);
    const idx = parseEncounterIndex(content);
    expect(idx.length).toBe(full.encounters.length);
    expect(idx[0].info.bossName).toBe(full.encounters[0].info.bossName);
  });
});

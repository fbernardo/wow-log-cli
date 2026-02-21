import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseLog, parseEncounterIndex, resolveEncounter } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');

describe('encounter index', () => {
  it('parses encounters from fixture', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    expect(parsed.encounters.length).toBe(1);
    expect(parsed.encounters[0].info.bossName).toBe('Plexus Sentinel');
  });

  it('resolves encounter by id and name', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    expect(resolveEncounter(parsed, '3129')?.info.bossName).toBe('Plexus Sentinel');
    expect(resolveEncounter(parsed, 'plexus')?.info.encounterId).toBe(3129);
  });

  it('parseEncounterIndex matches encounter count from full parse', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const full = parseLog(content);
    const idx = parseEncounterIndex(content);
    expect(idx.length).toBe(full.encounters.length);
    expect(idx[0].info.bossName).toBe(full.encounters[0].info.bossName);
  });
});

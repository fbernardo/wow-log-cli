import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseCliArgs, parseLog, runCommand } from '../../lib/cli/query-engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');

describe('cli args', () => {
  it('parses command and boolean flags', () => {
    const r = parseCliArgs(['ability', 'events', '--input', 'x.log', '--player', 'Eruani', '--enemy-only', '--normalized', '--limit', '10']);
    expect(r.command).toEqual(['ability', 'events']);
    expect(r.options.input).toBe('x.log');
    expect(r.options.player).toBe('Eruani');
    expect(r.options.enemyOnly).toBe(true);
    expect(r.options.normalized).toBe(true);
    expect(r.options.limit).toBe(10);
  });
});

describe('cli commands', () => {
  it('fight list returns plexus encounter', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['fight', 'list'], {});
    const plex = res.fights.find((f: any) => f.bossName === 'Plexus Sentinel');
    expect(plex).toBeTruthy();
    expect(plex.result).toBe('kill');
  });

  it('ability events returns void ray rows', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['ability', 'events'], {
      encounter: '3129',
      player: "Eruani-Drak'thul-EU",
      ability: 'Void Ray',
      enemyOnly: true,
      normalized: true,
      limit: 5,
    });
    expect(res.count).toBeGreaterThan(100);
    expect(res.rows.length).toBe(5);
    expect(res.rows[0]).toHaveProperty('effectiveDamage');
  });

  it('events search supports field projection', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: "Eruani-Drak'thul-EU",
      eventTypes: ['SPELL_DAMAGE'],
      fields: ['timestamp', 'eventType', 'ability'],
      limit: 3,
      enemyOnly: true,
    });
    expect(res.rows.length).toBe(3);
    expect(Object.keys(res.rows[0]).sort()).toEqual(['ability', 'eventType', 'timestamp']);
  });

  it('events search with player includes pet-owned events', () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: 'Willòwí-Draenor-EU',
      limit: 3000,
    });

    expect(res.count).toBeGreaterThan(1314); // direct player events + pet-owned events
    expect(res.rows.some((r: any) => r.source === 'Glaciersmasher')).toBe(true);
  });
});

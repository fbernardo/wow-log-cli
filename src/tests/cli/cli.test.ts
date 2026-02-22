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
  it('fight list returns at least one encounter and includes plexus when present', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['fight', 'list'], {});
    expect(Array.isArray(res.fights)).toBe(true);
    expect(res.fights.length).toBeGreaterThan(0);

    const plex = res.fights.find((f: any) => f.bossName === 'Plexus Sentinel');
    if (plex) {
      expect(['kill', 'wipe', 'unknown']).toContain(plex.result);
    }
  });

  it('ability events returns void ray rows', { timeout: 30000 }, () => {
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

  it('events search supports field projection', { timeout: 30000 }, () => {
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

  it('events search with player includes pet-owned events', { timeout: 30000 }, () => {
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

  it('events search supports --sort desc before pagination', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      sort: 'amount:desc',
      limit: 5,
    });

    expect(res.rows.length).toBe(5);
    for (let i = 1; i < res.rows.length; i++) {
      expect(Number(res.rows[i - 1].amount)).toBeGreaterThanOrEqual(Number(res.rows[i].amount));
    }
  });

  it('throws on invalid --sort field', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    expect(() => runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      sort: 'notAField:desc',
    })).toThrow(/Invalid --sort field/);
  });

  it('filters events by relative --time-range', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const all: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      limit: 5000,
    });

    const windowed: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      timeRange: '00:10.000,00:20.000',
      limit: 5000,
    });

    expect(windowed.count).toBeGreaterThan(0);
    expect(windowed.count).toBeLessThan(all.count);
  });

  it('throws on invalid --time-range value', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    expect(() => runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      timeRange: 'invalid,00:20.000',
    })).toThrow(/Invalid --time-range value/);
  });

  it('includes raw line when --raw-line is enabled', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const withRaw: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      rawLine: true,
      limit: 1,
    });

    const withoutRaw: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      limit: 1,
    });

    expect(withRaw.rows[0].rawLine).toContain('SPELL_DAMAGE');
    expect(withoutRaw.rows[0].rawLine).toBeUndefined();
  });
});

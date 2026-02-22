import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { runCli } from '../../lib/cli/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');
const REPO_ROOT = resolve(__dirname, '../../..');
const OUT_PATH = '/tmp/logparse-cli-out.json';

describe('cli index', () => {
  it('returns 1 when no command is provided', () => {
    const code = runCli([]);
    expect(code).toBe(1);
  });

  it('returns 1 when input is missing', () => {
    const code = runCli(['fight', 'list']);
    expect(code).toBe(1);
  });

  it('runs command and writes output file', { timeout: 30000 }, () => {
    if (existsSync(OUT_PATH)) unlinkSync(OUT_PATH);

    const code = runCli([
      'fight',
      'list',
      '--input',
      LOG_PATH,
      '--out',
      OUT_PATH,
      '--compact',
    ]);

    expect(code).toBe(0);
    expect(existsSync(OUT_PATH)).toBe(true);

    const data = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(Array.isArray(data.fights)).toBe(true);
    expect(data.fights.length).toBeGreaterThan(0);
    expect(data.fights[0].bossName).toBeTruthy();

    unlinkSync(OUT_PATH);
  });

  it('writes csv output', { timeout: 30000 }, () => {
    if (existsSync(OUT_PATH)) unlinkSync(OUT_PATH);

    const code = runCli([
      'fight',
      'list',
      '--input',
      LOG_PATH,
      '--out',
      OUT_PATH,
      '--format',
      'csv',
    ]);

    expect(code).toBe(0);
    const txt = readFileSync(OUT_PATH, 'utf-8');
    expect(txt.startsWith('fightId,encounterId,bossName')).toBe(true);

    unlinkSync(OUT_PATH);
  });

  it('writes jsonl output', { timeout: 30000 }, () => {
    if (existsSync(OUT_PATH)) unlinkSync(OUT_PATH);

    const code = runCli([
      'fight',
      'list',
      '--input',
      LOG_PATH,
      '--out',
      OUT_PATH,
      '--format',
      'jsonl',
    ]);

    expect(code).toBe(0);
    const txt = readFileSync(OUT_PATH, 'utf-8').trim();
    const lines = txt.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].startsWith('{"fightId"')).toBe(true);

    unlinkSync(OUT_PATH);
  });

  it('supports stdin input with --input -', { timeout: 30000 }, () => {
    const cmd = `cat "${LOG_PATH}" | npx tsx src/lib/parser-cli.ts fight list --input -`;
    const out = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8' });
    const data = JSON.parse(out);
    expect(Array.isArray(data.fights)).toBe(true);
    expect(data.fights.length).toBeGreaterThan(0);
    expect(data.fights[0].bossName).toBeTruthy();
  });
});

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { parseEncounterIndex } from '../src/lib/cli/encounter-index';
import { resolve, join } from 'path';
import { cwd } from 'process';

const projectRoot = cwd();
const defaultBigPath = join(projectRoot, '../archive/wow-log-analyzer/WoWCombatLog-021626_223411.txt');
const defaultOutDir = join(projectRoot, 'src/tests/fixtures/encounters');

const bigPath = process.argv[2] || defaultBigPath;
const outDir = process.argv[3] || defaultOutDir;

mkdirSync(outDir, { recursive: true });

const content = readFileSync(bigPath, 'utf-8');
const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
const lineRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})\.(\d{3,4})\s{2,}(.+)$/;

function ts(line: string): number | null {
  const m = line.match(lineRegex);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const msRaw = Number(m[7]);
  const ms = m[7].length === 4 ? Math.round(msRaw * 0.1) : msRaw;
  return new Date(y, mo - 1, d, h, mi, s, ms).getTime();
}

const encounters = parseEncounterIndex(content);
const sameCount: Record<number, number> = {};
const manifest: any[] = [];

for (const e of encounters) {
  if (e.info.encounterId === 3129) continue; // covered by plexus-slice.log

  sameCount[e.info.encounterId] = (sameCount[e.info.encounterId] || 0) + 1;
  const pull = sameCount[e.info.encounterId];
  const slug = e.info.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  const file = `enc-${e.info.encounterId}-pull-${pull}-${slug}.log.gz`;

  const selected: string[] = [];
  for (const line of lines) {
    const t = ts(line);
    if (t === null) continue;
    if (t >= e.startMs && t <= e.endMs) selected.push(line);
  }

  writeFileSync(`${outDir}/${file}`, gzipSync(selected.join('\n') + '\n'));
  manifest.push({
    encounterId: e.info.encounterId,
    bossName: e.info.bossName,
    result: e.info.result,
    pull,
    file,
  });
}

writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} fixtures in ${outDir}`);

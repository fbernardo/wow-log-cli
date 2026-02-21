export interface OutputOptions {
  offset?: number;
  limit?: number;
  fields?: string[];
}

export type OutputFormat = 'json' | 'jsonl' | 'csv' | 'table' | 'md';

export function toRow(
  e: any,
  normalized = false,
  effectiveDamageFn?: (e: any) => number,
  includeRawLine = false,
) {
  const row: Record<string, any> = {
    timestamp: e.timestamp?.toISOString?.() ?? '',
    eventType: e.type,
    source: e.sourceName,
    target: e.destName,
    ability: e.spellName || (e.type?.startsWith('SWING_') ? 'Melee' : undefined),
    amount: e.amount ?? 0,
    absorbed: e.absorbed ?? 0,
    overkill: e.overkill ?? 0,
    critical: !!e.critical,
  };

  if (normalized) {
    const effective = effectiveDamageFn ? effectiveDamageFn(e) : 0;
    row.effectiveDamage = effective;
    row.countsAsHit = row.eventType === 'SPELL_MISSED' || row.eventType === 'SPELL_PERIODIC_MISSED'
      ? e.missType === 'ABSORB'
      : String(row.eventType || '').includes('DAMAGE');
    row.countsAsCrit = !!e.critical;
  }

  if (includeRawLine) {
    row.rawLine = e.rawLine ?? '';
  }

  return row;
}

export function paginate<T>(rows: T[], options: OutputOptions): T[] {
  const offset = options.offset || 0;
  const limit = options.limit || 200;
  return rows.slice(offset, offset + limit);
}

export function projectFields<T extends Record<string, any>>(rows: T[], fields?: string[]): Partial<T>[] {
  if (!fields || fields.length === 0) return rows;
  return rows.map((row) => {
    const out: Partial<T> = {};
    for (const f of fields) out[f as keyof T] = row[f as keyof T];
    return out;
  });
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function semantics(enemyOnly = false) {
  return {
    enemyOnly,
    overkillCountsAsDamage: false,
    absorbedCountsAsDamage: true,
  };
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function findTabularArray(result: any): Record<string, any>[] {
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.fights)) return result.fights;
  if (Array.isArray(result?.topPlayers)) return result.topPlayers;
  return [];
}

export function formatResult(result: any, format: OutputFormat = 'json', compact = true): string {
  if (format === 'json') {
    return JSON.stringify(result, null, compact ? 0 : 2);
  }

  const rows = findTabularArray(result);

  if (format === 'jsonl') {
    return rows.map((r) => JSON.stringify(r)).join('\n');
  }

  if (format === 'table') {
    if (rows.length === 0) return '';
    const cols = Array.from(rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()));
    const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r?.[c] ?? '').length)));
    const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
    const sep = widths.map((w) => '-'.repeat(w)).join('-|-');
    const lines = rows.map((r) => cols.map((c, i) => String(r?.[c] ?? '').padEnd(widths[i])).join(' | '));
    return [header, sep, ...lines].join('\n');
  }

  if (format === 'md') {
    if (rows.length === 0) return '';
    const cols = Array.from(rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()));
    const esc = (v: unknown) => String(v ?? '').replace(/\|/g, '\\|');
    const header = `| ${cols.join(' | ')} |`;
    const sep = `| ${cols.map(() => '---').join(' | ')} |`;
    const lines = rows.map((r) => `| ${cols.map((c) => esc(r?.[c])).join(' | ')} |`);
    return [header, sep, ...lines].join('\n');
  }

  // csv
  if (rows.length === 0) return '';
  const cols = Array.from(rows.reduce((set, r) => {
    Object.keys(r || {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const header = cols.join(',');
  const lines = rows.map((r) => cols.map((c) => escapeCsv(r?.[c])).join(','));
  return [header, ...lines].join('\n');
}

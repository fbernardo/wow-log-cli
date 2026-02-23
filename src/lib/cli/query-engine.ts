import type { CombatEvent } from '../parser-events';
import { parseLog, resolveEncounters, type ParsedLog } from './encounter-index';
import { toRow, paginate, projectFields, semantics } from './output';
export { parseLog, resolveEncounter, type ParsedLog } from './encounter-index';

export interface CliOptions {
  input?: string;
  format?: 'json' | 'jsonl' | 'csv' | 'table' | 'md';
  compact?: boolean;
  out?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  fields?: string[];
  encounter?: string;
  fight?: string;
  player?: string;
  target?: string;
  ability?: string;
  eventTypes?: string[];
  timeRange?: string;
  enemyOnly?: boolean;
  normalized?: boolean;
  rawLine?: boolean;
}

function parseRelativeTimeMs(input: string): number | null {
  const m = input.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const hours = Number(m[1] || 0);
  const minutes = Number(m[2] || 0);
  const seconds = Number(m[3] || 0);
  const ms = Number((m[4] || '').padEnd(3, '0') || 0);
  return (((hours * 60 + minutes) * 60) + seconds) * 1000 + ms;
}

function parseTimeRange(range: string | undefined, baseMs: number): { start?: number; end?: number } {
  if (!range) return {};
  const [leftRaw, rightRaw] = range.split(',', 2);
  const left = (leftRaw || '').trim();
  const right = (rightRaw || '').trim();

  const toAbs = (s: string): number | undefined => {
    if (!s) return undefined;
    const rel = parseRelativeTimeMs(s);
    if (rel !== null) return baseMs + rel;
    const abs = Date.parse(s);
    if (!Number.isNaN(abs)) return abs;
    throw new Error(`Invalid --time-range value: ${s}`);
  };

  const start = toAbs(left);
  const end = toAbs(right);
  return { start, end };
}

function applyFilters(parsed: ParsedLog, options: CliOptions): CombatEvent[] {
  const encounters = resolveEncounters(parsed, options.encounter);
  const fight = options.fight
    ? parsed.encounters.find((e) => e.info.fightId === options.fight)
    : null;

  const encounterWindows = fight
    ? [fight]
    : encounters;

  const eventTypeSet = options.eventTypes ? new Set(options.eventTypes) : null;

  // If player is given by name, resolve possible player GUID(s) so ownerGUID pet rows can match.
  const playerGuidSet = new Set<string>();
  if (options.player) {
    for (const e of parsed.events as any[]) {
      if (!e?.sourceGUID || !String(e.sourceGUID).startsWith('Player-')) continue;
      if (e.sourceName === options.player || e.sourceGUID === options.player) {
        playerGuidSet.add(e.sourceGUID);
      }
    }
    if (String(options.player).startsWith('Player-')) playerGuidSet.add(String(options.player));
  }

  const baseMs = encounterWindows[0]?.startMs ?? (parsed.events[0] as any)?.timestamp?.getTime?.() ?? 0;
  const timeRange = parseTimeRange(options.timeRange, baseMs);

  return parsed.events.flatMap((e: any) => {
    const ts = e.timestamp?.getTime?.() ?? 0;

    let fightId: string | undefined;
    if (encounterWindows.length > 0) {
      const match = encounterWindows.find((w) => ts >= w.startMs && ts <= w.endMs);
      if (!match) return [];
      fightId = match.info.fightId;
    }

    if (timeRange.start !== undefined && ts < timeRange.start) return [];
    if (timeRange.end !== undefined && ts > timeRange.end) return [];
    if (eventTypeSet && !eventTypeSet.has(e.type)) return [];

    if (options.player) {
      const matchSource = e.sourceName === options.player || e.sourceGUID === options.player;
      const matchOwnerByName = e.ownerName === options.player;
      const matchOwnerByGuid = !!e.ownerGUID && playerGuidSet.has(String(e.ownerGUID));
      if (!matchSource && !matchOwnerByName && !matchOwnerByGuid) return [];
    }

    if (options.target && e.destName !== options.target && e.destGUID !== options.target) return [];
    if (options.ability && e.spellName !== options.ability && String(e.spellId ?? '') !== options.ability) return [];

    return [{ ...e, fightId } as any];
  });
}

function isEnemyTarget(e: any): boolean {
  return !!e.destGUID && !String(e.destGUID).startsWith('Player-');
}

function effectiveDamage(e: any): number {
  if (e.type === 'SPELL_MISSED' || e.type === 'SPELL_PERIODIC_MISSED') {
    if (e.missType === 'ABSORB') return Math.max(0, e.absorbed || 0);
    return 0;
  }
  const amount = Math.max(0, e.amount || 0);
  const overkill = Math.max(0, e.overkill || 0);
  return Math.max(0, amount - overkill);
}

function sortRows(rows: any[], sort?: string): any[] {
  if (!sort) {
    return rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }

  const [fieldRaw, dirRaw] = sort.split(':');
  const field = (fieldRaw || '').trim();
  const dir = ((dirRaw || 'asc').trim().toLowerCase() === 'desc' ? -1 : 1);
  if (!field) throw new Error('Invalid --sort value. Expected <field[:asc|desc]>');

  const hasField = rows.length === 0 || rows.some((r) => field in (r || {}));
  if (!hasField) throw new Error(`Invalid --sort field: ${field}`);

  const norm = (v: any) => (v === null || v === undefined ? '' : v);
  const compare = (a: any, b: any) => {
    const av = norm(a?.[field]);
    const bv = norm(b?.[field]);

    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;

    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn) && String(av).trim() !== '' && String(bv).trim() !== '') {
      return (an - bn) * dir;
    }

    return String(av).localeCompare(String(bv)) * dir;
  };

  return rows.sort((a, b) => compare(a, b) || String(a.timestamp).localeCompare(String(b.timestamp)));
}

export function commandFightList(parsed: ParsedLog, options: CliOptions) {
  let fights = parsed.encounters.map((e) => e.info);
  if (options.encounter) {
    fights = resolveEncounters(parsed, options.encounter).map((e) => e.info);
  }
  if (options.fight) {
    fights = fights.filter((f) => f.fightId === options.fight);
  }
  return { semantics: semantics(!!options.enemyOnly), fights };
}

export function commandAbilityEvents(parsed: ParsedLog, options: CliOptions) {
  if (!options.ability) throw new Error('ability events requires --ability');
  const rows = applyFilters(parsed, options)
    .filter((e: any) => {
      if (!options.enemyOnly) return true;
      return isEnemyTarget(e);
    })
    .map((e: any) => toRow(e, !!options.normalized, effectiveDamage, !!options.rawLine));

  const sorted = sortRows(rows, options.sort);
  const paged = paginate(sorted, options);
  return {
    semantics: semantics(!!options.enemyOnly),
    rows: projectFields(paged as any, options.fields),
    count: rows.length,
  };
}

export function commandEventsSearch(parsed: ParsedLog, options: CliOptions) {
  const rows = applyFilters(parsed, options)
    .filter((e: any) => {
      if (!options.enemyOnly) return true;
      return isEnemyTarget(e);
    })
    .map((e: any) => toRow(e, true, effectiveDamage, !!options.rawLine));

  const sorted = sortRows(rows, options.sort);
  const paged = paginate(sorted, options);
  return {
    semantics: semantics(!!options.enemyOnly),
    rows: projectFields(paged as any, options.fields),
    count: rows.length,
  };
}

export function runCommand(parsed: ParsedLog, command: string[], options: CliOptions) {
  const [a, b] = command;
  if (a === 'fight' && b === 'list') return commandFightList(parsed, options);
  if (a === 'ability' && b === 'events') return commandAbilityEvents(parsed, options);
  if (a === 'events' && b === 'search') return commandEventsSearch(parsed, options);
  throw new Error(`Unknown command: ${command.join(' ')}`);
}

export function parseCliArgs(args: string[]): { command: string[]; options: CliOptions } {
  const command: string[] = [];
  const options: CliOptions = { format: 'json', compact: true, limit: 200, offset: 0 };

  let i = 0;
  while (i < args.length && !args[i].startsWith('-')) {
    command.push(args[i]);
    i++;
    if (command.length === 2) break;
  }

  while (i < args.length) {
    const k = args[i++];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const val = i < args.length && !args[i].startsWith('--') ? args[i++] : 'true';

    switch (key) {
      case 'input': options.input = val; break;
      case 'format': options.format = val as any; break;
      case 'compact': options.compact = true; break;
      case 'out': options.out = val; break;
      case 'limit': options.limit = Number(val); break;
      case 'offset': options.offset = Number(val); break;
      case 'sort': options.sort = val; break;
      case 'fields': options.fields = val.split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'encounter': options.encounter = val; break;
      case 'fight': options.fight = val; break;
      case 'player': options.player = val; break;
      case 'target': options.target = val; break;
      case 'ability': options.ability = val; break;
      case 'event-types': options.eventTypes = val.split(',').map((s) => s.trim()).filter(Boolean); break;
      case 'time-range': options.timeRange = val; break;
      case 'enemy-only': options.enemyOnly = true; break;
      case 'normalized': options.normalized = true; break;
      case 'raw-line': options.rawLine = true; break;
      default:
        break;
    }
  }

  return { command, options };
}

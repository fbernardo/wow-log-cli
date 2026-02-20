import { describe, it, expect } from 'vitest';
import { paginate, projectFields, semantics, formatResult } from '../../lib/cli/output';

describe('output helpers', () => {
  it('paginate slices rows', () => {
    const rows = [1,2,3,4,5];
    expect(paginate(rows, { offset: 1, limit: 2 })).toEqual([2,3]);
  });

  it('projectFields projects selected keys', () => {
    const rows = [{ a: 1, b: 2, c: 3 }];
    expect(projectFields(rows, ['a', 'c'])).toEqual([{ a: 1, c: 3 }]);
  });

  it('semantics returns fixed flags', () => {
    expect(semantics(true)).toEqual({
      enemyOnly: true,
      overkillCountsAsDamage: false,
      absorbedCountsAsDamage: true,
    });
  });

  it('formats jsonl from rows', () => {
    const txt = formatResult({ rows: [{ a: 1 }, { a: 2 }] }, 'jsonl', true);
    expect(txt).toBe('{"a":1}\n{"a":2}');
  });

  it('formats csv from rows', () => {
    const txt = formatResult({ rows: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }] }, 'csv', true);
    const lines = txt.split('\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,x');
    expect(lines[2]).toBe('2,y');
  });
});

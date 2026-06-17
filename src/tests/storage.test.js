import { describe, it, expect } from 'vitest';
import { safeParse, safeStringify } from '../utils/safeStorage.js';

describe('safeStorage', () => {
  it('safeParse returns fallback for null/undefined strings', () => {
    expect(safeParse(null, [])).toEqual([]);
    expect(safeParse('undefined', [])).toEqual([]);
    expect(safeParse('null', {})).toEqual({});
  });

  it('safeParse parses valid JSON', () => {
    const data = [{ id: 1 }];
    expect(safeParse(JSON.stringify(data), [])).toEqual(data);
  });

  it('safeParse returns fallback for invalid JSON', () => {
    expect(safeParse('not a json', [])).toEqual([]);
  });

  it('safeParse enforces type of fallback', () => {
    // If fallback is an array but parsed is an object, should return fallback
    expect(safeParse('{"id": 1}', [])).toEqual([]);
    // If fallback is an object but parsed is array, should return fallback
    expect(safeParse('[1,2,3]', {})).toEqual({});
  });

  it('safeStringify returns valid string or null on failure', () => {
    expect(safeStringify({a: 1})).toBe('{"a":1}');
    
    // Circular structure throws error in JSON.stringify
    const obj = {};
    obj.circular = obj;
    expect(safeStringify(obj)).toBeNull();
  });
});

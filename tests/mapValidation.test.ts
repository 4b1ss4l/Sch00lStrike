import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchoolMap, serializeSchoolMap, parseSchoolMap } from '../src/shared/mapValidator';
import { DEFAULT_SCHOOL_DUST_MAP } from '../src/shared/defaultMap';

test('default SCHOOL_DUST map passes full validation', () => {
  const result = validateSchoolMap(DEFAULT_SCHOOL_DUST_MAP);
  assert.equal(result.valid, true, `Validation errors: ${result.errors.join(', ')}`);
  assert.equal(result.errors.length, 0);
});

test('serialization and parsing preserve complete map integrity', () => {
  const jsonStr = serializeSchoolMap(DEFAULT_SCHOOL_DUST_MAP);
  const parsed = parseSchoolMap(jsonStr);
  assert.equal(parsed.success, true);
  assert.ok(parsed.data);
  assert.equal(parsed.data?.name, DEFAULT_SCHOOL_DUST_MAP.name);
  assert.equal(parsed.data?.spawns.length, DEFAULT_SCHOOL_DUST_MAP.spawns.length);
  assert.equal(parsed.data?.objects.length, DEFAULT_SCHOOL_DUST_MAP.objects.length);
  assert.equal(parsed.data?.objectives.length, DEFAULT_SCHOOL_DUST_MAP.objectives.length);
});

test('rejects map without sufficient spawns for both teams', () => {
  const invalidMap = {
    ...DEFAULT_SCHOOL_DUST_MAP,
    spawns: [
      { id: 'sp1', team: 'INSPECTORS', position: [0, 1, 0], yaw: 0, enabled: true },
    ],
  };
  const result = validateSchoolMap(invalidMap);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Spawns insuficientes')));
});

test('rejects overlapping spawns', () => {
  const overlappingMap = {
    ...DEFAULT_SCHOOL_DUST_MAP,
    spawns: [
      { id: 'sp1', team: 'INSPECTORS', position: [0, 1, 0], yaw: 0, enabled: true },
      { id: 'sp2', team: 'INSPECTORS', position: [0.2, 1, 0], yaw: 0, enabled: true },
      { id: 'sp3', team: 'REBELS', position: [10, 1, 10], yaw: 0, enabled: true },
      { id: 'sp4', team: 'REBELS', position: [15, 1, 10], yaw: 0, enabled: true },
    ],
  };
  const result = validateSchoolMap(overlappingMap);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('muito próximos')));
});

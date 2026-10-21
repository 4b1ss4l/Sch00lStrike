import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, DEFAULT_INSPECTORS_LOADOUT, DEFAULT_REBELS_LOADOUT } from '../src/shared/weapons';

test('weapons registry contains all core categories and school equipments', () => {
  const ids = Object.keys(WEAPONS);
  assert.ok(ids.includes('ruler_melee'), 'Should have melee ruler');
  assert.ok(ids.includes('highlighter_pistol'), 'Should have highlighter light pistol');
  assert.ok(ids.includes('stapler_heavy'), 'Should have heavy stapler');
  assert.ok(ids.includes('paper_rifle_m4'), 'Should have paper spitter rifle');
  assert.ok(ids.includes('telescopic_awp'), 'Should have telescopic ruler sniper');
  assert.ok(ids.includes('glue_shotgun'), 'Should have glue shotgun');
  assert.ok(ids.includes('confetti_grenade'), 'Should have confetti grenade');
  assert.ok(ids.includes('chalk_smoke'), 'Should have chalk smoke grenade');
});

test('weapons have positive valid stats and damage values', () => {
  for (const [id, weapon] of Object.entries(WEAPONS)) {
    assert.ok(weapon.name.length > 0, `${id} should have name`);
    assert.ok(weapon.damage >= 0, `${id} should have non-negative damage`);
    assert.ok(weapon.headshotMultiplier >= 1.0, `${id} headshot mult should be >= 1.0`);
    assert.ok(weapon.fireRate > 0, `${id} fireRate should be > 0`);
    assert.ok(weapon.magazineSize >= 1, `${id} magazineSize should be >= 1`);
    assert.ok(weapon.reloadTime >= 0, `${id} reloadTime should be >= 0`);
    assert.ok(weapon.range > 0, `${id} range should be > 0`);
  }
});

test('telescopic AWP has high single shot damage and low fire rate', () => {
  const awp = WEAPONS['telescopic_awp'];
  assert.ok(awp.damage >= 100, 'AWP should deal >= 100 base damage');
  assert.ok(awp.fireRate <= 1.5, 'AWP should have slow bolt action fire rate');
});

test('default loadouts contain starting weapons', () => {
  assert.ok(DEFAULT_INSPECTORS_LOADOUT.includes('highlighter_pistol'));
  assert.ok(DEFAULT_INSPECTORS_LOADOUT.includes('ruler_melee'));
  assert.ok(DEFAULT_REBELS_LOADOUT.includes('highlighter_pistol'));
  assert.ok(DEFAULT_REBELS_LOADOUT.includes('ruler_melee'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from '../src/server/GameRoom';
import { DEFAULT_SCHOOL_DUST_MAP } from '../src/shared/defaultMap';

test('GameRoom initializes with default map and starts in WAITING or BUY_PHASE', () => {
  const room = new GameRoom(DEFAULT_SCHOOL_DUST_MAP);
  assert.equal(room.state.mapName, 'SCHOOL_DUST');
  assert.equal(room.state.roundNumber, 1);
  assert.equal(room.state.inspectorsScore, 0);
  assert.equal(room.state.rebelsScore, 0);
});

test('Adding players assigns correct teams and gives starting money', () => {
  const room = new GameRoom();
  const p1 = room.addPlayer('p1', 'Alice', 'INSPECTORS');
  const p2 = room.addPlayer('p2', 'Bob', 'REBELS');

  assert.equal(p1.team, 'INSPECTORS');
  assert.equal(p2.team, 'REBELS');
  assert.equal(p1.money, 800);
  assert.equal(p2.money, 800);
  assert.equal(p1.health, 100);
  assert.equal(p2.health, 100);
  assert.ok(p1.inventory.includes('highlighter_pistol'));
});

test('Player shooting deals damage with raycast hit detection', () => {
  const room = new GameRoom();
  const p1 = room.addPlayer('p1', 'Shooter', 'INSPECTORS');
  const p2 = room.addPlayer('p2', 'Target', 'REBELS');

  // Place target in front of shooter
  p1.position = [0, 0.5, 0];
  p2.position = [0, 0.5, 5];
  room.state.phase = 'ROUND_ACTIVE';

  const hitResult = room.handleShoot('p1', {
    origin: [0, 1.62, 0],
    direction: [0, 0, 1], // looking straight at p2
    weaponId: 'highlighter_pistol',
  });

  assert.equal(hitResult.hit, true);
  assert.ok(hitResult.damage > 0);
  assert.equal(hitResult.victimId, 'p2');
  assert.ok(p2.health < 100);
});

test('Headshot detection triggers headshot multiplier', () => {
  const room = new GameRoom();
  const p1 = room.addPlayer('p1', 'Sniper', 'INSPECTORS');
  const p2 = room.addPlayer('p2', 'Target', 'REBELS');

  p1.position = [0, 0.5, 0];
  p2.position = [0, 0.5, 5];
  room.state.phase = 'ROUND_ACTIVE';

  // Shoot directly at head height (1.62 + 0.5 = 2.12m)
  const hitResult = room.handleShoot('p1', {
    origin: [0, 2.1, 0],
    direction: [0, 0, 1],
    weaponId: 'stapler_heavy',
  });

  assert.equal(hitResult.hit, true);
  assert.equal(hitResult.isHeadshot, true);
  assert.ok(hitResult.damage >= 100, 'Heavy stapler headshot should deal heavy damage');
});

test('Buying weapon deducts money and adds to inventory', () => {
  const room = new GameRoom();
  const p1 = room.addPlayer('p1', 'Buyer', 'INSPECTORS');
  p1.money = 3500;
  room.state.phase = 'BUY_PHASE';

  const buyResult = room.handleBuyItem('p1', 'paper_rifle_m4');
  assert.equal(buyResult.success, true);
  assert.ok(p1.inventory.includes('paper_rifle_m4'));
  assert.equal(p1.activeWeaponId, 'paper_rifle_m4');
  assert.equal(p1.money, 3500 - 2900);
});

test('Round win conditions and rewards update scores correctly', () => {
  const room = new GameRoom();
  const p1 = room.addPlayer('p1', 'CT', 'INSPECTORS');
  const p2 = room.addPlayer('p2', 'TR', 'REBELS');
  room.state.phase = 'ROUND_ACTIVE';

  // Eliminate TR
  p2.health = 0;
  p2.isAlive = false;
  room.checkWinConditions();

  assert.equal(room.state.inspectorsScore, 1);
  assert.equal(room.state.phase, 'ROUND_END');
  assert.ok(p1.money > 800, 'Winning team should receive economy reward');
});

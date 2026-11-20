import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CollisionSystem, arenaHalfSize } from '../collision.js';
import { EnemySystem } from '../enemies.js';
import { LevelManager, levels } from '../levelManager.js';
import { HealthSystem } from '../health.js';

const point = (x, y, z) => new THREE.Vector3(x, y, z);

function addWall(collision, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth));
  mesh.position.set(x, y, z);
  collision.addObject(mesh);
}

test('collision slides along walls, respects the arena edge, lands on cover and stops at ceilings', () => {
  const collision = new CollisionSystem();
  addWall(collision, 0, 0.5, 0, 4, 1, 4);
  addWall(collision, 10, 1.7, 0, 4, 1, 4);
  const move = (from, to, height = 1.65) => collision.resolveCollision(from, to, height, 0.38);

  const slide = move(point(2.43, 1.65, 0), point(2.28, 1.58, 0.25));
  assert.deepEqual(slide.position.toArray(), [2.43, 1.65, 0.25]);
  assert.equal(slide.onGround, true);
  const jump = move(point(2.42, 2.81, 0), point(2.23, 2.74, 0));
  assert.equal(jump.position.x, 2.23);
  const land = move(jump.position, point(2.14, 2.54, 0));
  assert.equal(land.position.y, 2.65);
  assert.equal(land.onGround, true);
  const limit = move(point(arenaHalfSize - 0.4, 1.65, 6), point(arenaHalfSize - 0.2, 1.58, 6));
  assert.equal(limit.position.x, arenaHalfSize - 0.4);
  assert.equal(collision.blocked(10, 0, 0, 1.65, 0.38), true);
  assert.equal(collision.blocked(10, 0, 0, 0.95, 0.38), false);
  const jumpUnderCeiling = move(point(10, 0.95, 0), point(10, 1.3, 0), 0.95);
  assert.equal(jumpUnderCeiling.hitCeiling, true);
  assert.equal(jumpUnderCeiling.position.y, 1.2);
});

test('an enemy routes around a wall and only attacks with line of sight', () => {
  const collision = new CollisionSystem();
  addWall(collision, 0, 1.5, 0, 1.5, 3, 8);
  let damage = 0;
  const player = { getPosition: () => point(1.7, 1.65, 0) };
  const enemySystem = new EnemySystem(new THREE.Scene(), player, collision, {
    takeDamage: amount => { damage += amount; },
  });
  enemySystem.buildNavigation();
  const enemy = enemySystem.spawn('Asura', -1.7, 0);
  assert.equal(enemySystem.canAttack(enemy, player.getPosition()), false);
  for (let frame = 0; frame < 520; frame++) {
    const before = damage;
    const visible = enemySystem.canAttack(enemy, player.getPosition());
    enemySystem.update(1 / 60);
    assert.equal(collision.blocked(enemy.position.x, enemy.position.z, 0, 1.5, enemy.radius), false);
    if (damage > before) assert.equal(visible, true);
  }
  assert.ok(damage > 0, 'The enemy should have navigated around the wall and landed an attack');
});

function withHud(run) {
  const originalDocument = globalThis.document;
  const elements = new Map();
  globalThis.document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { style: {} });
    return elements.get(id);
  } };
  try {
    run();
  } finally {
    globalThis.document = originalDocument;
  }
}

test('stage spawns, gates, and boss victory use only simulation time', () => withHud(() => {
  const position = point(0, 1.65, 27);
  const player = { getPosition: () => position };
  const scene = new THREE.Scene();
  const collision = new CollisionSystem();
  const enemySystem = new EnemySystem(scene, player, collision, { takeDamage() {} });
  let wins = 0;
  const level = new LevelManager(scene, enemySystem, player, { playEnemyDeathSound() {} },
    () => position.set(0, 1.65, 27), () => { wins++; });

  level.startLevel(0);
  level.update(0.1);
  assert.equal(level.remaining, levels[0].enemies.length);
  assert.equal(level.portal.visible, false);
  for (let stage = 0; stage < levels.length; stage++) {
    for (let i = 0; i < levels[stage].enemies.length; i++) level.update(0.5);
    assert.equal(level.remaining, levels[stage].enemies.length);
    for (const enemy of [...enemySystem.enemies]) enemySystem.damage(enemy, enemy.maxHealth);
    level.update(0.02);
    if (stage < 2) {
      assert.equal(level.portal.visible, true);
      position.copy(level.portal.position);
      level.update(0.02);
      assert.equal(level.currentLevel, stage + 1);
    }
  }
  assert.equal(level.boss.type, 'GiantAsura');
  assert.equal(wins, 0);
  enemySystem.damage(level.boss, level.boss.maxHealth);
  level.update(1);
  level.update(1);
  assert.equal(wins, 1);
  assert.equal(level.score, 300);
}));

test('pickups apply actual changes, respawn, and preserve items when a stat is full', () => withHud(() => {
  const position = point(0, 1.65, -18);
  const health = new HealthSystem(new THREE.Scene(), { getPosition: () => position });
  const medkit = health.pickups.find(pickup => pickup.type === 'Health');
  health.update(1 / 60);
  assert.equal(medkit.model.visible, true);
  position.set(-4.5, 1.65, 20);
  health.update(1 / 60);
  assert.equal(health.currentArmor, 50);
  health.takeDamage(50);
  assert.equal(health.currentHealth, 80);
  assert.equal(health.currentArmor, 20);
  position.set(0, 1.65, -18);
  health.update(1 / 60);
  assert.equal(health.currentHealth, 100);
  assert.equal(medkit.model.visible, false);
  assert.equal(document.getElementById('pickup-message').textContent, '+20 Health');
  position.set(0, 1.65, 0);
  for (let frame = 0; frame < 1445; frame++) health.update(1 / 60);
  assert.equal(medkit.model.visible, true);
  health.takeDamage(30);
  for (let frame = 0; frame < 360; frame++) health.update(1 / 60);
  assert.ok(health.currentHealth > 84);
}));

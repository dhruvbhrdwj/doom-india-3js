import * as THREE from 'three';
import { arenaHalfSize } from './collision.js';

const spacing = 2;
const gridWidth = arenaHalfSize * 2 / spacing - 1;
const gridOrigin = -arenaHalfSize + spacing;
const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const regularRadius = 0.62;
const bossRadius = 1.8;

export class EnemySystem {
  constructor(scene, player, collision, health) {
    this.scene = scene;
    this.player = player;
    this.collision = collision;
    this.health = health;
    this.enemies = [];
    this.hitMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcf9f, emissive: 0xff643b, emissiveIntensity: 1.3,
    });
    this.shadowGeometry = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a1814, transparent: true, opacity: 0.38, depthWrite: false,
    });
    this.types = {
      Rakshasa: { health: 86, speed: 4.5, damage: 18, range: 2.3, cooldown: 1.15, aimHeight: 1.2,
        template: this.createRakshasaModel(), animate: this.updateRakshasaAnimation },
      Asura: { health: 126, speed: 3.1, damage: 26, range: 2.8, cooldown: 1.45, aimHeight: 1.45,
        template: this.createAsuraModel(), animate: this.updateAsuraAnimation },
      Naga: { health: 65, speed: 5.2, damage: 14, range: 2.1, cooldown: 0.95, aimHeight: 1.1,
        template: this.createNagaModel(), animate: this.updateNagaAnimation },
      GiantAsura: { health: 620, speed: 5.0, damage: 42, range: 4.3, cooldown: 2.0, aimHeight: 2.6,
        template: this.createGiantDemonModel(), animate: this.updateBossAnimation },
    };
    this.raycaster = new THREE.Raycaster();
  }

  buildNavigation() {
    this.routes = [regularRadius, bossRadius].map(radius => {
      const positions = Array.from({ length: gridWidth ** 2 }, (_, index) => new THREE.Vector3(
        gridOrigin + (index % gridWidth) * spacing, 0, gridOrigin + Math.floor(index / gridWidth) * spacing,
      ));
      const walls = this.collision.bounds.filter(box => box.min.y < 0.7).map(box =>
        box.clone().expandByVector(new THREE.Vector3(radius + 0.06, 0, radius + 0.06)));
      const edges = positions.map(({ x, z }, index) => {
        if (this.collision.blocked(x, z, 0, 1.6, radius + 0.1)) return null;
        const col = index % gridWidth;
        const row = Math.floor(index / gridWidth);
        return neighbours.flatMap(([dx, dz]) => {
          if (col + dx < 0 || col + dx >= gridWidth || row + dz < 0 || row + dz >= gridWidth) return [];
          return this.collision.blocked(x + dx, z + dz, 0, 1.6, radius + 0.1) ? [] :
            [index + dx + dz * gridWidth];
        });
      });
      return { radius, positions, edges, walls, target: -1, distance: new Int16Array(positions.length) };
    });
  }

  gridIndex(position) {
    const cell = value => THREE.MathUtils.clamp(Math.round((value - gridOrigin) / spacing), 0, gridWidth - 1);
    return cell(position.x) + cell(position.z) * gridWidth;
  }

  updateRoute(route, goal) {
    let target = this.gridIndex(goal);
    if (!route.edges[target]) {
      let best = Infinity;
      route.positions.forEach((position, index) => {
        if (!route.edges[index]) return;
        const distance = position.distanceToSquared(goal);
        if (distance < best) {
          best = distance;
          target = index;
        }
      });
    }
    if (route.target === target) return;
    route.target = target;
    route.distance.fill(-1);
    route.distance[target] = 0;
    const queue = [target];
    for (let i = 0; i < queue.length; i++) {
      const index = queue[i];
      for (const next of route.edges[index]) {
        if (!route.edges[next] || route.distance[next] >= 0) continue;
        route.distance[next] = route.distance[index] + 1;
        queue.push(next);
      }
    }
  }

  pathClear(from, to, route) {
    const origin = new THREE.Vector3(from.x, 0.35, from.z);
    const destination = new THREE.Vector3(to.x, 0.35, to.z);
    const direction = destination.sub(origin);
    const length = direction.length();
    const ray = new THREE.Ray(origin, direction.normalize());
    const intersection = new THREE.Vector3();
    return !route.walls.some(box => box.containsPoint(origin) ||
      (ray.intersectBox(box, intersection) && origin.distanceToSquared(intersection) < length ** 2));
  }

  spawn(type, x, z) {
    const definition = this.types[type];
    const model = definition.template.clone();
    const isBoss = type === 'GiantAsura';
    if (isBoss) {
      const aura = model.children.at(-1);
      aura.material = aura.material.clone();
    }
    const parts = [];
    model.traverse(mesh => {
      if (mesh.isMesh && mesh.userData.isEnemyPart) parts.push([mesh, mesh.material]);
    });
    const radius = isBoss ? bossRadius : regularRadius;
    const shadow = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    shadow.scale.setScalar(radius * 1.3);
    shadow.renderOrder = 1;
    const enemy = {
      type, ...definition, maxHealth: definition.health, model, parts, shadow, radius, isBoss,
      position: new THREE.Vector3(x, 0, z),
      state: 'chasing', cooldownLeft: 0.4, windup: 0, flash: 0, death: 0
    };
    model.position.copy(enemy.position);
    shadow.position.set(x, 0.019, z);
    for (const [mesh] of parts) mesh.userData.enemy = enemy;
    this.scene.add(model, shadow);
    model.updateMatrixWorld(true);
    this.enemies.push(enemy);
    return enemy;
  }

  damage(enemy, amount) {
    if (enemy.state === 'dying') return false;
    enemy.health = Math.max(0, enemy.health - amount);
    enemy.flash = 0.085;
    for (const [mesh] of enemy.parts) mesh.material = this.hitMaterial;
    if (enemy.health === 0) {
      enemy.state = 'dying';
      enemy.onDeath?.(enemy);
    }
    return true;
  }

  getEnemyHitboxes() {
    return this.enemies.flatMap(enemy => enemy.state === 'dying' ? [] : enemy.parts.map(([mesh]) => mesh));
  }

  clearAllEnemies() {
    for (const enemy of this.enemies) this.removeModel(enemy);
    this.enemies.length = 0;
  }

  removeModel(enemy) {
    this.scene.remove(enemy.model, enemy.shadow);
    if (enemy.isBoss) enemy.model.children.at(-1).material.dispose();
  }

  canAttack(enemy, target) {
    const origin = enemy.position.clone();
    origin.y = enemy.aimHeight;
    const direction = target.clone().sub(origin);
    this.raycaster.far = direction.length();
    this.raycaster.set(origin, direction.normalize());
    return this.raycaster.intersectObjects(this.collision.collidableObjects, false).length === 0;
  }

  chase(enemy, goal, delta) {
    const route = this.routes[Number(enemy.isBoss)];
    let waypoint = goal;
    if (!this.pathClear(enemy.position, goal, route)) {
      const cell = this.gridIndex(enemy.position);
      const candidates = new Set([cell]);
      for (const [dx, dz] of neighbours) {
        const index = cell + dx + dz * gridWidth;
        if (index >= 0 && index < route.positions.length) candidates.add(index);
      }
      const next = [...candidates]
        .filter(index => route.distance[index] >= 0 &&
          route.positions[index].distanceToSquared(enemy.position) > 0.03 &&
          this.pathClear(enemy.position, route.positions[index], route))
        .sort((a, b) => route.distance[a] - route.distance[b])[0];
      if (next === undefined) return;
      waypoint = route.positions[next];
    }

    const direction = new THREE.Vector3(waypoint.x - enemy.position.x, 0, waypoint.z - enemy.position.z);
    const enraged = enemy.isBoss && enemy.health <= enemy.maxHealth / 2;
    const step = Math.min(enemy.speed * (enraged ? 1.4 : 1) * delta, direction.length());
    direction.normalize();
    for (const other of this.enemies) {
      if (other === enemy || other.state === 'dying') continue;
      const offset = enemy.position.clone().sub(other.position);
      const distance = offset.length();
      const separation = enemy.radius + other.radius + 0.35;
      if (distance > 0 && distance < separation) {
        direction.addScaledVector(offset, (separation - distance) / (separation * distance));
      }
    }
    direction.normalize();
    const { position, radius } = enemy;
    const x = position.x + direction.x * step;
    const z = position.z + direction.z * step;
    if (!this.collision.blocked(x, position.z, 0, 1.5, radius)) position.x = x;
    if (!this.collision.blocked(position.x, z, 0, 1.5, radius)) position.z = z;
  }

  update(delta) {
    const target = this.player.getPosition();
    if (this.enemies.length === 0) return;
    for (const route of this.routes) this.updateRoute(route, target);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.flash > 0) {
        enemy.flash -= delta;
        if (enemy.flash <= 0) {
          for (const [mesh, material] of enemy.parts) mesh.material = material;
        }
      }
      if (enemy.state === 'dying') {
        enemy.death += delta;
        const duration = enemy.isBoss ? 0.85 : 0.38;
        enemy.model.scale.setScalar(Math.max(0, 1 - enemy.death / duration));
        enemy.shadow.scale.copy(enemy.model.scale).multiplyScalar(enemy.radius * 1.3);
        if (enemy.death >= duration) {
          this.removeModel(enemy);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      enemy.cooldownLeft -= delta;
      const distance = Math.hypot(target.x - enemy.position.x, target.z - enemy.position.z);
      const inRange = distance < enemy.range && target.y < (enemy.isBoss ? 4 : 2.55);
      const canAttack = inRange && this.canAttack(enemy, target);
      if (enemy.windup > 0) {
        enemy.windup -= delta;
        if (enemy.windup <= 0 && canAttack) this.health.takeDamage(enemy.damage);
      } else if (canAttack) {
        if (enemy.cooldownLeft <= 0) {
          enemy.windup = enemy.isBoss ? 0.56 : 0.26;
          enemy.cooldownLeft = enemy.cooldown;
        }
      } else {
        this.chase(enemy, target, delta);
      }
      enemy.state = canAttack || enemy.windup > 0 ? 'attacking' : 'chasing';
      enemy.model.position.copy(enemy.position);
      enemy.shadow.position.set(enemy.position.x, 0.019, enemy.position.z);
      enemy.model.rotation.y = Math.atan2(target.x - enemy.position.x, target.z - enemy.position.z);
      enemy.model.rotation.x = enemy.windup > 0 ? -0.19 : 0;
      enemy.animate(enemy, delta);
      enemy.model.updateMatrixWorld();
    }
  }

  updateBossAnimation(enemy, delta) {
    const state = enemy.model.userData.animationState;
    state.walkTime += delta * 6;
    const [body, , , , leftArm, rightArm] = enemy.model.children;
    body.position.y = 2.28 + Math.sin(state.walkTime) * 0.08;
    const aura = enemy.model.children.at(-1);
    aura.material.opacity = enemy.health <= enemy.maxHealth / 2 ? 0.22 + Math.sin(state.walkTime * 2) * 0.09 : 0.075;
    const swing = enemy.windup > 0 ? -1.2 : Math.sin(state.walkTime) * 0.22;
    leftArm.rotation.x = swing;
    rightArm.rotation.x = enemy.windup > 0 ? swing : -swing;
  }
  createRakshasaModel() {
    const enemy = new THREE.Group();
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.3, 1.8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    body.userData.isEnemyPart = true; // Mark for raycasting
    enemy.add(body);

    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A, roughness: 0.7, metalness: 0.3 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.0;
    head.userData.isEnemyPart = true;
    enemy.add(head);

    // Horns
    const hornGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
    const hornMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.5, metalness: 0.5 });
    const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    leftHorn.position.set(-0.25, 2.2, 0);
    leftHorn.rotation.z = -Math.PI / 6;
    leftHorn.userData.isEnemyPart = true;
    enemy.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    rightHorn.position.set(0.25, 2.2, 0);
    rightHorn.rotation.z = Math.PI / 6;
    rightHorn.userData.isEnemyPart = true;
    enemy.add(rightHorn);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7, metalness: 0.3 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 1.2, 0);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.userData.isEnemyPart = true;
    enemy.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.userData.isEnemyPart = true;
    enemy.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7, metalness: 0.3 });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, 0.5, 0); // Adjusted leg position slightly
    leftLeg.userData.isEnemyPart = true;
    enemy.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, 0.5, 0); // Adjusted leg position slightly
    rightLeg.userData.isEnemyPart = true;
    enemy.add(rightLeg);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Yellow
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 2.1, 0.3);
    leftEye.userData.isEnemyPart = true;
    enemy.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 2.1, 0.3);
    rightEye.userData.isEnemyPart = true;
    enemy.add(rightEye);


    enemy.userData.animationState = { walkTime: 0, attackTime: 0, isAttacking: false };
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    enemy.children.forEach(child => {
        child.castShadow = true;
        // child.receiveShadow = true; // Usually not needed on small parts
    });

    return enemy;
  }

  createAsuraModel() {
    const enemy = new THREE.Group();
    const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.4, 2.0, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4, roughness: 0.7, metalness: 0.5 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    body.userData.isEnemyPart = true;
    enemy.add(body);

    const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEFA, roughness: 0.7, metalness: 0.5 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.userData.isEnemyPart = true;
    enemy.add(head);

    // Crown
    const crownGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8);
    const crownMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.8 });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = 2.5;
    crown.userData.isEnemyPart = true;
    enemy.add(crown);

    // Multiple arms (4 pairs)
    const armGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4, roughness: 0.7, metalness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const height = 1.0 + i * 0.3;
      const angle = i * Math.PI / 8;
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.7, height, 0);
      leftArm.rotation.z = Math.PI / 4 + angle;
      leftArm.userData.isEnemyPart = true;
      enemy.add(leftArm);
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.7, height, 0);
      rightArm.rotation.z = -Math.PI / 4 - angle;
      rightArm.userData.isEnemyPart = true;
      enemy.add(rightArm);
    }

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4, roughness: 0.7, metalness: 0.5 });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.4, 0.6, 0); // Adjusted leg position
    leftLeg.userData.isEnemyPart = true;
    enemy.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.4, 0.6, 0); // Adjusted leg position
    rightLeg.userData.isEnemyPart = true;
    enemy.add(rightLeg);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 2.3, 0.4);
    leftEye.userData.isEnemyPart = true;
    enemy.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 2.3, 0.4);
    rightEye.userData.isEnemyPart = true;
    enemy.add(rightEye);


    enemy.userData.animationState = { walkTime: 0, attackTime: 0, isAttacking: false };
    enemy.castShadow = true;
    enemy.receiveShadow = true;
    enemy.children.forEach(child => {
        child.castShadow = true;
        // child.receiveShadow = true;
    });

    return enemy;
  }

  createNagaModel() {
    const enemy = new THREE.Group();
    const segments = 8;
    const segmentHeight = 0.25;
    const bodyRadius = 0.3;

    for (let i = 0; i < segments; i++) {
      const segmentGeometry = new THREE.SphereGeometry(bodyRadius - (i * 0.02), 8, 8);
      const segmentMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00, roughness: 0.7, metalness: 0.3 });
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
      segment.position.y = i * segmentHeight + bodyRadius - (i * 0.02); // Place bottom on ground
      segment.userData.isEnemyPart = true;
      segment.userData.segmentIndex = i; // For animation
      enemy.add(segment);
    }

    const torsoY = (segments -1) * segmentHeight + (bodyRadius - ((segments -1) * 0.02)) + 0.5; // Top of last segment + half torso height
    const torsoGeometry = new THREE.CylinderGeometry(0.4, 0.3, 1.0, 8);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32, roughness: 0.7, metalness: 0.3 });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = torsoY;
    torso.userData.isEnemyPart = true;
    enemy.add(torso);

    const headY = torsoY + 0.7; // Torso top + half head height
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32, roughness: 0.7, metalness: 0.3 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = headY;
    head.userData.isEnemyPart = true;
    enemy.add(head);

    // Snake hood
    const hoodGeometry = new THREE.SphereGeometry(0.6, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hoodMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.y = headY;
    hood.position.z = -0.1; // Slightly behind head
    hood.rotation.x = Math.PI;
    hood.userData.isEnemyPart = true;
    enemy.add(hood);

    // Arms
    const armY = torsoY + 0.3; // Middle of torso
    const armGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32, roughness: 0.7, metalness: 0.3 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, armY, 0);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.userData.isEnemyPart = true;
    enemy.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, armY, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.userData.isEnemyPart = true;
    enemy.add(rightArm);

    // Eyes
    const eyeY = headY + 0.1;
    const eyeZ = 0.3;
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, eyeY, eyeZ);
    leftEye.userData.isEnemyPart = true;
    enemy.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, eyeY, eyeZ);
    rightEye.userData.isEnemyPart = true;
    enemy.add(rightEye);



    enemy.userData.animationState = { walkTime: 0, attackTime: 0, isAttacking: false, slitherTime: 0 };
    enemy.castShadow = true;
    enemy.receiveShadow = true; // Base segments receive shadow
     enemy.children.forEach(child => {
        child.castShadow = true;
        // child.receiveShadow = true;
    });

    return enemy;
  }

  // Giant Asura model
  createGiantDemonModel() {
    const boss = new THREE.Group();
    const scale = 1.14;

    // Massive body
    const bodyGeometry = new THREE.CylinderGeometry(1.5 * scale, 1.0 * scale, 4.0 * scale, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A0000, // Dark blood red
      roughness: 0.6,
      metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.0 * scale;
    body.userData.isEnemyPart = true;
    boss.add(body);

    // Massive head
    const headGeometry = new THREE.SphereGeometry(1.0 * scale, 12, 12);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x660000,
      roughness: 0.5,
      metalness: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 4.5 * scale;
    head.userData.isEnemyPart = true;
    boss.add(head);

    // Giant horns
    const hornGeometry = new THREE.ConeGeometry(0.3 * scale, 1.5 * scale, 8);
    const hornMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A1A1A,
      roughness: 0.3,
      metalness: 0.7
    });

    const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    leftHorn.position.set(-0.7 * scale, 5.2 * scale, 0);
    leftHorn.rotation.z = -Math.PI / 5;
    leftHorn.userData.isEnemyPart = true;
    boss.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    rightHorn.position.set(0.7 * scale, 5.2 * scale, 0);
    rightHorn.rotation.z = Math.PI / 5;
    rightHorn.userData.isEnemyPart = true;
    boss.add(rightHorn);

    // Massive arms
    const armGeometry = new THREE.CylinderGeometry(0.4 * scale, 0.5 * scale, 2.5 * scale, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A0000,
      roughness: 0.6,
      metalness: 0.4
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-1.8 * scale, 2.5 * scale, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.userData.isEnemyPart = true;
    boss.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(1.8 * scale, 2.5 * scale, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.userData.isEnemyPart = true;
    boss.add(rightArm);

    // Thick legs
    const legGeometry = new THREE.CylinderGeometry(0.5 * scale, 0.6 * scale, 2.0 * scale, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x4A0000,
      roughness: 0.6,
      metalness: 0.4
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.8 * scale, 1.0 * scale, 0);
    leftLeg.userData.isEnemyPart = true;
    boss.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.8 * scale, 1.0 * scale, 0);
    rightLeg.userData.isEnemyPart = true;
    boss.add(rightLeg);

    // Glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.2 * scale, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4 * scale, 4.6 * scale, 0.8 * scale);
    leftEye.userData.isEnemyPart = true;
    boss.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4 * scale, 4.6 * scale, 0.8 * scale);
    rightEye.userData.isEnemyPart = true;
    boss.add(rightEye);

    // Add glowing aura effect
    const auraGeometry = new THREE.SphereGeometry(2.5 * scale, 16, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.position.y = 2.5 * scale;
    boss.add(aura);


    boss.userData.animationState = {
      walkTime: 0,
      attackTime: 0,
      isAttacking: false,
      chargeTime: 0,
      isCharging: false,
      slamTime: 0,
      isSlaming: false
    };
    boss.castShadow = true;
    boss.receiveShadow = true;
    boss.children.forEach(child => {
      child.castShadow = true;
    });

    return boss;
  }

  updateRakshasaAnimation(enemy, deltaTime) {
    const state = enemy.model.userData.animationState;
    const body = enemy.model.children[0]; // Assuming body is the first child
    const leftArm = enemy.model.children[4]; // Indices might need adjustment
    const rightArm = enemy.model.children[5];
    const leftLeg = enemy.model.children[6];
    const rightLeg = enemy.model.children[7];

    // Avoid animation if dying or attacking (attack animation handled elsewhere)
     if (enemy.state === 'dying' || state.isAttacking) return;


    if (enemy.state === 'chasing') {
        state.walkTime += deltaTime * enemy.speed * 1.5; // Adjust speed multiplier as needed
        // Bobbing motion
        body.position.y = 0.9 + Math.sin(state.walkTime) * 0.1;
        // Basic arm/leg swing (opposite directions)
        if(leftArm) leftArm.rotation.x = Math.sin(state.walkTime) * 0.5;
        if(rightArm) rightArm.rotation.x = -Math.sin(state.walkTime) * 0.5;
        if(leftLeg) leftLeg.rotation.x = -Math.sin(state.walkTime) * 0.6;
        if(rightLeg) rightLeg.rotation.x = Math.sin(state.walkTime) * 0.6;
    } else { // Idle state
        // Return to default pose smoothly? Or snap back.
         body.position.y += (0.9 - body.position.y) * 0.1; // Smooth return
         if(leftArm) leftArm.rotation.x += (0 - leftArm.rotation.x) * 0.1;
         if(rightArm) rightArm.rotation.x += (0 - rightArm.rotation.x) * 0.1;
         if(leftLeg) leftLeg.rotation.x += (0 - leftLeg.rotation.x) * 0.1;
         if(rightLeg) rightLeg.rotation.x += (0 - rightLeg.rotation.x) * 0.1;
    }
  }

    updateAsuraAnimation(enemy, deltaTime) {
        const state = enemy.model.userData.animationState;
        const body = enemy.model.children[0];

         if (enemy.state === 'dying' || state.isAttacking) return;

        if (enemy.state === 'chasing') {
            state.walkTime += deltaTime * enemy.speed * 1.2;
            body.position.y = 1.0 + Math.sin(state.walkTime) * 0.05; // Subtle bob

            // Animate arms (e.g., wave them menacingly)
            const armStartIndex = 3; // Index of first arm pair
            for(let i = 0; i < 4; i++) {
                const leftArm = enemy.model.children[armStartIndex + i*2];
                const rightArm = enemy.model.children[armStartIndex + i*2 + 1];
                if(leftArm) leftArm.rotation.x = Math.sin(state.walkTime + i*0.5) * 0.3;
                if(rightArm) rightArm.rotation.x = Math.sin(state.walkTime + i*0.5) * 0.3;
            }
        } else { // Idle
             body.position.y += (1.0 - body.position.y) * 0.1; // Smooth return
             // Reset arm rotations smoothly
             const armStartIndex = 3;
             for(let i = 0; i < 4; i++) {
                const leftArm = enemy.model.children[armStartIndex + i*2];
                const rightArm = enemy.model.children[armStartIndex + i*2 + 1];
                if(leftArm) leftArm.rotation.x += (0 - leftArm.rotation.x) * 0.1;
                if(rightArm) rightArm.rotation.x += (0 - rightArm.rotation.x) * 0.1;
            }
        }
    }

    updateNagaAnimation(enemy, deltaTime) {
        const state = enemy.model.userData.animationState;
        const segments = 8; // Number of tail sections

         if (enemy.state === 'dying' || state.isAttacking) return;

        if (enemy.state === 'chasing') {
            state.slitherTime += deltaTime * enemy.speed * 2.0;

            // Slithering motion for lower body segments
            enemy.model.children.forEach(child => {
                if (child.userData.isEnemyPart && child.userData.segmentIndex !== undefined) {
                    const i = child.userData.segmentIndex;
                     // Apply sine wave offset in X based on height (index) and time
                    const offsetX = Math.sin(state.slitherTime + i * 0.8) * 0.15 * (1 - i / segments); // Dampen effect higher up
                    child.position.x = offsetX;
                }
            });

             // Maybe slight torso rotation or bob
             const torso = enemy.model.children[segments]; // Torso is after segments
             if(torso) torso.rotation.y = Math.sin(state.slitherTime * 0.5) * 0.1;


        } else { // Idle
             // Reset segment positions and torso rotation smoothly
             enemy.model.children.forEach(child => {
                if (child.userData.isEnemyPart && child.userData.segmentIndex !== undefined) {
                     child.position.x += (0 - child.position.x) * 0.1; // Smooth return
                }
             });
             const torso = enemy.model.children[segments];
             if(torso) torso.rotation.y += (0 - torso.rotation.y) * 0.1; // Smooth return
        }
    }


}

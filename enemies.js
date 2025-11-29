import * as THREE from 'three';
// Assuming GLTFLoader might be used later for more complex models
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Enemy AI and game logic
export class EnemySystem {
  constructor(scene, player, weaponSystem, collisionSystem, healthSystem) { // Added healthSystem for player damage
    this.scene = scene;
    this.player = player; // Assumes player has a 'position' (THREE.Vector3) and potentially other methods/properties
    this.weaponSystem = weaponSystem; // Needed for checking hits on enemies? Passed but not used directly in provided code.
    this.collisionSystem = collisionSystem; // Assumes it has methods like 'add(object)' and 'remove(object)' for collision checks
    this.healthSystem = healthSystem; // Assumes it has a method to apply damage to the player e.g., 'playerTakeDamage(amount)'

    // Enemy state
    this.enemies = [];
    this.maxEnemies = 10;
    this.spawnPoints = [];
    this.difficultyLevel = 1;
    this.killCount = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 5; // Seconds between potential spawns
    this.chaseThreshold = 50; // Distance at which enemies start chasing
    this.idleThreshold = 60; // Distance at which enemies stop chasing and go idle

    // Enemy models
    this.enemyTypes = [
      {
        name: 'Rakshasa',
        health: 100,
        damage: 20,
        speed: 3,
        attackRange: 5, // Increased range for basic AI
        attackRate: 1.5, // Attacks per second (means 1 attack every 1/1.5 = 0.67s)
        model: this.createRakshasaModel(),
        spawnWeight: 1,
        animationUpdate: this.updateRakshasaAnimation,
        height: 2.2 // Approximate height for raycasting/positioning
      },
      {
        name: 'Asura',
        health: 150,
        damage: 30,
        speed: 2,
        attackRange: 6, // Increased range
        attackRate: 0.5, // Slower attack rate (1 attack every 2s)
        model: this.createAsuraModel(),
        spawnWeight: 0.7,
        animationUpdate: this.updateAsuraAnimation,
        height: 2.5
      },
      {
        name: 'Naga',
        health: 80,
        damage: 15,
        speed: 4,
        attackRange: 4, // Increased range
        attackRate: 1, // 1 attack per second
        model: this.createNagaModel(),
        spawnWeight: 1.2,
        animationUpdate: this.updateNagaAnimation,
        height: 2.0 // Approximate height of torso/head for aiming
      }
    ];

    // Boss enemy type (not in regular spawn pool)
    this.bossType = {
      name: 'GiantDemon',
      health: 500,
      damage: 50,
      speed: 1.5,
      attackRange: 8,
      attackRate: 0.4, // Slower but devastating
      model: null, // Created on demand
      animationUpdate: this.updateBossAnimation,
      height: 6.0,
      isBoss: true
    };

    // Boss state
    this.boss = null;
    this.bossActive = false;
    this.levelManager = null; // Set by level manager

    // Pathfinding grid (Still basic)
    this.gridSize = 2; // Size of each grid cell
    this.grid = []; // Currently unused due to simplified pathfinding

    // Initialize
    this.setupSpawnPoints();
    // this.initializePathfindingGrid(); // Keep this commented out unless implementing grid-based pathfinding
    console.log("Enemy System Initialized");
  }

  // --- Model Creation (Keep as is, but add userData properties) ---
  // Methods createRakshasaModel, createAsuraModel, createNagaModel remain here...
  // (Code omitted for brevity, assume they are the same as provided previously)
  createRakshasaModel() {
    const enemy = new THREE.Group();
    // ... (geometry and material setup as before) ...
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

    // Store original materials for hit flash
    enemy.userData.originalMaterials = new Map();
    enemy.traverse((child) => {
        if (child.isMesh && child.material) {
            enemy.userData.originalMaterials.set(child, child.material);
        }
    });

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
     // ... (geometry and material setup as before) ...
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

    // Store original materials for hit flash
    enemy.userData.originalMaterials = new Map();
    enemy.traverse((child) => {
        if (child.isMesh && child.material) {
            enemy.userData.originalMaterials.set(child, child.material);
        }
    });

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
    // ... (geometry and material setup as before) ...
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


     // Store original materials for hit flash
    enemy.userData.originalMaterials = new Map();
    enemy.traverse((child) => {
        if (child.isMesh && child.material) {
            enemy.userData.originalMaterials.set(child, child.material);
        }
    });

    enemy.userData.animationState = { walkTime: 0, attackTime: 0, isAttacking: false, slitherTime: 0 };
    enemy.castShadow = true;
    enemy.receiveShadow = true; // Base segments receive shadow
     enemy.children.forEach(child => {
        child.castShadow = true;
        // child.receiveShadow = true;
    });

    return enemy;
  }

  // Create Giant Demon Boss Model (3x scale, menacing appearance)
  createGiantDemonModel() {
    const boss = new THREE.Group();
    const scale = 3.0; // 3x normal size

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
      emissive: 0xFF0000,
      emissiveIntensity: 2
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

    // Store original materials for hit flash
    boss.userData.originalMaterials = new Map();
    boss.traverse((child) => {
      if (child.isMesh && child.material) {
        boss.userData.originalMaterials.set(child, child.material);
      }
    });

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

  // Spawn the boss enemy
  spawnBoss() {
    if (this.bossActive) return;

    console.log("Spawning Giant Demon Boss!");

    // Create boss model
    const bossModel = this.createGiantDemonModel();

    // Create boss enemy object
    const boss = {
      id: THREE.MathUtils.generateUUID(),
      type: 'GiantDemon',
      health: this.bossType.health,
      maxHealth: this.bossType.health,
      damage: this.bossType.damage,
      speed: this.bossType.speed,
      attackRange: this.bossType.attackRange,
      attackRate: this.bossType.attackRate,
      lastAttackTime: 0,
      model: bossModel,
      position: new THREE.Vector3(0, 0, -60), // Spawn in center-back
      target: this.player.getPosition().clone(),
      path: [],
      currentPathIndex: 0,
      state: 'idle',
      lastStateChange: performance.now() / 1000,
      height: this.bossType.height,
      animationUpdate: this.bossType.animationUpdate,
      hitFlashTimeout: null,
      enemySystem: this,
      isBoss: true,

      // Boss-specific attack methods
      groundSlam: false,
      chargeAttack: false,
      lastSpecialAttack: 0,
      specialAttackCooldown: 5, // Seconds between special attacks

      takeDamage: function(amount) {
        if (this.state === 'dying') return;

        this.health -= amount;
        console.log(`BOSS took ${amount} damage! ${this.health.toFixed(0)}/${this.maxHealth.toFixed(0)} remaining`);

        // Hit flash effect
        if (this.hitFlashTimeout) clearTimeout(this.hitFlashTimeout);
        const hitMaterial = new THREE.MeshStandardMaterial({
          color: 0xFFFFFF,
          emissive: 0xFFFFFF,
          emissiveIntensity: 0.8,
          roughness: 1.0,
          metalness: 0.0,
          transparent: true,
          opacity: 0.8
        });

        this.model.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = hitMaterial;
          }
        });

        this.hitFlashTimeout = setTimeout(() => {
          this.model.traverse((child) => {
            if (child.isMesh && this.model.userData.originalMaterials) {
              const originalMaterial = this.model.userData.originalMaterials.get(child);
              if (originalMaterial) {
                child.material = originalMaterial;
              }
            }
          });
          this.hitFlashTimeout = null;
        }, 100);

        if (this.health <= 0) {
          this.enemySystem.handleBossDeath(this);
        }
      }
    };

    // Link model to boss object
    boss.model.userData.enemyObject = boss;
    boss.model.name = 'GiantDemon_BOSS';

    // Rebuild originalMaterials Map after any cloning
    boss.model.userData.originalMaterials = new Map();
    boss.model.traverse((child) => {
      if (child.isMesh && child.material) {
        boss.model.userData.originalMaterials.set(child, child.material);
      }
    });

    // Set model position
    boss.model.position.copy(boss.position);
    boss.model.position.y = 0;

    // Add to scene
    this.scene.add(boss.model);

    // Add to enemies array
    this.enemies.push(boss);
    this.boss = boss;
    this.bossActive = true;

    console.log("Boss spawned at", boss.position);
  }

  // Handle boss death
  handleBossDeath(boss) {
    if (boss.state === 'dying') return;

    console.log("BOSS DEFEATED!");
    boss.state = 'dying';

    // Play boss death sound
    if (this.weaponSystem && this.weaponSystem.playEnemyDeathSound) {
      // Play multiple death sounds for dramatic effect
      this.weaponSystem.playEnemyDeathSound();
      setTimeout(() => this.weaponSystem.playEnemyDeathSound(), 200);
      setTimeout(() => this.weaponSystem.playEnemyDeathSound(), 400);
    }

    // Dramatic death animation
    const deathDuration = 2.0;
    const startTime = performance.now();
    const initialScale = boss.model.scale.clone();

    const fadeInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= deathDuration) {
        clearInterval(fadeInterval);
        if (this.scene.getObjectById(boss.model.id)) {
          this.scene.remove(boss.model);
          boss.model.traverse(child => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      } else {
        const progress = elapsed / deathDuration;
        // Shrink and spin
        boss.model.scale.copy(initialScale).multiplyScalar(1 - progress);
        boss.model.rotation.y += 0.1;
        boss.model.position.y = progress * 2; // Rise up slightly
      }
    }, 30);

    // Remove from enemies array
    this.enemies = this.enemies.filter(e => e.id !== boss.id);
    this.boss = null;
    this.bossActive = false;

    // Notify level manager
    if (this.levelManager && this.levelManager.onBossDefeated) {
      setTimeout(() => {
        this.levelManager.onBossDefeated();
      }, 500);
    }

    // Update score
    window.updateGameScore(100); // Boss worth more points
  }

  // Boss animation update
  updateBossAnimation(enemy, deltaTime) {
    const state = enemy.model.userData.animationState;
    const body = enemy.model.children[0];
    const leftArm = enemy.model.children[4];
    const rightArm = enemy.model.children[5];

    if (enemy.state === 'dying' || state.isAttacking) return;

    if (enemy.state === 'chasing') {
      state.walkTime += deltaTime * enemy.speed * 0.8;
      // Heavy stomping motion
      body.position.y = 6 + Math.abs(Math.sin(state.walkTime)) * 0.5;
      if (leftArm) leftArm.rotation.x = Math.sin(state.walkTime) * 0.3;
      if (rightArm) rightArm.rotation.x = -Math.sin(state.walkTime) * 0.3;
    } else if (enemy.state === 'attacking') {
      state.attackTime += deltaTime * 2;
      // Menacing arm raise
      if (leftArm) leftArm.rotation.z = Math.PI / 4 + Math.sin(state.attackTime) * 0.3;
      if (rightArm) rightArm.rotation.z = -Math.PI / 4 - Math.sin(state.attackTime) * 0.3;
    } else {
      // Idle breathing
      body.position.y = 6 + Math.sin(state.walkTime * 0.5) * 0.2;
      state.walkTime += deltaTime;
    }
  }

  // --- Setup and Pathfinding (Basic) ---

  setupSpawnPoints() {
    const spawnLocations = [
      { x: -40, z: -20 }, { x: 40, z: -20 }, { x: -40, z: -60 },
      { x: 40, z: -60 }, { x: -20, z: -80 }, { x: 20, z: -80 },
      { x: -60, z: -40 }, { x: 60, z: -40 }, { x: 0, z: -100 },
      { x: -80, z: -80 }, { x: 80, z: -80 } // Added more points
    ];

    this.spawnPoints = []; // Clear existing points before setting up
    spawnLocations.forEach(loc => {
      // TODO: Add validation check against collisionSystem to ensure point is not inside wall
      this.spawnPoints.push(new THREE.Vector3(loc.x, 0, loc.z)); // Assume ground is at y=0
    });
    console.log(`Set up ${this.spawnPoints.length} spawn points.`);
  }

  // --- Pathfinding (Simplified - Direct line, no grid used) ---
  findPath(start, target) {
    // Placeholder: Returns a direct path. Replace with A* or other algorithm.
    // Ensure the target Y is same as start Y for ground movement
    const targetGroundPos = new THREE.Vector3(target.x, start.y, target.z);
    return [start.clone(), targetGroundPos]; // Path is just start and end points
  }

  // --- Spawning ---

  spawnEnemy() {
    if (this.enemies.length >= this.maxEnemies || !this.player || this.spawnPoints.length === 0) {
      return; // Max enemies reached, player doesn't exist, or no spawn points defined
    }

    // Choose a random spawn point far from the player
    let spawnPoint = null;
    let attempts = 0;
    const minSpawnDist = 30; // Minimum distance from player to spawn
    const playerPos = this.player.getPosition(); // Use getter if available

    while (attempts < 10) {
        const potentialPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        if (playerPos.distanceTo(potentialPoint) >= minSpawnDist) {
            spawnPoint = potentialPoint;
            break;
        }
        attempts++;
    }
    if (!spawnPoint) {
        // Fallback if no suitable point found after attempts
        spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        // console.warn("Could not find spawn point far enough from player, using random.");
    }


    // Choose enemy type based on weights
    const totalWeight = this.enemyTypes.reduce((sum, type) => sum + type.spawnWeight, 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedType = this.enemyTypes[0]; // Default
    for (const type of this.enemyTypes) {
      randomWeight -= type.spawnWeight;
      if (randomWeight <= 0) {
        selectedType = type;
        break;
      }
    }

    // Create the enemy object
    const enemy = {
      id: THREE.MathUtils.generateUUID(), // Unique ID
      type: selectedType.name,
      health: selectedType.health * (1 + (this.difficultyLevel - 1) * 0.2),
      maxHealth: selectedType.health * (1 + (this.difficultyLevel - 1) * 0.2),
      damage: selectedType.damage * (1 + (this.difficultyLevel - 1) * 0.1),
      speed: selectedType.speed,
      attackRange: selectedType.attackRange,
      attackRate: selectedType.attackRate,
      lastAttackTime: 0,
      model: selectedType.model.clone(), // Clone the template model
      position: spawnPoint.clone(), // Start at spawn point
      target: playerPos.clone(), // Initial target is player's current position
      path: [],
      currentPathIndex: 0,
      state: 'idle', // idle, chasing, attacking, dying
      lastStateChange: performance.now() / 1000,
      height: selectedType.height, // Store height
      animationUpdate: selectedType.animationUpdate, // Reference to the animation function
      hitFlashTimeout: null, // Timeout ID for hit flash reset
      enemySystem: this, // Reference back to the system for calling methods like handleEnemyDeath

      // --- Enemy Methods ---
      takeDamage: function(amount) { // Removed enemySystem parameter, use this.enemySystem
          if (this.state === 'dying') return; // Already dying

          this.health -= amount;
          console.log(`${this.type} ${this.id.substring(0,4)} took ${amount} damage, ${this.health.toFixed(0)}/${this.maxHealth.toFixed(0)} left.`);

          // --- Hit Flash Effect ---
          if (this.hitFlashTimeout) clearTimeout(this.hitFlashTimeout); // Clear previous timeout
          const hitMaterial = new THREE.MeshStandardMaterial({
              color: 0xFFFFFF, // White flash
              emissive: 0xFFFFFF,
              emissiveIntensity: 0.8, // Intense flash
              roughness: 1.0,
              metalness: 0.0,
              transparent: true,
              opacity: 0.8
          });

          this.model.traverse((child) => {
              if (child.isMesh && child.material) {
                  child.material = hitMaterial;
              }
          });

          this.hitFlashTimeout = setTimeout(() => {
              this.model.traverse((child) => {
                  if (child.isMesh && this.model.userData.originalMaterials) {
                      const originalMaterial = this.model.userData.originalMaterials.get(child);
                      if (originalMaterial) {
                          child.material = originalMaterial;
                      }
                  }
              });
              this.hitFlashTimeout = null; // Clear timeout ID
          }, 100); // Shorter flash duration (ms)
          // --- End Hit Flash ---

          if (this.health <= 0) {
              this.enemySystem.handleEnemyDeath(this); // Use stored reference
          }
      },
    };

    // Link the model back to the enemy object for raycasting checks
    enemy.model.userData.enemyObject = enemy;
    // Add a name for easier debugging in scene graph
    enemy.model.name = `${enemy.type}_${enemy.id.substring(0,4)}`;

    // Rebuild originalMaterials Map after cloning (Maps don't clone properly)
    enemy.model.userData.originalMaterials = new Map();
    enemy.model.traverse((child) => {
        if (child.isMesh && child.material) {
            enemy.model.userData.originalMaterials.set(child, child.material);
        }
    });

    // Set model initial position and add to scene
    enemy.model.position.copy(enemy.position);
    // Adjust Y position based on enemy height so feet are near y=0
    enemy.model.position.y = 0; // Assume model origin is at feet, adjust if needed
    this.scene.add(enemy.model);

    // Add to collision system if it's used for dynamic enemy collisions
    // this.collisionSystem.add(enemy.model); // Be careful adding complex groups directly

    // Add to our list
    this.enemies.push(enemy);
    this.lastSpawnTime = performance.now() / 1000; // Update last spawn time

    // console.log(`Spawned ${enemy.type} at ${spawnPoint.x.toFixed(1)}, ${spawnPoint.z.toFixed(1)}.`);
  }

  // --- Death Handling ---
  handleEnemyDeath(enemy) {
      if (enemy.state === 'dying') return; // Already processing death

      console.log(`${enemy.type} ${enemy.id.substring(0,4)} died.`);
      enemy.state = 'dying';
      this.killCount++;
      window.updateGameScore(10); // Example: Update score via global function

      // Play enemy death sound
      if (this.weaponSystem && this.weaponSystem.playEnemyDeathSound) {
          this.weaponSystem.playEnemyDeathSound();
      }

      // Optional: Add death animation/effect trigger here
      // e.g., enemy.model.playAnimation('death');

      // Remove from collision system if added
      // this.collisionSystem.remove(enemy.model);

      // Remove model from scene after a delay (e.g., for death animation/fade out)
      // Add a simple shrink/fade effect
      const deathDuration = 0.5; // seconds
      const startTime = performance.now();
      const initialScale = enemy.model.scale.clone();

      const fadeInterval = setInterval(() => {
          const elapsed = (performance.now() - startTime) / 1000;
          if (elapsed >= deathDuration) {
              clearInterval(fadeInterval);
              if(this.scene.getObjectById(enemy.model.id)) { // Check if still in scene
                  this.scene.remove(enemy.model);
                  // Dispose geometries/materials
                  enemy.model.traverse(child => {
                      if (child.isMesh) {
                          child.geometry.dispose();
                          if (Array.isArray(child.material)) {
                              child.material.forEach(mat => mat.dispose());
                          } else if (child.material) {
                              child.material.dispose();
                          }
                      }
                  });
              }
          } else {
              const progress = elapsed / deathDuration;
              enemy.model.scale.copy(initialScale).multiplyScalar(1 - progress); // Shrink
              // Optional: Fade out material opacity if materials support transparency
          }
      }, 30); // Update interval


      // Remove enemy object from the list immediately
      this.enemies = this.enemies.filter(e => e.id !== enemy.id);

      // Potentially increase difficulty or trigger events based on kill count
      // if (this.killCount % 10 === 0) { this.difficultyLevel++; console.log("Difficulty Increased!"); }
  }

  // --- Enemy Attack ---
  performAttack(enemy) {
    const currentTime = performance.now() / 1000;
    // Use attack rate correctly (time between attacks = 1 / rate)
    if (currentTime - enemy.lastAttackTime > (1 / enemy.attackRate)) {
      console.log(`${enemy.type} ${enemy.id.substring(0,4)} attacks player!`);
      // Use the HealthSystem to damage the player
      this.healthSystem.takeDamage(enemy.damage); // Correct method name from health.js
      enemy.lastAttackTime = currentTime;
      enemy.model.userData.animationState.isAttacking = true; // Trigger attack animation state
      enemy.model.userData.animationState.attackTime = 0; // Reset attack animation timer

       // Simple attack animation effect (e.g., quick lunge or arm swing)
       // This part depends heavily on the specific model and animation setup
       // Lunge example:
        const attackDirection = new THREE.Vector3();
        enemy.model.getWorldDirection(attackDirection); // Direction enemy is facing
        attackDirection.multiplyScalar(0.5); // Lunge distance
        const originalPos = enemy.position.clone(); // Store logical position

        // Apply temporary offset to model for visual effect
        enemy.model.position.add(attackDirection);

        setTimeout(() => {
            // Reset model position after lunge - use stored logical position
            if(enemy.state !== 'dying') { // Check if enemy died during the attack :)
               enemy.model.position.copy(enemy.position);
            }
            if(enemy.model.userData.animationState) enemy.model.userData.animationState.isAttacking = false;
        }, 150); // Duration of lunge/attack visual effect
    }
  }

  // --- Animation Updates ---
  // Methods updateRakshasaAnimation, updateAsuraAnimation, updateNagaAnimation remain here...
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
        const segments = 8; // Must match creation

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


  // --- Main Update Loop ---

  update(deltaTime) {
    const currentTime = performance.now() / 1000;

    // --- Spawning Logic ---
    if (currentTime - this.lastSpawnTime > this.spawnInterval && this.enemies.length < this.maxEnemies) {
      this.spawnEnemy();
    }

    // --- Update Existing Enemies ---
    // Iterate backwards for safe removal during loop
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Skip dead enemies that might still be fading out
      if (enemy.state === 'dying') {
        continue;
      }

      const playerPosition = this.player.getPosition(); // Use getter
      const distanceToPlayer = enemy.position.distanceTo(playerPosition);

      // --- State Machine ---
      const previousState = enemy.state;
      if (distanceToPlayer <= enemy.attackRange) {
        enemy.state = 'attacking';
      } else if (distanceToPlayer <= this.chaseThreshold) {
        enemy.state = 'chasing';
      } else if (distanceToPlayer > this.idleThreshold) {
         if(enemy.state === 'chasing') enemy.state = 'idle';
         else if(enemy.state === 'attacking') enemy.state = 'chasing'; // Move from attack to chase if player backs off
      }
      else if (enemy.state === 'attacking') { // Player moved between attack and chase range
           enemy.state = 'chasing';
      }


      if (enemy.state !== previousState) {
        // console.log(`${enemy.type} ${enemy.id.substring(0,4)} state changed to ${enemy.state}`);
        enemy.lastStateChange = currentTime;
        enemy.path = []; // Reset path on state change
        enemy.currentPathIndex = 0;
      }

      // --- Actions based on State ---
      // Target for looking should include Y for better aiming up/down slightly
      const lookTarget = playerPosition.clone();
      // Adjust lookTarget Y slightly towards player's eye level? Optional.
      // lookTarget.y = Math.max(enemy.position.y, playerPosition.y * 0.8); // Prevent looking straight down/up


      switch (enemy.state) {
        case 'idle':
          // Stand still, look towards player
          enemy.model.lookAt(lookTarget);
          break;

        case 'chasing':
          // Simple direct movement towards player (replace with path following)
          const direction = new THREE.Vector3().subVectors(playerPosition, enemy.position);
          direction.y = 0; // Move only on XZ plane for now
          direction.normalize();

          // --- Basic Collision Avoidance (Check if next step is valid) ---
          // This requires integration with your collision system (e.g., check a small step forward)
          let moveSpeed = enemy.speed * deltaTime;
          const nextPos = enemy.position.clone().add(direction.clone().multiplyScalar(moveSpeed));

          // Example check (needs a proper method in CollisionSystem):
          // if (this.collisionSystem.isPositionOccupied(nextPos, enemy.radius)) {
          //     moveSpeed = 0; // Stop if next step is blocked
          //     // TODO: Add better avoidance logic (e.g., try strafing)
          // }

          enemy.position.add(direction.multiplyScalar(moveSpeed));

          // Update model position and orientation
          enemy.model.position.copy(enemy.position);
          enemy.model.lookAt(lookTarget);
          break;

        case 'attacking':
          // Stop moving, face player, and attack
          enemy.model.lookAt(lookTarget);
          // Ensure model position matches logical position before attack lunge
          enemy.model.position.copy(enemy.position);
          this.performAttack(enemy);
          break;
      }

      // --- Update Animations ---
      if (enemy.animationUpdate) {
          enemy.animationUpdate(enemy, deltaTime);
      }

    } // End loop through enemies
  } // End update method


  // --- NEW RESET METHOD ---
  reset() {
      console.log("Resetting Enemy System...");

      // Remove all existing enemy models from the scene and dispose resources
      this.enemies.forEach(enemy => {
          if (enemy.model && this.scene.getObjectById(enemy.model.id)) { // Check if model exists and is in scene
              this.scene.remove(enemy.model);
              // Dispose geometry and materials
              enemy.model.traverse(child => {
                  if (child.isMesh) {
                      if (child.geometry) child.geometry.dispose();
                      if (child.material) {
                           if (Array.isArray(child.material)) {
                               child.material.forEach(mat => mat.dispose());
                           } else {
                               child.material.dispose();
                           }
                      }
                  }
              });
          }
          // Clear any pending timeouts (like hit flash)
          if (enemy.hitFlashTimeout) {
              clearTimeout(enemy.hitFlashTimeout);
          }
      });

      // Clear the enemies array
      this.enemies = [];

      // Reset counters and timers
      this.killCount = 0;
      this.lastSpawnTime = 0; // Allow immediate spawning after reset based on interval
      this.difficultyLevel = 1; // Reset difficulty? Or keep it? Resetting for now.

      console.log("Enemy System Reset. Enemies cleared.");

      // Optional: Spawn initial enemies immediately after reset?
      // this.spawnEnemy(); // Example: Spawn one enemy right away
      // Or let the update loop handle spawning based on the reset timer.
  }

  // --- Helper methods for WeaponSystem ---

  // Returns an array of meshes used for enemy hit detection
  getEnemyHitboxes() {
      const hitboxes = [];
      this.enemies.forEach(enemy => {
          if (enemy.state !== 'dying' && enemy.model) {
              // Add the main model group or specific hitbox meshes if defined
              // For simplicity, adding the whole model group allows hits on any part
              // For more precision, add specific body parts (head, torso) marked with userData
              enemy.model.traverse(child => {
                  if (child.isMesh && child.userData.isEnemyPart) { // Check for the flag set during model creation
                      hitboxes.push(child);
                  }
              });
              // If no parts are marked, add the main model group (less precise)
              // if (hitboxes.length === 0) hitboxes.push(enemy.model);
          }
      });
      return hitboxes;
  }

  // Finds the enemy object associated with a given hitbox mesh
  getEnemyByHitbox(hitboxMesh) {
      // Traverse up the hierarchy from the hit mesh to find the main enemy model group,
      // then retrieve the enemy object stored in its userData.
      let parent = hitboxMesh;
      while (parent && !parent.userData.enemyObject) {
          parent = parent.parent;
      }
      return parent ? parent.userData.enemyObject : null;
  }

  // Method for systems to manually update UI if needed (e.g. on resize)
  // Not typically needed for EnemySystem unless it manages specific UI elements.
  // onResize() {
  //     console.log("EnemySystem received resize event.");
  // }

  // --- Clear All Enemies Method (called when quitting to menu) ---
  clearAllEnemies() {
      console.log("Clearing all enemies...");

      // Remove all existing enemy models from the scene and dispose resources
      this.enemies.forEach(enemy => {
          if (enemy.model && this.scene.getObjectById(enemy.model.id)) {
              this.scene.remove(enemy.model);
              // Dispose geometry and materials
              enemy.model.traverse(child => {
                  if (child.isMesh) {
                      if (child.geometry) child.geometry.dispose();
                      if (child.material) {
                          if (Array.isArray(child.material)) {
                              child.material.forEach(mat => mat.dispose());
                          } else {
                              child.material.dispose();
                          }
                      }
                  }
              });
          }
          // Clear any pending timeouts (like hit flash)
          if (enemy.hitFlashTimeout) {
              clearTimeout(enemy.hitFlashTimeout);
          }
      });

      // Clear the enemies array
      this.enemies = [];
      console.log("All enemies cleared.");
  }

} // End EnemySystem class
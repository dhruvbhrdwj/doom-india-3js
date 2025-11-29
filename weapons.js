import * as THREE from 'three';

// Weapon system for FPS game
export class WeaponSystem {
  // Constructor arguments corrected based on usage in previous index.js fix attempt
  // Needs scene, camera, playerController (for position/direction), collisionSystem (for raycasting/hits)
  constructor(camera, scene, playerController, collisionSystem, enemySystem) {
    this.camera = camera;
    this.scene = scene;
    this.playerController = playerController; // Used for recoil potentially
    this.collisionSystem = collisionSystem; // Needed for bullet hits
    this.enemySystem = enemySystem; // Needed to apply damage to enemies

    // Weapon state
    this.weapons = []; // Array to hold weapon definitions
    this.currentWeaponIndex = 0;
    this.isReloading = false;
    this.isFiring = false; // Track if fire button is held down
    this.lastShotTime = 0;

    // Weapon models group (attached to camera for FPS view)
    this.weaponViewModel = new THREE.Group();
    this.camera.add(this.weaponViewModel); // Attach models to camera

    // Bullet system
    this.bullets = [];
    this.bulletGeometry = new THREE.SphereGeometry(0.05, 6, 6); // Simpler geometry
    this.bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Effects
    this.muzzleFlash = this.createMuzzleFlash();
    this.muzzleFlash.visible = false;
    // Muzzle flash should also be attached relative to the weapon model/camera
    this.weaponViewModel.add(this.muzzleFlash); // Add to view model group

    // Impact effects pool (optional optimization)
    this.impactEffects = [];
    this.maxImpactEffects = 20;
    this.impactGeometry = new THREE.SphereGeometry(0.1, 6, 6);
    // Different materials for different surfaces (example)
    this.impactMaterialDefault = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.8 });
    this.impactMaterialEnemy = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });

    // Raycaster for shooting
    this.raycaster = new THREE.Raycaster();

    // Audio system for gunshot sounds
    this.audioContext = null;
    this.initAudio();

    // Initialize weapons
    this.initializeWeapons();

    // Setup event listeners
    this.setupEventListeners();

    // Initial UI Update
    this.updateAmmoUI(); // Update UI once on creation

    console.log("Weapon System Initialized");
  }

  // Initialize Web Audio API for sound effects
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log("Audio context initialized");
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
      this.audioContext = null;
    }
  }

  // Play gunshot sound using procedural audio
  playGunshotSound(weaponName) {
    if (!this.audioContext) return;

    // Resume audio context if suspended (required by browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for the "crack" sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();

    // Configure based on weapon type
    let frequency = 150;
    let duration = 0.1;
    let volume = 0.3;

    switch(weaponName) {
      case 'Pistol':
        frequency = 200;
        duration = 0.08;
        volume = 0.25;
        break;
      case 'Rifle':
        frequency = 120;
        duration = 0.06;
        volume = 0.3;
        break;
      case 'Shotgun':
        frequency = 80;
        duration = 0.15;
        volume = 0.4;
        break;
    }

    // Oscillator setup
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(40, now + duration);

    // Filter for more realistic sound
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(3000, now);
    filterNode.frequency.exponentialRampToValueAtTime(300, now + duration);

    // Envelope for the sound
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Add noise burst for more realistic gunshot
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 0.5;
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Play sounds
    oscillator.start(now);
    oscillator.stop(now + duration);
    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  // Play enemy death sound - satisfying kill confirmation
  playEnemyDeathSound() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.3;

    // Create a descending tone for death sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + duration);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Add a satisfying "splat" noise
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
    noiseSource.start(now);
    noiseSource.stop(now + 0.15);
  }

  // Initialize available weapons
  initializeWeapons() {
    // Define weapon types
    // Store initial ammo values separately for resetting
    this.weaponDefinitions = [
      {
        name: 'Pistol',
        model: this.createPistolModel(),
        damage: 20,
        fireRate: 0.4, // Slightly faster pistol
        reloadTime: 1.5,
        initialAmmo: 12,
        maxAmmo: 12,
        initialReserve: 48,
        maxReserve: 96,
        automatic: false,
        spread: 0.02,
        recoil: 0.015, // Slightly more recoil
        muzzlePosition: new THREE.Vector3(0, 0.05, -0.4) // Relative to weapon model origin
      },
      {
        name: 'Rifle',
        model: this.createRifleModel(),
        damage: 15,
        fireRate: 0.1,
        reloadTime: 2.0,
        initialAmmo: 30,
        maxAmmo: 30,
        initialReserve: 90,
        maxReserve: 180,
        automatic: true,
        spread: 0.03,
        recoil: 0.02,
        muzzlePosition: new THREE.Vector3(0, 0.05, -0.7) // Relative to weapon model origin
      },
      {
        name: 'Shotgun',
        model: this.createShotgunModel(),
        damage: 8, // per pellet
        pellets: 8,
        fireRate: 0.8,
        reloadTime: 2.5, // Shell-by-shell could be implemented later
        initialAmmo: 6,
        maxAmmo: 6,
        initialReserve: 24,
        maxReserve: 48,
        automatic: false,
        spread: 0.1, // Wider shotgun spread
        recoil: 0.05, // More shotgun recoil
        muzzlePosition: new THREE.Vector3(0, 0.05, -0.6) // Relative to weapon model origin
      }
    ];

    // Create runtime weapon instances from definitions
    this.weapons = this.weaponDefinitions.map(def => ({
        ...def, // Copy definition properties
        ammo: def.initialAmmo, // Set current ammo
        ammoReserve: def.initialReserve // Set current reserve
    }));

    // Add all weapon models to the view model group but hide them
    this.weaponViewModel.clear(); // Clear previous models if any
    this.weapons.forEach(weapon => {
      weapon.model.visible = false;
      this.weaponViewModel.add(weapon.model);
    });

    // Show the first weapon
    this.currentWeaponIndex = 0; // Default to first weapon
    this.switchWeapon(this.currentWeaponIndex); // Ensure first weapon is visible

    console.log("Weapons Initialized:", this.weapons.map(w => w.name));
  }

    // --- Model Creation Methods (Simplified for brevity - Keep your detailed versions) ---
    createPistolModel() {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.1, 0.15, 0.3);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = -0.15; // Center geometry
        group.add(mesh);
        // Position relative to camera view
        group.position.set(0.15, -0.15, -0.3);
        group.rotation.y = Math.PI; // Point forward initially
        return group;
    }
    createRifleModel() {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.1, 0.15, 0.7);
        const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const mesh = new THREE.Mesh(geo, mat);
         mesh.position.z = -0.35; // Center geometry
        group.add(mesh);
        // Position relative to camera view
        group.position.set(0.15, -0.15, -0.3);
        group.rotation.y = Math.PI;
        return group;
    }
    createShotgunModel() {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.12, 0.18, 0.6); // Thicker
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const mesh = new THREE.Mesh(geo, mat);
         mesh.position.z = -0.3; // Center geometry
        group.add(mesh);
        // Position relative to camera view
        group.position.set(0.15, -0.15, -0.3);
        group.rotation.y = Math.PI;
        return group;
    }
    // ------------------------------------------------------------------------------------

  // Create muzzle flash effect
  createMuzzleFlash() {
    const flashLight = new THREE.PointLight(0xffcc66, 0, 5, 2); // Color, Intensity (starts 0), Distance, Decay
    flashLight.castShadow = false; // No shadow for performance

    // Optional: Add a sprite/mesh for visual flash
    const spriteMaterial = new THREE.SpriteMaterial({
        map: this.createFlashTexture(),
        color: 0xffffaa,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0
    });
    const flashSprite = new THREE.Sprite(spriteMaterial);
    flashSprite.scale.set(0.5, 0.5, 1); // Adjust size

    const flashGroup = new THREE.Group();
    flashGroup.add(flashLight);
    flashGroup.add(flashSprite);

    return flashGroup;
  }

  // Helper to create a simple radial gradient texture for the flash sprite
  createFlashTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }


  // Setup event listeners for weapon controls
  setupEventListeners() {
    // Use bound functions to preserve 'this' context
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);

    // Add listeners
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('keydown', this.boundKeyDown);
  }

  // Call this if the WeaponSystem instance is destroyed
  removeEventListeners() {
      console.log("Removing WeaponSystem event listeners.");
      document.removeEventListener('mousedown', this.boundMouseDown);
      document.removeEventListener('mouseup', this.boundMouseUp);
      document.removeEventListener('keydown', this.boundKeyDown);
  }

  // Event handlers
  handleMouseDown(event) {
    // Check if pointer is locked (assuming pointerLockControls instance is accessible or state is known)
    // This check might be better handled in index.js before calling startFiring
    if (document.pointerLockElement && event.button === 0) { // Left mouse button
      this.startFiring();
    }
  }
  handleMouseUp(event) {
    if (event.button === 0) { // Left mouse button
      this.stopFiring();
    }
  }
  handleKeyDown(event) {
    // Check if pointer is locked or if typing in an input field
    if (!document.pointerLockElement) return;

    // Number keys 1-3 for weapon switching
    if (event.code.startsWith('Digit')) {
        const index = parseInt(event.code.slice(5)) - 1; // Digit1 -> 0, Digit2 -> 1, etc.
        if (index >= 0 && index < this.weapons.length) {
            this.switchWeapon(index);
        }
    }
    // R key for reloading
    else if (event.code === 'KeyR') {
      this.reload();
    }
  }


  // Switch to a different weapon
  switchWeapon(index) {
    if (index < 0 || index >= this.weapons.length || index === this.currentWeaponIndex || this.isReloading) {
      return; // Ignore invalid index, same weapon, or if reloading
    }
    console.log(`Switching from weapon ${this.currentWeaponIndex} to ${index}`);

    // Stop firing current weapon if switching
    this.stopFiring();

    // Hide current weapon model
    if(this.weapons[this.currentWeaponIndex]) { // Check if weapon exists
        this.weapons[this.currentWeaponIndex].model.visible = false;
    }

    // Show new weapon model
    this.currentWeaponIndex = index;
    if(this.weapons[this.currentWeaponIndex]) { // Check if new weapon exists
        this.weapons[this.currentWeaponIndex].model.visible = true;
        // Update UI for the new weapon
        this.updateAmmoUI();
        console.log(`Switched to ${this.weapons[this.currentWeaponIndex].name}`);
    } else {
        console.error(`Weapon index ${index} is invalid.`);
    }

    // Play weapon switch sound (placeholder)
  }


  // Start firing the current weapon
  startFiring() {
    if (this.isReloading) return;
    this.isFiring = true;
    // Initial shot attempt
    this.tryToFire();
  }

  // Stop firing the current weapon
  stopFiring() {
    this.isFiring = false;
  }

  // Try to fire the current weapon based on fire rate
  tryToFire() {
    // Check conditions again in case state changed (e.g., started reloading)
    if (!this.isFiring || this.isReloading) {
        this.isFiring = false; // Ensure flag is false if conditions not met
        return;
    }

    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon) return; // Safety check

    const currentTime = performance.now() / 1000; // Use performance.now() for higher precision

    // Check ammo first
    if (weapon.ammo <= 0) {
      if (!this.isReloading) { // Only try to reload if not already reloading
          console.log('Click! Out of ammo');
          this.reload(); // Attempt reload
      }
      this.isFiring = false; // Stop firing attempt if out of ammo
      return;
    }

    // Check fire rate
    if (currentTime - this.lastShotTime >= weapon.fireRate) {
      this.fire(); // Fire the weapon
      this.lastShotTime = currentTime; // Update last shot time

      // If still holding fire and weapon is automatic, schedule next check
      // Use requestAnimationFrame for smoother timing tied to frame rate
      if (this.isFiring && weapon.automatic) {
          // No need to schedule here, the main update loop will handle continuous fire attempts
      }
    }
    // If automatic and fire rate not met, the main loop will try again next frame
  }

  // Fire the current weapon (Called by tryToFire)
  fire() {
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon) return;

    // Decrease ammo (already checked > 0 in tryToFire)
    weapon.ammo--;

    // Update UI
    this.updateAmmoUI();

    // Apply recoil (visual effect on camera)
    this.applyRecoil(weapon.recoil);

    // Show muzzle flash
    this.showMuzzleFlash(weapon);

    // Perform Raycast for hit detection
    this.performRaycast(weapon);

    // Play gunshot sound
    this.playGunshotSound(weapon.name);

    // Auto reload if empty (optional, some games require manual reload)
    if (weapon.ammo === 0 && weapon.ammoReserve > 0) {
      this.reload();
    }
  }

  // Perform raycast from camera to detect hits
  performRaycast(weapon) {
      // Calculate origin and direction (center of screen)
      // Use camera world position and direction
      const origin = new THREE.Vector3();
      this.camera.getWorldPosition(origin);

      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);

      // Add spread
      const spread = weapon.spread;
      direction.x += (Math.random() - 0.5) * spread * 2;
      direction.y += (Math.random() - 0.5) * spread * 2;
      direction.z += (Math.random() - 0.5) * spread * 2;
      direction.normalize();

      this.raycaster.set(origin, direction);
      this.raycaster.far = 100; // Max range

      // Determine objects to check for hits
      // Combine collidable world objects and enemies
      const objectsToCheck = [
          ...this.collisionSystem.collidableObjects, // World geometry
          ...this.enemySystem.getEnemyHitboxes() // Enemy hitboxes (needs method in EnemySystem)
      ];

      // Perform the raycast
      const intersects = this.raycaster.intersectObjects(objectsToCheck, true); // Check recursively

      if (intersects.length > 0) {
          const hit = intersects[0]; // Closest hit

          // Check if hit object is an enemy hitbox
          const hitObject = hit.object;
          const enemy = this.enemySystem.getEnemyByHitbox(hitObject); // Needs method in EnemySystem

          if (enemy) {
              // Hit an enemy
              console.log(`Hit enemy ${enemy.id} at distance ${hit.distance.toFixed(2)}`);
              enemy.takeDamage(weapon.damage); // Apply damage via EnemySystem/Enemy class
              this.createImpactEffect(hit.point, true); // Enemy hit effect
          } else {
              // Hit world geometry
              console.log(`Hit world geometry at distance ${hit.distance.toFixed(2)}`);
              this.createImpactEffect(hit.point, false); // Default impact effect
          }

      } else {
          // Ray hit nothing within range
          // console.log("Ray missed");
      }

      // Shotgun fires multiple rays (pellets)
      if (weapon.name === 'Shotgun') {
          for (let i = 1; i < weapon.pellets; i++) { // Start from 1, first pellet already done
              // Recalculate direction with spread for each pellet
              this.camera.getWorldDirection(direction); // Get base direction again
              direction.x += (Math.random() - 0.5) * spread * 2;
              direction.y += (Math.random() - 0.5) * spread * 2;
              direction.z += (Math.random() - 0.5) * spread * 2;
              direction.normalize();
              this.raycaster.set(origin, direction);
              const pelletIntersects = this.raycaster.intersectObjects(objectsToCheck, true);
              if (pelletIntersects.length > 0) {
                  const pelletHit = pelletIntersects[0];
                  const pelletHitObject = pelletHit.object;
                  const pelletEnemy = this.enemySystem.getEnemyByHitbox(pelletHitObject);
                  if (pelletEnemy) {
                      pelletEnemy.takeDamage(weapon.damage); // Apply damage for each pellet
                      this.createImpactEffect(pelletHit.point, true);
                  } else {
                      this.createImpactEffect(pelletHit.point, false);
                  }
              }
          }
      }
  }


  // Create visual impact effect at hit point
  createImpactEffect(position, isEnemyHit) {
      // Use object pooling for performance if creating many effects
      let impact;
      const material = isEnemyHit ? this.impactMaterialEnemy : this.impactMaterialDefault;

      if (this.impactEffects.length < this.maxImpactEffects) {
          impact = new THREE.Mesh(this.impactGeometry, material.clone()); // Clone material to change opacity independently
          this.impactEffects.push(impact);
          this.scene.add(impact);
      } else {
          // Reuse oldest effect
          impact = this.impactEffects.shift();
          impact.material = material.clone(); // Assign potentially different material
          this.impactEffects.push(impact); // Move to end of pool
      }

      impact.position.copy(position);
      impact.visible = true;
      impact.material.opacity = 0.8; // Reset opacity

      // Simple fade out effect
      const fadeDuration = 0.5; // seconds
      let elapsed = 0;
      const fadeInterval = setInterval(() => {
          elapsed += 0.05; // Update interval
          if (elapsed >= fadeDuration || !impact.material) {
              impact.visible = false;
              clearInterval(fadeInterval);
          } else {
              impact.material.opacity = 0.8 * (1 - elapsed / fadeDuration);
          }
      }, 50);
  }


  // Reload the current weapon
  reload() {
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon || this.isReloading) return; // Safety check or already reloading

    // Check if we need to reload and have ammo in reserve
    if (weapon.ammo >= weapon.maxAmmo || weapon.ammoReserve <= 0) {
      console.log("Reload not needed or no reserve ammo.");
      return;
    }

    console.log(`Reloading ${weapon.name}...`);
    this.isReloading = true;
    this.isFiring = false; // Stop firing when reload starts

    // Play reload sound (placeholder)
    // AudioManager.playSound('reload_start');

    // Simple animation placeholder: lower weapon slightly
    const originalPos = weapon.model.position.clone();
    weapon.model.position.y -= 0.1;

    // Reload after delay
    setTimeout(() => {
      // Check if weapon still exists (might have switched during timeout?)
      const currentWeapon = this.weapons[this.currentWeaponIndex];
      if (!currentWeapon || !this.isReloading) {
          // If weapon switched or reload cancelled, revert animation if needed
          if(currentWeapon) currentWeapon.model.position.copy(originalPos);
          return;
      }

      // Calculate how much ammo to add
      const ammoNeeded = currentWeapon.maxAmmo - currentWeapon.ammo;
      const ammoToAdd = Math.min(ammoNeeded, currentWeapon.ammoReserve);

      // Add ammo and remove from reserve
      currentWeapon.ammo += ammoToAdd;
      currentWeapon.ammoReserve -= ammoToAdd;

      // Update UI
      this.updateAmmoUI();

      // Restore weapon position
      currentWeapon.model.position.copy(originalPos);

      // End reloading
      this.isReloading = false;

      // Play reload complete sound (placeholder)
      // AudioManager.playSound('reload_complete');
      console.log(`Reload complete: ${currentWeapon.ammo}/${currentWeapon.ammoReserve}`);

    }, weapon.reloadTime * 1000);
  }


  // Apply recoil effect to camera
  applyRecoil(amount) {
      // Recoil should affect camera rotation, applied by PlayerController ideally
      // For now, directly modify camera rotation (less ideal as it fights PointerLockControls)
      // A better way is to apply an offset that PlayerController incorporates and dampens.

      // Simple direct rotation (will likely jitter with PointerLockControls)
       this.camera.rotation.x -= amount * (0.8 + Math.random() * 0.4); // Pitch up
       // Apply small random yaw
       this.camera.rotation.y += amount * (Math.random() * 0.6 - 0.3);

      // TODO: Implement a smoother recoil system, possibly via PlayerController
  }


  // Show muzzle flash effect
  showMuzzleFlash(weapon) {
    if (!this.muzzleFlash) return;

    // Position flash relative to the weapon model's muzzle position
    this.muzzleFlash.position.copy(weapon.muzzlePosition);

    // Make flash visible and bright
    const light = this.muzzleFlash.children[0]; // Assuming PointLight is first child
    const sprite = this.muzzleFlash.children[1]; // Assuming Sprite is second child

    if (light instanceof THREE.PointLight) {
        light.intensity = 2.0; // Bright flash
    }
    if (sprite instanceof THREE.Sprite) {
        sprite.material.opacity = 0.9;
        sprite.material.rotation = Math.random() * Math.PI * 2; // Random rotation
        sprite.scale.set(0.5, 0.5, 1); // Reset scale
    }
    this.muzzleFlash.visible = true;


    // Hide and reset after short delay
    setTimeout(() => {
      if (light instanceof THREE.PointLight) {
          light.intensity = 0; // Turn off light
      }
       if (sprite instanceof THREE.Sprite) {
           sprite.material.opacity = 0; // Hide sprite
       }
      this.muzzleFlash.visible = false;
    }, 60); // Flash duration in ms
  }


  // --- REMOVED createBullet and updateBullets ---
  // Bullets are now handled via instantaneous raycasts in performRaycast


  // Update method called in the main game loop
  update(delta) {
    // Handle continuous fire for automatic weapons
    if (this.isFiring && this.weapons[this.currentWeaponIndex]?.automatic) {
        this.tryToFire(); // Keep trying to fire based on fire rate
    }

    // Update weapon animations (e.g., sway) - Placeholder
    this.updateWeaponSway(delta);

    // Bullets are handled instantly via raycast, no update needed here
    // this.updateBullets(delta);
  }

  // Placeholder for weapon sway animation
  updateWeaponSway(delta) {
      const swayAmount = 0.005; // Small sway
      const swaySpeed = 4;
      const time = performance.now() * 0.001; // Convert to seconds

      // Apply sway based on player movement (get velocity from playerController)
      const playerVelocity = this.playerController.getVelocity(); // Assumes getVelocity method exists
      const horizontalSpeed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z);

      // Calculate sway offset based on time and speed
      const swayX = Math.sin(time * swaySpeed) * swayAmount * Math.min(1, horizontalSpeed * 0.1);
      const swayY = Math.cos(time * swaySpeed * 0.8) * swayAmount * Math.min(1, horizontalSpeed * 0.1); // Slightly different timing for Y

      // Apply sway to the weapon view model group
      // Smooth interpolation towards target sway
      this.weaponViewModel.position.x += (swayX - this.weaponViewModel.position.x) * 10 * delta;
      this.weaponViewModel.position.y += (swayY - this.weaponViewModel.position.y) * 10 * delta;

      // Bobbing effect based on player movement (can be combined with sway)
      const bobAmount = 0.01;
      const bobSpeed = 10;
      if (this.playerController.canJump && horizontalSpeed > 0.1) { // Only bob when moving on ground
          const bobY = Math.sin(time * bobSpeed) * bobAmount;
          this.weaponViewModel.position.y += bobY;
      }
  }


  // Update ammo UI display
  updateAmmoUI() {
    const weapon = this.weapons[this.currentWeaponIndex];
    const ammoElement = document.getElementById('ammo-counter'); // Get the element by ID

    if (weapon && ammoElement) { // Check if both weapon and element exist
      ammoElement.textContent = `${weapon.ammo} / ${weapon.ammoReserve}`;
      // Optional: Add weapon name or icon
      // console.log(`UI Updated: Ammo: ${weapon.ammo} / ${weapon.ammoReserve}`);
    } else if (!ammoElement) {
        console.warn("Ammo UI element ('#ammo-counter') not found.");
    }
  }


  // --- UPDATE ---
  update(deltaTime) {
    this.updateWeaponSway(deltaTime);
  }

  // --- NEW RESET METHOD ---
  reset() {
      console.log("Resetting Weapon System...");
      this.stopFiring(); // Ensure firing stops
      this.isReloading = false; // Ensure not stuck reloading

      // Reset ammo counts for all weapons
      this.weapons.forEach((weapon, index) => {
          const def = this.weaponDefinitions[index];
          weapon.ammo = def.initialAmmo;
          weapon.ammoReserve = def.initialReserve;
      });

      // Reset to the first weapon
      this.switchWeapon(0); // This also calls updateAmmoUI

      // Clear any active bullets (if using bullet objects - not needed for raycast)
      // this.bullets.forEach(bullet => this.scene.remove(bullet));
      // this.bullets = [];

      // Hide muzzle flash
      if (this.muzzleFlash) this.muzzleFlash.visible = false;

      // Hide impact effects
      this.impactEffects.forEach(impact => impact.visible = false);

      console.log("Weapon System Reset.");
      this.updateAmmoUI(); // Ensure UI is correct after reset
  }

  // Method for HealthSystem to add ammo
  addAmmoToCurrent(amount) {
      if (!this.weapons || this.weapons.length === 0) return false;
      const weapon = this.weapons[this.currentWeaponIndex];
      if (!weapon) return false;

      const maxCanAdd = weapon.maxReserve - weapon.ammoReserve;
      const amountToAdd = Math.min(amount, maxCanAdd);

      if (amountToAdd > 0) {
          weapon.ammoReserve += amountToAdd;
          this.updateAmmoUI();
          console.log(`Added ${amountToAdd} ammo to reserve for ${weapon.name}. New reserve: ${weapon.ammoReserve}`);
          return true; // Indicate ammo was added
      } else {
          console.log(`${weapon.name} ammo reserve is full.`);
          return false; // Indicate ammo was not added (already full)
      }
  }

   // Method for systems to manually update UI if needed (e.g. on resize)
  onResize() {
      // Re-position UI elements if necessary based on new screen size
      // console.log("WeaponSystem received resize event.");
  }
}

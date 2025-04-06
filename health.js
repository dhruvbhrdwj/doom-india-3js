import * as THREE from 'three';

// Health and UI system for FPS game
export class HealthSystem {
  // Modified constructor to accept playerController and weaponSystem
  constructor(playerController, weaponSystem) {
    // Store references to necessary components
    this.playerController = playerController; // Expects object with getPosition() method
    this.weaponSystem = weaponSystem; // Expects object with addAmmoToCurrent(amount) method

    // Health state
    this.maxHealth = 100;
    this.currentHealth = this.maxHealth;
    this.currentArmor = 0; // Initialize armor state
    this.maxArmor = 100; // Max armor value

    // Regeneration state
    this.healthRegenRate = 2; // Health points per second (slowed down)
    this.healthRegenDelay = 5; // Seconds after damage before regeneration starts
    this.lastDamageTime = -Infinity; // Initialize to allow regen immediately if undamaged
    this.isRegenerating = false;
    this.isDead = false; // Player death state

    // Power-ups
    this.powerUps = []; // Array to hold active power-up objects
    this.powerUpSpawnLocations = [ // Store spawn locations for respawning
        { x: -20, z: -30, type: null, respawnTimer: 0 },
        { x: 20, z: -40, type: null, respawnTimer: 0 },
        { x: -30, z: -60, type: null, respawnTimer: 0 },
        { x: 30, z: -70, type: null, respawnTimer: 0 },
        { x: 0, z: -90, type: null, respawnTimer: 0 },
        { x: -50, z: -50, type: null, respawnTimer: 0 },
        { x: 50, z: -50, type: null, respawnTimer: 0 }
    ];
    this.powerUpRespawnTime = 30; // Seconds for power-up to respawn
    this.powerUpPickupDistance = 1.5; // Distance threshold for picking up

    this.powerUpTypes = [
      {
        name: 'Health',
        model: this.createHealthPowerUp(),
        // Use arrow function to maintain 'this' context
        effect: (amount = 25) => this.addHealth(amount)
      },
      {
        name: 'Armor',
        model: this.createArmorPowerUp(),
        effect: (amount = 50) => this.addArmor(amount)
      },
      {
        name: 'Ammo',
        model: this.createAmmoPowerUp(),
        // Effect now calls internal method which calls weaponSystem
        effect: (amount = 30) => this.addAmmo(amount)
      }
    ];

    // UI elements - Ensure these are created properly
    this.setupUI();

    // Damage overlay
    this.createDamageOverlay();

    // Pickup message element
    this.createPickupMessageElement();

    // Initialize power-ups on creation
    this.initializePowerUps();

    console.log("Health System Initialized");
  }

  // --- Model Creation (Keep as is) ---
  createHealthPowerUp() {
    const powerUp = new THREE.Group();
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    powerUp.add(base);
    const crossMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3, metalness: 0.7, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const verticalGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const verticalPart = new THREE.Mesh(verticalGeometry, crossMaterial);
    verticalPart.position.y = 0.6;
    powerUp.add(verticalPart);
    const horizontalGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
    const horizontalPart = new THREE.Mesh(horizontalGeometry, crossMaterial);
    horizontalPart.position.y = 0.6;
    powerUp.add(horizontalPart);
    powerUp.userData = { type: 'Health', rotationSpeed: 1, bounceHeight: 0.2, bounceSpeed: 2, originalY: 0, animationTime: Math.random() * 10 }; // Add type and random start time
    powerUp.castShadow = true;
    return powerUp;
  }

  createArmorPowerUp() {
    const powerUp = new THREE.Group();
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    powerUp.add(base);
    const shieldGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shieldMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1, roughness: 0.3, metalness: 0.8, emissive: 0x4169E1, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.y = 0.6;
    shield.rotation.x = Math.PI;
    powerUp.add(shield);
    const emblemGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.05);
    const emblemMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.3, metalness: 0.9 });
    const emblem = new THREE.Mesh(emblemGeometry, emblemMaterial);
    emblem.position.set(0, 0.6, 0.2);
    powerUp.add(emblem);
    powerUp.userData = { type: 'Armor', rotationSpeed: 1, bounceHeight: 0.2, bounceSpeed: 2, originalY: 0, animationTime: Math.random() * 10 };
    powerUp.castShadow = true;
    return powerUp;
  }

  createAmmoPowerUp() {
    const powerUp = new THREE.Group();
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.5 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    powerUp.add(base);
    const bulletGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.9, emissive: 0xFFD700, emissiveIntensity: 0.3 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.y = 0.6;
    bullet.rotation.x = Math.PI / 2;
    powerUp.add(bullet);
    const tipGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({ color: 0xB8860B, roughness: 0.3, metalness: 0.9 });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, 0.6, 0.35);
    tip.rotation.x = Math.PI / 2;
    powerUp.add(tip);
    powerUp.userData = { type: 'Ammo', rotationSpeed: 1, bounceHeight: 0.2, bounceSpeed: 2, originalY: 0, animationTime: Math.random() * 10 };
     powerUp.castShadow = true;
    return powerUp;
  }

  // --- UI Setup and Updates ---

  setupUI() {
    // Ensure container exists or create it
    let uiContainer = document.getElementById('game-ui-container');
    if (!uiContainer) {
        uiContainer = document.createElement('div');
        uiContainer.id = 'game-ui-container';
        uiContainer.style.position = 'fixed';
        uiContainer.style.bottom = '0';
        uiContainer.style.left = '0';
        uiContainer.style.width = '100%';
        uiContainer.style.height = '100px'; // Adjust height as needed
        uiContainer.style.pointerEvents = 'none'; // Allow clicks through UI
        uiContainer.style.zIndex = '100';
        document.body.appendChild(uiContainer);
    }

    // Health Bar
    let healthBarContainer = document.getElementById('health-bar');
    if (!healthBarContainer) {
        healthBarContainer = document.createElement('div');
        healthBarContainer.id = 'health-bar';
        healthBarContainer.style.position = 'absolute';
        healthBarContainer.style.bottom = '20px';
        healthBarContainer.style.left = '20px';
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '20px';
        healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        healthBarContainer.style.border = '2px solid #fff';
        healthBarContainer.style.borderRadius = '5px';
        uiContainer.appendChild(healthBarContainer);

        const healthValue = document.createElement('div');
        healthValue.id = 'health-value';
        healthValue.style.height = '100%';
        healthValue.style.width = '100%'; // Start full
        healthValue.style.backgroundColor = '#ff0000'; // Red
        healthValue.style.transition = 'width 0.3s ease';
        healthValue.style.borderRadius = '3px';
        healthBarContainer.appendChild(healthValue);
    }


    // Armor Bar
     let armorBarContainer = document.getElementById('armor-bar');
     if (!armorBarContainer) {
        armorBarContainer = document.createElement('div');
        armorBarContainer.id = 'armor-bar';
        armorBarContainer.style.position = 'absolute';
        armorBarContainer.style.bottom = '45px'; // Position above health bar
        armorBarContainer.style.left = '20px';
        armorBarContainer.style.width = '200px';
        armorBarContainer.style.height = '15px';
        armorBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        armorBarContainer.style.border = '2px solid #fff';
        armorBarContainer.style.borderRadius = '5px';
        uiContainer.appendChild(armorBarContainer);

        const armorValue = document.createElement('div');
        armorValue.id = 'armor-value';
        armorValue.style.height = '100%';
        armorValue.style.width = '0%'; // Start empty
        armorValue.style.backgroundColor = '#4169E1'; // Royal blue
        armorValue.style.transition = 'width 0.3s ease';
        armorValue.style.borderRadius = '3px';
        armorBarContainer.appendChild(armorValue);
    }

    // Stats Text (Health/Armor numbers)
    let statsContainer = document.getElementById('stats-container');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'stats-container';
        statsContainer.style.position = 'absolute';
        statsContainer.style.bottom = '20px';
        statsContainer.style.left = '230px'; // Position next to bars
        statsContainer.style.color = 'white';
        statsContainer.style.fontFamily = "'Press Start 2P', cursive"; // Use a game font
        statsContainer.style.fontSize = '16px'; // Adjust size
        statsContainer.style.textShadow = '1px 1px 2px #000';
        uiContainer.appendChild(statsContainer);

        const healthText = document.createElement('div');
        healthText.id = 'health-text';
        healthText.style.marginBottom = '5px';
        statsContainer.appendChild(healthText);

        const armorText = document.createElement('div');
        armorText.id = 'armor-text';
        statsContainer.appendChild(armorText);
    }

    // Crosshair
    this.updateCrosshair(); // Create/update crosshair

    // Initial UI update based on state
    this.updateUI();
  }

  updateUI() {
    // Update health bar and text
    const healthValue = document.getElementById('health-value');
    const healthText = document.getElementById('health-text');
    if (healthValue) healthValue.style.width = `${(this.currentHealth / this.maxHealth) * 100}%`;
    if (healthText) healthText.innerHTML = `HP: ${Math.round(this.currentHealth)}`;

    // Update armor bar and text
    const armorValue = document.getElementById('armor-value');
    const armorText = document.getElementById('armor-text');
    if (armorValue) armorValue.style.width = `${(this.currentArmor / this.maxArmor) * 100}%`;
    if (armorText) armorText.innerHTML = `AP: ${Math.round(this.currentArmor)}`;

    // Note: Weapon UI (ammo, name) should be updated by WeaponSystem.js
  }

  createDamageOverlay() {
    let overlay = document.getElementById('damage-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'damage-overlay';
        overlay.style.position = 'fixed'; // Use fixed for full screen coverage
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '99'; // Below menus but above game
        overlay.style.transition = 'background-color 0.5s ease';
        document.body.appendChild(overlay);
    }
  }

  createPickupMessageElement() {
      let pickupMsg = document.getElementById('pickup-message');
      if (!pickupMsg) {
          pickupMsg = document.createElement('div');
          pickupMsg.id = 'pickup-message';
          pickupMsg.style.position = 'fixed';
          pickupMsg.style.bottom = '120px'; // Position above health/ammo UI
          pickupMsg.style.left = '50%';
          pickupMsg.style.transform = 'translateX(-50%)';
          pickupMsg.style.padding = '10px 20px';
          pickupMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          pickupMsg.style.color = 'white';
          pickupMsg.style.fontFamily = "'Press Start 2P', cursive";
          pickupMsg.style.fontSize = '14px';
          pickupMsg.style.borderRadius = '5px';
          pickupMsg.style.textShadow = '1px 1px 1px #000';
          pickupMsg.style.opacity = '0'; // Start hidden
          pickupMsg.style.transition = 'opacity 0.5s ease';
          pickupMsg.style.zIndex = '101';
          document.body.appendChild(pickupMsg);
      }
  }

  updateCrosshair() {
    // Remove existing crosshair if it exists
    const oldCrosshair = document.getElementById('crosshair');
    if (oldCrosshair) oldCrosshair.remove();

    // Create new crosshair container
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.position = 'fixed'; // Use fixed positioning
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '100';

    // Simple dot crosshair
    const dotSize = 4;
    const centerDot = document.createElement('div');
    centerDot.style.width = `${dotSize}px`;
    centerDot.style.height = `${dotSize}px`;
    centerDot.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white
    centerDot.style.borderRadius = '50%';
    centerDot.style.boxShadow = '0 0 3px 1px rgba(0, 0, 0, 0.5)'; // Soft shadow
    crosshair.appendChild(centerDot);

    document.body.appendChild(crosshair);
  }

  // --- Power-up Management ---

  initializePowerUps() {
    console.log("Initializing power-ups...");
    this.powerUps = []; // Clear existing powerups in memory
    // Remove existing models from scene if any (e.g., during reset)
     this.powerUpSpawnLocations.forEach(locData => {
         if(locData.activeModel) {
             if(this.playerController.scene) this.playerController.scene.remove(locData.activeModel); // Access scene via playerController if needed
             locData.activeModel = null;
         }
         locData.respawnTimer = 0; // Reset timer
         this.spawnPowerUpAtLocation(locData); // Spawn initial set
     });
  }

  // Spawns a power-up at a specific pre-defined location object
  spawnPowerUpAtLocation(locationData) {
      if (locationData.activeModel) return; // Don't spawn if already active

      // Choose a random power-up type
      const typeIndex = Math.floor(Math.random() * this.powerUpTypes.length);
      const powerUpType = this.powerUpTypes[typeIndex];

      // Create the power-up object
      const powerUp = {
          type: powerUpType.name,
          effect: powerUpType.effect,
          model: powerUpType.model.clone(), // Clone the template model
          position: new THREE.Vector3(locationData.x, 1, locationData.z), // Use location coords, Y=1 for ground level
          spawnLocationData: locationData // Link back to the spawn location data
      };

      // Position the model and store original Y for animation
      powerUp.model.position.copy(powerUp.position);
      powerUp.model.userData.originalY = powerUp.position.y;
      powerUp.model.userData.animationTime = Math.random() * 10; // Randomize animation start

      // Link powerup object to model for collision checks
      powerUp.model.userData.powerUpObject = powerUp;

      // Add to scene (assuming scene access - might need reference)
      // If scene isn't stored, access via playerController if possible
      if (this.playerController.scene) {
         this.playerController.scene.add(powerUp.model);
         locationData.activeModel = powerUp.model; // Track the active model for this location
      } else {
          console.error("HealthSystem: Cannot access scene to add power-up model.");
      }


      // Add to active power-ups array
      this.powerUps.push(powerUp);
      // console.log(`Spawned ${powerUp.type} at ${locationData.x}, ${locationData.z}`);
  }

  // --- Health and Damage Logic ---

  takeDamage(amount) {
    if (this.isDead) return; // Can't take damage if already dead

    // Record the time of damage
    this.lastDamageTime = performance.now() / 1000;
    this.isRegenerating = false; // Stop regeneration on damage

    let damageToHealth = amount;

    // Apply damage to armor first if available
    if (this.currentArmor > 0) {
      // Armor absorbs some damage (e.g., 50% or a flat amount per point)
      const armorAbsorptionRatio = 0.6; // Armor absorbs 60%
      const damageAbsorbedByArmor = Math.min(this.currentArmor, amount * armorAbsorptionRatio);
      const damageToArmor = Math.min(this.currentArmor, amount); // Armor takes full hit up to its value

      this.currentArmor -= damageToArmor;
      damageToHealth = amount - damageAbsorbedByArmor; // Health takes the rest

      // Ensure armor doesn't go below zero
      this.currentArmor = Math.max(0, this.currentArmor);
    }

    // Apply remaining damage to health
    this.currentHealth -= damageToHealth;
    this.currentHealth = Math.max(0, this.currentHealth); // Ensure health doesn't go below zero

    // Update UI
    this.updateUI();

    // Show damage effect
    this.showDamageEffect();

    // Check if player is dead
    if (this.currentHealth <= 0) {
      this.playerDeath();
    }
  }

  showDamageEffect() {
    // Flash the screen red
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; // More visible flash
        // Fade out using transition defined in CSS/JS setup
        setTimeout(() => {
          if(overlay) overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 150); // Faster fade out
    }

    // Add screen shake effect (using camera offset if possible, else body)
    // This requires access to modify camera position slightly or playerController's camera handling
    // Simple body shake kept for now:
    const intensity = 5; // Pixel intensity
    const duration = 200; // ms
    const startTime = performance.now();

    function shake() {
        const elapsed = performance.now() - startTime;
        if (elapsed < duration) {
            const x = (Math.random() - 0.5) * 2 * intensity * (1 - elapsed / duration); // Dampen effect
            const y = (Math.random() - 0.5) * 2 * intensity * (1 - elapsed / duration);
            document.body.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        } else {
            document.body.style.transform = 'none'; // Reset transform
        }
    }
    requestAnimationFrame(shake);
  }

  addHealth(amount) {
    if (this.isDead || this.currentHealth >= this.maxHealth) return; // Don't add if dead or already full

    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.updateUI();
    this.showPickupEffect(`+${amount} Health`, '#00ff00'); // Green color
  }

  addArmor(amount) {
    if (this.isDead || this.currentArmor >= this.maxArmor) return; // Don't add if dead or already full

    this.currentArmor = Math.min(this.maxArmor, this.currentArmor + amount);
    this.updateUI();
    this.showPickupEffect(`+${amount} Armor`, '#4169E1'); // Blue color
  }

  // Calls the weapon system to add ammo
  addAmmo(amount) {
      if (this.isDead || !this.weaponSystem) return;
      const ammoAdded = this.weaponSystem.addAmmoToCurrent(amount); // Assumes method returns actual amount added or confirms addition
      if (ammoAdded) { // Only show pickup if ammo was actually added (e.g., not already max)
          this.showPickupEffect(`+${amount} Ammo`, '#FFD700'); // Gold color
      }
  }

  showPickupEffect(message, color = 'white') {
      const pickupMsg = document.getElementById('pickup-message');
      if (pickupMsg) {
          pickupMsg.textContent = message;
          pickupMsg.style.color = color;
          pickupMsg.style.opacity = '1';

          // Clear previous timeout if exists
          if (pickupMsg.timeoutId) {
              clearTimeout(pickupMsg.timeoutId);
          }

          // Fade out after a delay
          pickupMsg.timeoutId = setTimeout(() => {
              pickupMsg.style.opacity = '0';
              pickupMsg.timeoutId = null; // Clear the stored ID
          }, 2000); // Show message for 2 seconds
      }
  }


  playerDeath() {
    if (this.isDead) return; // Prevent multiple death triggers
    console.log("Player has died!");
    this.isDead = true;
    this.currentHealth = 0; // Ensure health is 0
    this.updateUI();
    // Trigger game over logic (e.g., by returning true from isPlayerDead or calling a callback)
    // The main game loop in index.js should check isPlayerDead()
  }

  isPlayerDead() {
    return this.isDead;
  }

  // --- Update Loop ---
  update(deltaTime) {
    if (this.isDead) return; // Don't update if player is dead

    const currentTime = performance.now() / 1000;

    // --- Health Regeneration ---
    if (!this.isRegenerating && currentTime - this.lastDamageTime > this.healthRegenDelay) {
      this.isRegenerating = true;
      // console.log("Health regeneration started.");
    }

    if (this.isRegenerating && this.currentHealth < this.maxHealth) {
      const healthToAdd = this.healthRegenRate * deltaTime;
      this.currentHealth = Math.min(this.maxHealth, this.currentHealth + healthToAdd);
      this.updateUI(); // Update UI as health regenerates
    } else if (this.currentHealth >= this.maxHealth) {
        this.isRegenerating = false; // Stop regenerating if full
    }

    // --- Power-up Animation and Collision ---
    const playerPos = this.playerController.getPosition(); // Get player position

    // Iterate backwards for safe removal
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];

      // Animate (rotation and bounce)
      powerUp.model.userData.animationTime += deltaTime;
      powerUp.model.rotation.y += powerUp.model.userData.rotationSpeed * deltaTime;
      powerUp.model.position.y = powerUp.model.userData.originalY + Math.sin(powerUp.model.userData.animationTime * powerUp.model.userData.bounceSpeed) * powerUp.model.userData.bounceHeight;

      // Check collision with player
      const distanceToPlayer = playerPos.distanceTo(powerUp.position);

      if (distanceToPlayer < this.powerUpPickupDistance) {
        // Collision detected - apply effect, remove power-up
        console.log(`Picked up ${powerUp.type}`);
        powerUp.effect(); // Call the stored effect function

        // Remove model from scene
         if (this.playerController.scene) {
             this.playerController.scene.remove(powerUp.model);
         }

        // Mark spawn location for respawn timer
        powerUp.spawnLocationData.activeModel = null; // No active model here now
        powerUp.spawnLocationData.respawnTimer = this.powerUpRespawnTime; // Start respawn timer

        // Remove from active power-ups array
        this.powerUps.splice(i, 1);
      }
    }

     // --- Power-up Respawner ---
     this.powerUpSpawnLocations.forEach(locData => {
         if (!locData.activeModel && locData.respawnTimer > 0) {
             locData.respawnTimer -= deltaTime;
             if (locData.respawnTimer <= 0) {
                 this.spawnPowerUpAtLocation(locData); // Respawn
             }
         }
     });
  }

  // --- Reset Method ---
  reset() {
    console.log("Resetting Health System...");
    this.currentHealth = this.maxHealth;
    this.currentArmor = 0;
    this.isDead = false;
    this.lastDamageTime = -Infinity;
    this.isRegenerating = false;

    // Clear existing power-ups from scene and array
    this.powerUps.forEach(p => {
       if (this.playerController.scene) this.playerController.scene.remove(p.model);
    });
    this.powerUps = [];

    // Re-initialize power-ups (clears old models and spawns new ones)
    this.initializePowerUps();

    // Reset UI
    this.updateUI();
    // Ensure damage overlay is clear
    const overlay = document.getElementById('damage-overlay');
    if(overlay) overlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
     // Ensure pickup message is hidden
    const pickupMsg = document.getElementById('pickup-message');
    if(pickupMsg) pickupMsg.style.opacity = '0';

    console.log("Health System Reset.");
  }

  // Method for systems to manually update UI if needed (e.g. on resize)
  onResize() {
      // Re-position UI elements if necessary based on new screen size
      // Currently using absolute/fixed positioning, might not need changes
      // unless complex layout is involved.
      // console.log("HealthSystem received resize event.");
  }
}
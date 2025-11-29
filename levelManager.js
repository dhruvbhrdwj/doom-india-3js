import * as THREE from 'three';

// Level Manager - Handles level progression, enemy spawning, and transitions
export class LevelManager {
    constructor(scene, enemySystem, playerController, weaponSystem) {
        this.scene = scene;
        this.enemySystem = enemySystem;
        this.playerController = playerController;
        this.weaponSystem = weaponSystem;

        // Level state
        this.currentLevel = 1;
        this.maxLevels = 3;
        this.levelComplete = false;
        this.gameWon = false;
        this.bossSpawned = false;
        this.bossDefeated = false;

        // Level configurations
        this.levelConfigs = {
            1: {
                name: 'Temple Grounds',
                description: 'Clear the ancient temple grounds of demons',
                enemyCount: 6,
                enemyTypes: ['Rakshasa', 'Naga'], // Only basic enemies
                theme: 'sandstone',
                skyColor: 0x87CEEB, // Light blue sky
                ambientColor: 0xffffff,
                ambientIntensity: 0.6,
                groundColor: 0xD2B48C, // Sandy
                spawnBoss: false
            },
            2: {
                name: 'Royal Palace',
                description: 'Fight through the corrupted palace',
                enemyCount: 10,
                enemyTypes: ['Rakshasa', 'Asura', 'Naga'], // All enemy types
                theme: 'marble',
                skyColor: 0xFFA07A, // Warm sunset
                ambientColor: 0xfff0e0,
                ambientIntensity: 0.5,
                groundColor: 0xFFFAFA, // Marble white
                spawnBoss: false
            },
            3: {
                name: 'Dark Fortress',
                description: 'Defeat the Giant Demon to save India!',
                enemyCount: 4, // Fewer minions
                enemyTypes: ['Asura', 'Rakshasa'],
                theme: 'redstone',
                skyColor: 0x4A0000, // Dark red sky
                ambientColor: 0xff6666,
                ambientIntensity: 0.4,
                groundColor: 0x8B0000, // Dark red
                spawnBoss: true
            }
        };

        // Portal for level transitions
        this.portal = null;
        this.portalActive = false;

        // UI elements
        this.levelUI = null;
        this.enemiesRemainingUI = null;

        // Audio context reference (will be set from weaponSystem)
        this.audioContext = null;

        this.setupUI();
        console.log("Level Manager Initialized");
    }

    // Set audio context from weapon system
    setAudioContext(ctx) {
        this.audioContext = ctx;
    }

    // Setup level-related UI elements
    setupUI() {
        // Get or create UI container
        let uiContainer = document.getElementById('game-ui-container');
        if (!uiContainer) {
            uiContainer = document.createElement('div');
            uiContainer.id = 'game-ui-container';
            uiContainer.style.position = 'fixed';
            uiContainer.style.bottom = '0';
            uiContainer.style.left = '0';
            uiContainer.style.width = '100%';
            uiContainer.style.height = '120px';
            uiContainer.style.pointerEvents = 'none';
            uiContainer.style.zIndex = '100';
            document.body.appendChild(uiContainer);
        }

        // Level indicator (top-left)
        this.levelUI = document.createElement('div');
        this.levelUI.id = 'level-indicator';
        this.levelUI.style.position = 'fixed';
        this.levelUI.style.top = '20px';
        this.levelUI.style.left = '20px';
        this.levelUI.style.color = 'white';
        this.levelUI.style.fontFamily = "'Press Start 2P', monospace";
        this.levelUI.style.fontSize = '16px';
        this.levelUI.style.textShadow = '2px 2px 4px #000';
        this.levelUI.style.zIndex = '101';
        document.body.appendChild(this.levelUI);

        // Enemies remaining (top-right)
        this.enemiesRemainingUI = document.createElement('div');
        this.enemiesRemainingUI.id = 'enemies-remaining';
        this.enemiesRemainingUI.style.position = 'fixed';
        this.enemiesRemainingUI.style.top = '20px';
        this.enemiesRemainingUI.style.right = '20px';
        this.enemiesRemainingUI.style.color = 'white';
        this.enemiesRemainingUI.style.fontFamily = "'Press Start 2P', monospace";
        this.enemiesRemainingUI.style.fontSize = '14px';
        this.enemiesRemainingUI.style.textShadow = '2px 2px 4px #000';
        this.enemiesRemainingUI.style.zIndex = '101';
        document.body.appendChild(this.enemiesRemainingUI);

        // Level announcement overlay
        this.levelAnnouncement = document.createElement('div');
        this.levelAnnouncement.id = 'level-announcement';
        this.levelAnnouncement.style.position = 'fixed';
        this.levelAnnouncement.style.top = '50%';
        this.levelAnnouncement.style.left = '50%';
        this.levelAnnouncement.style.transform = 'translate(-50%, -50%)';
        this.levelAnnouncement.style.color = 'white';
        this.levelAnnouncement.style.fontFamily = "'Press Start 2P', monospace";
        this.levelAnnouncement.style.fontSize = '24px';
        this.levelAnnouncement.style.textAlign = 'center';
        this.levelAnnouncement.style.textShadow = '3px 3px 6px #000';
        this.levelAnnouncement.style.zIndex = '200';
        this.levelAnnouncement.style.opacity = '0';
        this.levelAnnouncement.style.transition = 'opacity 0.5s ease';
        this.levelAnnouncement.style.pointerEvents = 'none';
        document.body.appendChild(this.levelAnnouncement);

        this.updateUI();
    }

    // Update UI elements
    updateUI() {
        const config = this.levelConfigs[this.currentLevel];
        
        if (this.levelUI) {
            this.levelUI.innerHTML = `Level ${this.currentLevel}/${this.maxLevels}<br><span style="font-size:12px;color:#ffd700;">${config.name}</span>`;
        }

        if (this.enemiesRemainingUI) {
            const remaining = this.getEnemiesRemaining();
            const bossText = this.currentLevel === 3 && !this.bossDefeated && this.bossSpawned ? ' + BOSS' : '';
            this.enemiesRemainingUI.innerHTML = `Enemies: ${remaining}${bossText}`;
        }
    }

    // Get number of remaining enemies
    getEnemiesRemaining() {
        if (!this.enemySystem) return 0;
        return this.enemySystem.enemies.filter(e => e.state !== 'dying').length;
    }

    // Start a specific level
    startLevel(levelNum) {
        console.log(`Starting Level ${levelNum}`);
        this.currentLevel = levelNum;
        this.levelComplete = false;
        this.bossSpawned = false;
        this.bossDefeated = false;

        const config = this.levelConfigs[levelNum];

        // Clear existing enemies
        if (this.enemySystem) {
            this.enemySystem.clearAllEnemies();
            this.enemySystem.killCount = 0;
        }

        // Remove portal if exists
        this.removePortal();

        // Apply level theme
        this.applyLevelTheme(config);

        // Reset player position
        if (this.playerController) {
            this.playerController.reset();
        }

        // Show level announcement
        this.showLevelAnnouncement(config);

        // Spawn enemies after a short delay
        setTimeout(() => {
            this.spawnLevelEnemies(config);
        }, 2000);

        this.updateUI();
    }

    // Apply visual theme for the level
    applyLevelTheme(config) {
        // Update scene background
        if (this.scene) {
            this.scene.background = new THREE.Color(config.skyColor);
        }

        // Update ambient light
        const ambientLight = this.scene.children.find(child => child instanceof THREE.AmbientLight);
        if (ambientLight) {
            ambientLight.color.setHex(config.ambientColor);
            ambientLight.intensity = config.ambientIntensity;
        }

        // Emit theme change event for other systems
        window.dispatchEvent(new CustomEvent('levelThemeChange', { detail: config }));
    }

    // Show level announcement
    showLevelAnnouncement(config) {
        if (this.levelAnnouncement) {
            this.levelAnnouncement.innerHTML = `
                <div style="font-size:32px;margin-bottom:20px;">LEVEL ${this.currentLevel}</div>
                <div style="font-size:20px;color:#ffd700;">${config.name}</div>
                <div style="font-size:14px;margin-top:15px;color:#ccc;">${config.description}</div>
            `;
            this.levelAnnouncement.style.opacity = '1';

            // Fade out after 3 seconds
            setTimeout(() => {
                if (this.levelAnnouncement) {
                    this.levelAnnouncement.style.opacity = '0';
                }
            }, 3000);
        }
    }

    // Spawn enemies for the current level
    spawnLevelEnemies(config) {
        if (!this.enemySystem) return;

        // Configure enemy system for this level
        this.enemySystem.maxEnemies = config.enemyCount;
        
        // Spawn all enemies at once for level-based gameplay
        for (let i = 0; i < config.enemyCount; i++) {
            setTimeout(() => {
                this.enemySystem.spawnEnemy();
            }, i * 500); // Stagger spawns
        }

        // Spawn boss on level 3 after minions
        if (config.spawnBoss) {
            setTimeout(() => {
                this.spawnBoss();
            }, config.enemyCount * 500 + 2000);
        }
    }

    // Spawn the boss enemy
    spawnBoss() {
        if (!this.enemySystem || this.bossSpawned) return;

        console.log("SPAWNING BOSS!");
        this.bossSpawned = true;

        // Play boss spawn sound
        this.playBossSpawnSound();

        // Show boss warning
        this.showBossWarning();

        // Spawn the boss via enemy system
        this.enemySystem.spawnBoss();

        this.updateUI();
    }

    // Show boss warning
    showBossWarning() {
        if (this.levelAnnouncement) {
            this.levelAnnouncement.innerHTML = `
                <div style="font-size:28px;color:#ff0000;animation:pulse 0.5s infinite;">⚠ WARNING ⚠</div>
                <div style="font-size:24px;margin-top:10px;color:#ff6666;">GIANT DEMON APPROACHES!</div>
            `;
            this.levelAnnouncement.style.opacity = '1';

            setTimeout(() => {
                if (this.levelAnnouncement) {
                    this.levelAnnouncement.style.opacity = '0';
                }
            }, 3000);
        }

        // Add CSS animation for pulse effect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Play boss spawn sound
    playBossSpawnSound() {
        const ctx = this.audioContext || (this.weaponSystem && this.weaponSystem.audioContext);
        if (!ctx) return;

        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const duration = 1.5;

        // Deep rumbling sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(50, now);
        osc1.frequency.exponentialRampToValueAtTime(30, now + duration);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(40, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    // Create level transition portal
    createPortal(position) {
        if (this.portal) return;

        // Create glowing ring portal
        const portalGroup = new THREE.Group();

        // Outer ring
        const ringGeometry = new THREE.TorusGeometry(3, 0.3, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        portalGroup.add(ring);

        // Inner swirling effect
        const innerGeometry = new THREE.CircleGeometry(2.5, 32);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.rotation.x = -Math.PI / 2;
        inner.position.y = 0.1;
        portalGroup.add(inner);

        // Point light for glow effect
        const light = new THREE.PointLight(0x00ffff, 2, 15);
        light.position.y = 2;
        portalGroup.add(light);

        portalGroup.position.copy(position);
        portalGroup.position.y = 0.5;

        this.portal = portalGroup;
        this.portalActive = true;
        this.scene.add(this.portal);

        // Play portal spawn sound
        this.playPortalSound();

        console.log("Portal created at", position);
    }

    // Remove portal
    removePortal() {
        if (this.portal) {
            this.scene.remove(this.portal);
            this.portal = null;
            this.portalActive = false;
        }
    }

    // Play portal activation sound
    playPortalSound() {
        const ctx = this.audioContext || (this.weaponSystem && this.weaponSystem.audioContext);
        if (!ctx) return;

        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const duration = 0.8;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + duration);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Check if player is near portal
    checkPortalCollision() {
        if (!this.portal || !this.portalActive || !this.playerController) return false;

        const playerPos = this.playerController.getPosition();
        const portalPos = this.portal.position;
        const distance = playerPos.distanceTo(portalPos);

        return distance < 4; // Portal interaction radius
    }

    // Handle level completion
    onLevelComplete() {
        if (this.levelComplete) return;

        console.log(`Level ${this.currentLevel} Complete!`);
        this.levelComplete = true;

        // Show completion message
        if (this.levelAnnouncement) {
            this.levelAnnouncement.innerHTML = `
                <div style="font-size:28px;color:#00ff00;">LEVEL COMPLETE!</div>
                <div style="font-size:16px;margin-top:15px;">Enter the portal to continue...</div>
            `;
            this.levelAnnouncement.style.opacity = '1';

            setTimeout(() => {
                if (this.levelAnnouncement) {
                    this.levelAnnouncement.style.opacity = '0';
                }
            }, 4000);
        }

        // Create portal at a visible location
        const portalPosition = new THREE.Vector3(0, 0, 0);
        this.createPortal(portalPosition);
    }

    // Handle boss defeated
    onBossDefeated() {
        console.log("BOSS DEFEATED!");
        this.bossDefeated = true;
        this.gameWon = true;

        // Show victory screen
        this.showVictoryScreen();
    }

    // Show victory screen
    showVictoryScreen() {
        // Create victory overlay
        const victoryScreen = document.createElement('div');
        victoryScreen.id = 'victory-screen';
        victoryScreen.style.position = 'fixed';
        victoryScreen.style.top = '0';
        victoryScreen.style.left = '0';
        victoryScreen.style.width = '100%';
        victoryScreen.style.height = '100%';
        victoryScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        victoryScreen.style.display = 'flex';
        victoryScreen.style.flexDirection = 'column';
        victoryScreen.style.justifyContent = 'center';
        victoryScreen.style.alignItems = 'center';
        victoryScreen.style.zIndex = '300';
        victoryScreen.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace;color:#ffd700;font-size:48px;text-shadow:4px 4px 8px #000;">
                VICTORY!
            </div>
            <div style="font-family:'Press Start 2P',monospace;color:#fff;font-size:20px;margin-top:30px;">
                You have defeated the Giant Demon!
            </div>
            <div style="font-family:'Press Start 2P',monospace;color:#ccc;font-size:14px;margin-top:40px;">
                India is saved!
            </div>
            <button id="victory-restart" style="
                margin-top:50px;
                padding:15px 30px;
                font-family:'Press Start 2P',monospace;
                font-size:14px;
                cursor:pointer;
                background:#ffd700;
                border:none;
                border-radius:5px;
            ">PLAY AGAIN</button>
        `;
        document.body.appendChild(victoryScreen);

        // Play victory sound
        this.playVictorySound();

        // Add restart button handler
        document.getElementById('victory-restart').addEventListener('click', () => {
            document.body.removeChild(victoryScreen);
            this.reset();
            this.startLevel(1);
        });
    }

    // Play victory sound
    playVictorySound() {
        const ctx = this.audioContext || (this.weaponSystem && this.weaponSystem.audioContext);
        if (!ctx) return;

        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        // Victory fanfare - ascending notes
        const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.2);

            gain.gain.setValueAtTime(0.2, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.3);
        });
    }

    // Main update loop
    update(deltaTime) {
        // Animate portal
        if (this.portal && this.portalActive) {
            this.portal.rotation.y += deltaTime * 2;
            
            // Pulse the inner circle
            const inner = this.portal.children[1];
            if (inner) {
                inner.material.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.3;
            }
        }

        // Check for level completion
        if (!this.levelComplete && this.getEnemiesRemaining() === 0) {
            // Check if boss level and boss needs to spawn
            if (this.currentLevel === 3 && !this.bossSpawned) {
                // Boss hasn't spawned yet, wait for it
            } else if (this.currentLevel === 3 && this.bossSpawned && !this.bossDefeated) {
                // Boss spawned but not defeated yet
            } else if (this.currentLevel === 3 && this.bossDefeated) {
                this.onBossDefeated();
            } else {
                // Regular level complete
                this.onLevelComplete();
            }
        }

        // Check portal collision for level transition
        if (this.portalActive && this.checkPortalCollision()) {
            this.transitionToNextLevel();
        }

        // Update UI
        this.updateUI();
    }

    // Transition to next level
    transitionToNextLevel() {
        if (this.currentLevel >= this.maxLevels) {
            // Game complete - should have triggered victory already
            return;
        }

        this.portalActive = false;
        this.removePortal();

        // Fade to black and start next level
        const fadeOverlay = document.createElement('div');
        fadeOverlay.style.position = 'fixed';
        fadeOverlay.style.top = '0';
        fadeOverlay.style.left = '0';
        fadeOverlay.style.width = '100%';
        fadeOverlay.style.height = '100%';
        fadeOverlay.style.backgroundColor = 'black';
        fadeOverlay.style.opacity = '0';
        fadeOverlay.style.transition = 'opacity 0.5s ease';
        fadeOverlay.style.zIndex = '250';
        document.body.appendChild(fadeOverlay);

        // Fade in
        setTimeout(() => {
            fadeOverlay.style.opacity = '1';
        }, 50);

        // Start next level
        setTimeout(() => {
            this.startLevel(this.currentLevel + 1);
            
            // Fade out
            setTimeout(() => {
                fadeOverlay.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(fadeOverlay);
                }, 500);
            }, 500);
        }, 600);
    }

    // Reset level manager
    reset() {
        this.currentLevel = 1;
        this.levelComplete = false;
        this.gameWon = false;
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.removePortal();
        this.updateUI();
    }
}


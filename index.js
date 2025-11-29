import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PlayerController } from './player.js';
import { CollisionSystem } from './collision.js';
import { createIndianGround, updateGroundTheme } from './ground.js';
import { createIndianSkybox, updateSkyboxTheme } from './skybox.js';
// import { createIndianStructures } from './structures.js'; // Likely redundant
import { IndianArchitecturalElements } from './indianArchitecture.js';
import { WeaponSystem } from './weapons.js';
import { EnemySystem } from './enemies.js';
import { HealthSystem } from './health.js';
import { LevelManager } from './levelManager.js';

// --- Basic Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Basic sky blue background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500); // Increased far plane
// --- FIX: Set Initial Camera Position ---
// Set this *before* creating PlayerController, which might use it internally or via reset()
camera.position.set(0, 0, 50); // Example starting position: x=0, y=15 (above ground), z=50 (back from origin)
camera.lookAt(0, 10, 0); // Look towards a point slightly below horizon
console.log('Initial Camera Position Set To:', camera.position);
// -----------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const clock = new THREE.Clock();

// --- Game State ---
let gameStarted = false;
let gamePaused = true;
let gameOver = false;
let score = 0;

// --- UI Elements ---
// Assuming these elements exist in your HTML
const loadingScreen = document.getElementById('loadingScreen');
const loadingText = document.getElementById('loadingText');
const startButton = document.getElementById('startButton');
const controlsButton = document.getElementById('controlsButton');
const controlsScreen = document.getElementById('controlsScreen');
const backButton = document.getElementById('backButton');
const pauseMenu = document.getElementById('pauseMenu');
const resumeButton = document.getElementById('resumeButton');
const restartButton = document.getElementById('restartButton');
const quitButton = document.getElementById('quitButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreText = document.getElementById('finalScoreText');
const gameOverRestartButton = document.getElementById('gameOverRestartButton');
const gameOverQuitButton = document.getElementById('gameOverQuitButton');
// Ensure crosshair element exists if PlayerController uses it
// const crosshair = document.getElementById('crosshair');

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffa95c, 1.5);
directionalLight.position.set(-80, 100, -50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);
// scene.add(directionalLight.target); // Target defaults to (0,0,0)
// const helper = new THREE.CameraHelper( directionalLight.shadow.camera ); // Optional debug
// scene.add( helper );

// --- World Setup ---
const collisionSystem = new CollisionSystem();

const ground = createIndianGround();
if (ground) {
    console.log(`Ground Mesh Position Y HERE.......: ${ground.position.y}`);
    scene.add(ground);
    // Add ground with specific type for collision logic if needed
    collisionSystem.addObject(ground, 'ground');
    console.log("Ground added to scene and collision system.");
} else {
    console.error("Failed to create ground!");
}


const skybox = createIndianSkybox();
if (skybox) {
    scene.add(skybox);
    console.log("Skybox added to scene.");
} else {
    console.warn("Failed to create skybox."); // Warn instead of error if optional
}

// --- Level Theme Change Listener ---
window.addEventListener('levelThemeChange', (event) => {
    const config = event.detail;
    console.log(`Changing theme to: ${config.theme}`);
    
    // Update ground theme
    if (ground) {
        updateGroundTheme(ground, config.theme);
    }
    
    // Update skybox theme
    if (skybox) {
        updateSkyboxTheme(skybox, config.theme);
    }
});

// --- Create Indian Architecture ---
const indianArch = new IndianArchitecturalElements();
const indianBuildingsGroup = indianArch.createSampleLayout();
console.log('Indian Buildings Group:', indianBuildingsGroup);
scene.add(indianBuildingsGroup);

// Add structures to the collision system
// Using Option 2 (traversing) is generally better for accuracy
console.log("Adding structures to collision system...");
let collidableCount = 0;
indianBuildingsGroup.traverse(child => {
    // Add individual meshes marked as collidable in indianArchitecture.js
    if (child instanceof THREE.Mesh && child.userData.isCollidable) {
        // Pass the mesh itself and its type from userData
        collisionSystem.addObject(child, child.userData.type || 'structure_part');
        collidableCount++;
        // Ensure added meshes receive shadows if desired
        child.receiveShadow = true;
        child.castShadow = true; // Buildings should cast shadows
    }
    // Also add groups if they have userData indicating they are collidable units
    else if (child instanceof THREE.Group && child.userData.isCollidable) {
         collisionSystem.addObject(child, child.userData.type || 'structure_group_part');
         collidableCount++;
         // Ensure children cast/receive shadow if needed
         child.traverse(subChild => {
             if (subChild instanceof THREE.Mesh) {
                 subChild.castShadow = true;
                 subChild.receiveShadow = true;
             }
         });
    }
});
console.log(`Added ${collidableCount} collidable structure parts to collision system.`);
// Ensure the ground also receives shadows
if(ground instanceof THREE.Mesh) {
    ground.receiveShadow = true;
}


// --- Game Systems ---
// Declare variables, instantiate in initGame
let pointerLockControls;
let playerController;
let weaponSystem;
let enemySystem;
let healthSystem;
let levelManager;

// --- Initialization ---
function initGame() {
    console.log("Initializing game...");
    score = 0;
    gameOver = false;
    gamePaused = false; // Unpause when starting

    // Collision System - Ensure it's ready
    // (Already populated outside this function)

    // Player and Controls (Create only once)
    if (!playerController) {
        console.log("Creating PlayerController...");
        playerController = new PlayerController(camera, scene, collisionSystem);
        console.log("PlayerController created.");

        console.log("Creating PointerLockControls...");
        pointerLockControls = new PointerLockControls(camera, renderer.domElement);

        // Pointer Lock event listeners (Setup as before)
        renderer.domElement.addEventListener('click', () => {
            if (!gamePaused && !gameOver && !pointerLockControls.isLocked) {
                pointerLockControls.lock();
            }
        });
        pointerLockControls.addEventListener('lock', () => { /* ... */ });
        pointerLockControls.addEventListener('unlock', () => { /* ... */ });
        console.log("PointerLockControls created and listeners added.");

    } else {
        console.log("Resetting existing PlayerController...");
        playerController.reset(); // Resets position and state internally
    }

    // Health System
    if (!healthSystem) {
        console.log("Creating HealthSystem...");
        healthSystem = new HealthSystem(playerController, weaponSystem); // Pass dependencies
        console.log("HealthSystem created.");
    } else {
        console.log("Resetting existing HealthSystem...");
    }

    // --- FIX: Instantiate EnemySystem BEFORE WeaponSystem ---
    // Enemy System
    if (!enemySystem) {
        console.log("Creating EnemySystem...");
        // Pass necessary systems. WeaponSystem isn't created yet.
        // EnemySystem might need weaponSystem later (e.g. for enemy targetting logic)
        // Consider using a setter or event system if needed.
        enemySystem = new EnemySystem(scene, playerController, null, collisionSystem, healthSystem);
        console.log("EnemySystem created.");
    } else {
         console.log("Resetting existing EnemySystem...");
    }
    enemySystem.reset(); // Reset enemies

    // Weapon System
    if (!weaponSystem) {
        console.log("Creating WeaponSystem...");
        // --- FIX: Pass correct arguments, including enemySystem ---
        weaponSystem = new WeaponSystem(camera, scene, playerController, collisionSystem, enemySystem);
        console.log("WeaponSystem created.");
    } else {
        console.log("Resetting existing WeaponSystem...");
    }
    // --- FIX: Call the existing reset() method ---
    weaponSystem.reset(); // Reset ammo/state/UI
    // --- FIX: Remove createUI call ---
    // weaponSystem.createUI(); // REMOVED - Not needed

    // --- FIX: Link systems if needed AFTER both are created ---
    // If HealthSystem needs weaponSystem reference:
    if (healthSystem && !healthSystem.weaponSystem) {
        healthSystem.weaponSystem = weaponSystem; // Assign reference if needed
    }
    // If EnemySystem needs weaponSystem reference:
     if (enemySystem && !enemySystem.weaponSystem) {
        enemySystem.weaponSystem = weaponSystem; // Assign reference if needed
    }

    // Level Manager
    if (!levelManager) {
        console.log("Creating LevelManager...");
        levelManager = new LevelManager(scene, enemySystem, playerController, weaponSystem);
        // Link level manager to enemy system
        enemySystem.levelManager = levelManager;
        // Set audio context for level manager
        if (weaponSystem.audioContext) {
            levelManager.setAudioContext(weaponSystem.audioContext);
        }
        console.log("LevelManager created.");
    } else {
        console.log("Resetting existing LevelManager...");
        levelManager.reset();
    }

    // Start Level 1
    levelManager.startLevel(1);

    // Initial UI State
    if(loadingScreen) loadingScreen.style.display = 'none';
    if(controlsScreen) controlsScreen.style.display = 'none';
    if(pauseMenu) pauseMenu.style.display = 'none';
    if(gameOverScreen) gameOverScreen.style.display = 'none';

    gameStarted = true;
    console.log("Game Initialized and Started.");

    // Start animation loop if it's the very first initialization
    if (!clock.running) {
        clock.start();
    }
    // The animate function uses requestAnimationFrame, so it will loop once called.
} // --- End initGame() ---


// --- Reset Game ---
function resetGame() {
    console.log("Resetting game...");
    gameOver = false;
    gamePaused = false;
    score = 0;

    // Reset systems (ensure reset methods exist and work correctly)
    if (playerController) playerController.reset(); // Handles position reset
    if (healthSystem) healthSystem.reset();
    // --- FIX: Call the existing reset() method ---
    if (weaponSystem) weaponSystem.reset();
    if (enemySystem) enemySystem.reset();
    
    // Reset and restart level manager
    if (levelManager) {
        levelManager.reset();
        levelManager.startLevel(1);
    }

    // Update UI immediately (reset methods should handle their own UI updates)
    // updateUI(); // Might be redundant if reset methods update UI

    // Hide overlay screens
    if(pauseMenu) pauseMenu.style.display = 'none';
    if(gameOverScreen) gameOverScreen.style.display = 'none';

    console.log("Game Reset. Click screen to resume controls.");
}


// --- Game Over Handling ---
function handleGameOver() {
    console.log("Game Over!");
    gameOver = true;
    gamePaused = true; // Stop updates
    if (pointerLockControls && pointerLockControls.isLocked) { // Check if locked before unlocking
         pointerLockControls.unlock();
    }

    if(finalScoreText) finalScoreText.textContent = `FINAL SCORE: ${score}`;
    if(gameOverScreen) gameOverScreen.style.display = 'flex';
}

// --- UI Updates ---
function updateUI() {
    // Delegate UI updates to respective systems
     if (healthSystem) healthSystem.updateUI(); // This one should be correct based on health.js
     // --- FIX: Correct method name for weapon system ---
     if (weaponSystem) weaponSystem.updateAmmoUI();
     // -------------------------------------------------

     // Update score display if you have a dedicated element
     // const scoreElement = document.getElementById('scoreDisplay');
     // if (scoreElement) scoreElement.textContent = `Score: ${score}`;
}


// --- Event Listeners ---

// UI Buttons
if (startButton) startButton.addEventListener('click', () => {
    if(loadingText) loadingText.textContent = 'Starting...';
    setTimeout(initGame, 100); // Short delay
});
if (controlsButton) controlsButton.addEventListener('click', () => {
    if(loadingScreen) loadingScreen.style.display = 'none';
    if(controlsScreen) controlsScreen.style.display = 'flex';
});
if (backButton) backButton.addEventListener('click', () => {
    if(controlsScreen) controlsScreen.style.display = 'none';
    if(loadingScreen) loadingScreen.style.display = 'flex';
});
if (resumeButton) resumeButton.addEventListener('click', () => {
    if(pauseMenu) pauseMenu.style.display = 'none';
    gamePaused = false;
    if (pointerLockControls && !pointerLockControls.isLocked) { // Check if not already locked
        pointerLockControls.lock();
    }
});
if (restartButton) restartButton.addEventListener('click', resetGame);

const quitToMenu = () => {
    gameStarted = false;
    gameOver = false;
    gamePaused = true;
    if (pointerLockControls && pointerLockControls.isLocked) {
        pointerLockControls.unlock();
    }
    if(pauseMenu) pauseMenu.style.display = 'none';
    if(gameOverScreen) gameOverScreen.style.display = 'none';
    if(loadingScreen) loadingScreen.style.display = 'flex';
    if(loadingText) loadingText.textContent = 'Ready!'; // Reset loading text
    // TODO: Consider more thorough cleanup if needed (e.g., removing enemies from scene)
    if(enemySystem) enemySystem.clearAllEnemies(); // Add such a method if needed
};
if (quitButton) quitButton.addEventListener('click', quitToMenu);
if (gameOverQuitButton) gameOverQuitButton.addEventListener('click', quitToMenu);


// Keyboard/Mouse Input is handled by PlayerController and WeaponSystem internally

// Handle Escape key for pausing (managed by pointer lock unlock event)
document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && pointerLockControls && pointerLockControls.isLocked) {
       // The 'unlock' event listener handles the pause logic.
       // console.log("Escape pressed while locked.");
    }
});

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Notify systems if they need to adjust UI based on resize
    if (healthSystem && typeof healthSystem.onResize === 'function') healthSystem.onResize();
    if (weaponSystem && typeof weaponSystem.onResize === 'function') weaponSystem.onResize();
});


// --- Animation Loop ---
let lastFrameTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate); // Request next frame

    // Calculate delta time reliably
    currentTime *= 0.001; // Convert time to seconds
    const delta = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Prevent large delta spikes on tab change / lag
    const clampedDelta = Math.min(delta, 0.1);

    // Only update game logic if game is active and not paused
    if (gameStarted && !gamePaused && !gameOver) {
        
        // Update systems with clamped delta time
        if (playerController) {
            playerController.update(clampedDelta);
        }
        if (weaponSystem) {
            weaponSystem.update(clampedDelta, enemySystem); // Pass enemySystem if needed for hit checks
        }
        if (enemySystem) {
            enemySystem.update(clampedDelta);
        }
        if (levelManager) {
            levelManager.update(clampedDelta);
        }

        // Update general UI (like score)
        updateUI();

        // Check for game over condition
        if (healthSystem && healthSystem.isPlayerDead()) {
            handleGameOver();
        }
    }
    // --- Always render the scene, regardless of game state ---
    renderer.render(scene, camera);
    // renderer.info.render.frame++; // Not needed for loop control
}

// --- Initial Setup Call ---
if(loadingScreen) loadingScreen.style.display = 'flex';
if(loadingText) loadingText.textContent = 'Loading Assets...';

// Simulate asset loading completion
window.onload = () => {
    if(loadingText) loadingText.textContent = 'Ready!';
    if(startButton) startButton.disabled = false; // Enable start button
    if(controlsButton) controlsButton.disabled = false;
    console.log("Assets loaded (simulated). Ready to start.");

    // Start the animation loop ONCE after assets are loaded and DOM is ready.
    // It will continuously render, but game logic updates are controlled by game state flags.
    console.log("Starting animation loop.");
    animate(0); // Start the loop
};

// Global function to update score
window.updateGameScore = (points) => {
    if (!gameOver) { // Only update score if game is running
        score += points;
        // console.log(`Score updated: ${score}`);
        // updateUI(); // UI updated in main loop
    }
};

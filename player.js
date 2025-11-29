import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'; // Ensure correct path

// Enhanced player movement controller
export class PlayerController {
  constructor(camera, scene, collisionSystem) {
    this.camera = camera;
    this.scene = scene;
    this.collisionSystem = collisionSystem; // Make sure this is correctly passed and used

    // Player state
    // --- FIX: Changed initial starting position ---
    // Structures at: (-50,-40), (40,-60), (0,50), (60,20) - spawn player in a clear area
    this.initialPosition = new THREE.Vector3(0, 1.6, -20); // Start at eye level in clear area between structures
    // ---------------------------------------------
    this.playerHeight = 1.6; // Standing height (adjust if needed based on world scale)
    this.crouchHeight = 0.8; // Crouching height
    this.isCrouching = false;
    this.isRunning = false;
    this.canJump = false; // Initialize to false, set true when grounded
    this.jumpForce = 150; // Reduced for realistic jump height

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveSpeed = 400.0; // Base movement speed
    this.runMultiplier = 1.6; // Speed multiplier when running

    // Physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Controls - Assuming PointerLockControls is created and managed in index.js

    this.setupEventListeners(); // Setup input listeners

    // Head bobbing
    this.bobTimer = 0;
    this.bobFrequency = 10;
    this.bobAmplitude = 0.05;
    this.bobEnabled = false;
    this.originalYOffset = 0; // Store original camera offset if needed

    // Footstep sounds (placeholders)
    this.footstepTimer = 0;
    this.footstepInterval = 0.5; // Time between footsteps

    // Camera effects
    this.originalFOV = camera.fov;

    // Weapon sway (placeholders)
    this.weaponSwayX = 0;
    this.weaponSwayY = 0;
    this.swayAmount = 0.005; // Reduced sway from previous example
    this.swaySpeed = 4;    // Reduced sway speed from previous example
    this.swayTimer = 0;

    // Add player body for collision
    this.createPlayerBody();

    // Initial reset
    this.reset(); // Set initial state and position using this.initialPosition
  }

  createPlayerBody() {
    // Create invisible cylinder for player collision
    // Make radius slightly smaller than player step width to avoid snagging on corners
    const radius = 0.4;
    const geometry = new THREE.CylinderGeometry(radius, radius, this.playerHeight, 16); // Increased segments
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red for debugging
      wireframe: true,
      visible: false, // Hidden in game (set true for debugging)
      opacity: 0.5,
      transparent: true
    });

    this.playerBody = new THREE.Mesh(geometry, material);
    // Initial position set in reset()
    this.scene.add(this.playerBody);
    console.log("Player body created and added to scene.");
  }

  // --- NEW RESET METHOD ---
  /**
   * Resets the player's state and position.
   * @param {THREE.Vector3} [position] - Optional new position to set. Defaults to initialPosition.
   */
  reset(position) {
    console.log("Resetting PlayerController state...");

    const targetPosition = position || this.initialPosition.clone();

    // Reset camera position
    this.camera.position.copy(targetPosition);
    // Ensure camera is not rotated initially
    this.camera.rotation.set(0, 0, 0);

    // Reset physics state
    this.velocity.set(0, 0, 0);
    this.direction.set(0, 0, 0);
    this.canJump = false; // Will be set true by collision check if starting on ground

    // Reset movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isRunning = false;

    // Reset crouch state
    if (this.isCrouching) {
        // If reset while crouching, revert scale/position changes
        this.playerBody.scale.y = 1;
        // Adjust Y based on standing height relative to new position
        this.playerBody.position.y = targetPosition.y - this.playerHeight / 2;
    }
    this.isCrouching = false;


    // Reset camera FOV if changed by running
    this.camera.fov = this.originalFOV;
    this.camera.updateProjectionMatrix();

    // Reset head bob/sway timers
    this.bobTimer = 0;
    this.swayTimer = 0;

    // Immediately check for ground and snap to it
    // Cast a ray downward to find ground
    const rayStart = targetPosition.clone();
    rayStart.y += 5; // Start from above the target position
    const groundRay = new THREE.Raycaster(
        rayStart,
        new THREE.Vector3(0, -1, 0),
        0,
        20 // Check up to 20 units down
    );
    const groundIntersects = groundRay.intersectObjects(this.collisionSystem.collidableObjects, true);
    
    let finalPosition = targetPosition.clone();
    if (groundIntersects.length > 0) {
        // Found ground - place player on it
        const groundY = groundIntersects[0].point.y;
        finalPosition.y = groundY + this.playerHeight + 0.01; // Eye level above ground
        this.canJump = true;
    } else {
        // No ground found - use default ground level (y=0)
        finalPosition.y = this.playerHeight + 0.01;
        this.canJump = true;
    }
    
    // Use the ground-resolved position
    this.camera.position.copy(finalPosition);
    this.originalYOffset = finalPosition.y; // Set base Y from ground-resolved position

    // Reset player body position and scale
    this.playerBody.position.set(
        this.camera.position.x, 
        this.camera.position.y - this.playerHeight / 2, 
        this.camera.position.z
    );
    this.playerBody.scale.y = 1; // Ensure standing scale

    console.log(`PlayerController reset. Position set to: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}), onGround: ${this.canJump}`);
  }


  setupEventListeners() {
    // Lock/unlock controls are handled in index.js now with PointerLockControls instance

    // Keyboard controls
    this.keydownHandler = (event) => { // Store handler reference
      switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
        case 'Space':
          if (this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false; // Prevent double-jumping in same frame
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
           if (!this.isCrouching) { // Can't run while crouching
                this.isRunning = true;
                // Increase FOV slightly when running
                this.camera.fov = this.originalFOV * 1.05; // Less extreme FOV change
                this.camera.updateProjectionMatrix();
           }
          break;
        case 'ControlLeft':
        case 'KeyC':
          // Check if already processing crouch to prevent spamming
          if (!this.crouchTransitioning) {
             this.toggleCrouch();
          }
          break;
      }
    };

    this.keyupHandler = (event) => { // Store handler reference
      switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isRunning = false;
          // Reset FOV when not running
          this.camera.fov = this.originalFOV;
          this.camera.updateProjectionMatrix();
          break;
         // No need to handle Ctrl/C keyup explicitly for toggle
      }
    };

    // Add listeners
    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
  }

  // Call this method if the PlayerController instance is ever destroyed or replaced
  removeEventListeners() {
      console.log("Removing PlayerController event listeners.");
      document.removeEventListener('keydown', this.keydownHandler);
      document.removeEventListener('keyup', this.keyupHandler);
  }


  toggleCrouch() {
      this.crouchTransitioning = true; // Prevent re-triggering during transition
      const currentHeight = this.isCrouching ? this.crouchHeight : this.playerHeight;
      const targetHeight = this.isCrouching ? this.playerHeight : this.crouchHeight;
      const heightDifference = this.playerHeight - this.crouchHeight;

      if (this.isCrouching) {
          // --- Standing Up ---
          // Check if space above is clear BEFORE changing state
          const canStandUp = !this.checkCeilingCollision();
          if (canStandUp) {
              this.isCrouching = false;
              // Adjust camera position upwards
              this.camera.position.y += heightDifference;
              // Adjust body scale and position
              this.playerBody.scale.y = 1;
              this.playerBody.position.y += heightDifference / 2;
              this.originalYOffset = this.camera.position.y; // Update base Y for bobbing
              console.log("Standing up");
          } else {
              console.log("Cannot stand up - ceiling blocked");
              // Don't change state if blocked
          }
      } else {
          // --- Crouching Down ---
          this.isCrouching = true;
          this.isRunning = false; // Stop running if crouching
          // Adjust camera position downwards
          this.camera.position.y -= heightDifference;
           // Adjust body scale and position
          this.playerBody.scale.y = this.crouchHeight / this.playerHeight;
          this.playerBody.position.y -= heightDifference / 2;
          this.originalYOffset = this.camera.position.y; // Update base Y for bobbing
           // Reset FOV if running
          this.camera.fov = this.originalFOV;
          this.camera.updateProjectionMatrix();
          console.log("Crouching down");
      }
      this.crouchTransitioning = false; // Allow toggling again
  }


  checkCeilingCollision() {
    // Raycast upwards from slightly above the crouched head position
    // to check if the standing space is clear.
    const rayOrigin = new THREE.Vector3(
        this.camera.position.x,
        this.camera.position.y + 0.1, // Start ray slightly above current eye level
        this.camera.position.z
    );
    const rayDirection = new THREE.Vector3(0, 1, 0); // Upwards
    // Check distance needed to stand up + small buffer
    const rayLength = (this.playerHeight - this.crouchHeight) + 0.1;

    const upRay = new THREE.Raycaster(rayOrigin, rayDirection, 0, rayLength);

    // Ensure collisionSystem.collidableObjects is populated and contains relevant objects
    const intersections = upRay.intersectObjects(this.collisionSystem.collidableObjects, true); // Check recursively

    if (intersections.length > 0) {
        // Filter out intersections with the playerBody itself if it's accidentally included
        const collision = intersections.find(intersect => intersect.object !== this.playerBody);
        if (collision) {
            // console.log('Ceiling collision detected with:', collision.object.name || 'unnamed object');
            return true; // Collision detected
        }
    }
    return false; // No collision
}


  update(delta) {
    // Use PointerLockControls instance from index.js if it's external
    // if (!this.controls.isLocked) return; // Check external controls if needed

    // Clamp delta to prevent physics issues with large frame time gaps
    const clampedDelta = Math.min(delta, 0.1); // Max delta of 0.1 seconds

    // --- Physics Calculation ---
    const GRAVITY = 9.8 * 70.0; // Adjusted gravity factor (tweak this value)
    const FRICTION = 10.0;

    // Apply friction (only if on ground to prevent air friction affecting jumps)
    // Note: A better approach involves checking 'onGround' status from collision result
    // For simplicity now, applying general friction. Refine if needed.
    this.velocity.x -= this.velocity.x * FRICTION * clampedDelta;
    this.velocity.z -= this.velocity.z * FRICTION * clampedDelta;

    // Apply gravity
    this.velocity.y -= GRAVITY * clampedDelta;

    // Clamp vertical velocity (terminal velocity)
    this.velocity.y = Math.max(this.velocity.y, -GRAVITY); // Limit falling speed


    // Get movement direction based on camera orientation
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize(); // Ensure consistent speed regardless of diagonal movement

    // Calculate movement speed based on state
    let currentSpeed = this.moveSpeed;
    if (this.isRunning && !this.isCrouching && this.canJump) { // Can only run if standing and on ground
      currentSpeed *= this.runMultiplier;
    } else if (this.isCrouching) {
      currentSpeed *= 0.5; // Slower when crouching
    }

    // Calculate desired velocity change based on input and camera direction
    const moveDirection = new THREE.Vector3();
    // Get forward/backward direction from camera
    this.camera.getWorldDirection(moveDirection);
    moveDirection.y = 0; // Ignore vertical component for horizontal movement
    moveDirection.normalize();
    const forwardVelocity = moveDirection.clone().multiplyScalar(this.direction.z * currentSpeed * clampedDelta);

    // Get left/right direction (strafe)
    const rightDirection = new THREE.Vector3();
    rightDirection.crossVectors(this.camera.up, moveDirection).normalize(); // Get right vector
    const strafeVelocity = rightDirection.multiplyScalar(-this.direction.x * currentSpeed * clampedDelta); // Negative because direction.x is right(+)/left(-)

    // Apply movement forces to velocity
    this.velocity.x += forwardVelocity.x + strafeVelocity.x;
    this.velocity.z += forwardVelocity.z + strafeVelocity.z;

    // --- Collision Detection ---
    // Store current position
    const oldPosition = this.camera.position.clone();

    // Calculate potential new position based on velocity
    const deltaPosition = this.velocity.clone().multiplyScalar(clampedDelta);
    let newPosition = oldPosition.clone().add(deltaPosition);

    // Resolve collision using the external system
    // The collision system should handle ground detection and response
    const collisionResult = this.collisionSystem.resolveCollision(
        oldPosition,
        newPosition,
        this.playerHeight, // Pass player dimensions
        this.isCrouching ? this.crouchHeight : this.playerHeight,
        0.4 // Player radius
    );

    // Update camera position to the resolved position
    this.camera.position.copy(collisionResult.position);

    // Handle ground contact based on collision result
    if (collisionResult.onGround) {
        // If newly landed, clamp Y velocity to prevent bounce
        if (this.velocity.y < 0) {
            this.velocity.y = 0;
        }
        this.canJump = true;
        // Store the stable ground Y position for head bob reference
        this.originalYOffset = this.camera.position.y;
    } else {
        this.canJump = false; // Cannot jump if in the air
    }

    // If collision stopped vertical movement upwards (hit ceiling)
    if (collisionResult.hitCeiling && this.velocity.y > 0) {
        this.velocity.y = 0;
    }

    // --- Apply Head Bob AFTER Collision Resolution ---
    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    
    if (this.bobEnabled && isMoving && this.canJump) {
        // Calculate and apply head bob offset
        let bobFreq = this.bobFrequency;
        if (this.isRunning && !this.isCrouching) { bobFreq *= 1.5; }
        else if (this.isCrouching) { bobFreq *= 0.7; }
        this.bobTimer += clampedDelta * bobFreq;
        const bobOffset = Math.sin(this.bobTimer) * this.bobAmplitude;
        this.camera.position.y = this.originalYOffset + bobOffset;
    } else {
        // Reset bob timer when not moving
        this.bobTimer = 0;
    }

    // --- Update Player Body Visual ---
    // Sync the invisible collision body's position with the camera's resolved position
    // Adjust Y based on current height (standing/crouching)
    const currentBodyHeight = this.isCrouching ? this.crouchHeight : this.playerHeight;
    this.playerBody.position.x = this.camera.position.x;
    this.playerBody.position.y = this.camera.position.y - (this.playerHeight - currentBodyHeight / 2); // Center body based on camera eye level
    this.playerBody.position.z = this.camera.position.z;
    // Rotation is handled by PointerLockControls on the camera

    // Weapon sway effect
    this.updateWeaponSway(clampedDelta, isMoving);

    // Footstep sounds
    if (this.canJump && isMoving) {
      this.updateFootsteps(clampedDelta);
    }
  }


  updateWeaponSway(delta, isMoving) {
    // Simple sway based on movement input, not actual velocity
    let targetSwayX = 0;
    let targetSwayY = 0;

    if (isMoving) {
        this.swayTimer += delta * this.swaySpeed;
        targetSwayX = Math.sin(this.swayTimer) * this.swayAmount;
        targetSwayY = Math.cos(this.swayTimer * 0.8 + Math.PI/4) * this.swayAmount * 0.5; // Slightly different timing for Y
    }

     // Smoothly interpolate towards the target sway values
    this.weaponSwayX += (targetSwayX - this.weaponSwayX) * 5.0 * delta; // Adjust interpolation speed (5.0)
    this.weaponSwayY += (targetSwayY - this.weaponSwayY) * 5.0 * delta;

    // These values (weaponSwayX, weaponSwayY) would then be used by the
    // WeaponSystem to offset the weapon model's position/rotation relative to the camera.
  }


  updateFootsteps(delta) {
    this.footstepTimer += delta;

    // Adjust footstep interval based on movement speed
    let interval = this.footstepInterval;
    if (this.isRunning && !this.isCrouching) {
      interval *= 0.6; // Faster footsteps when running
    } else if (this.isCrouching) {
      interval *= 1.5; // Slower footsteps when crouching
    }

    if (this.footstepTimer >= interval) {
      // Play footstep sound (placeholder)
      // TODO: Implement actual sound playback via an AudioManager
      // console.log('Footstep'); // Reduce console spam

      this.footstepTimer = 0; // Reset timer
    }
  }

  // Getter for external systems that need player position
  getPosition() {
      return this.camera.position;
  }

  // Getter for player velocity (e.g., for enemy prediction)
  getVelocity() {
      return this.velocity;
  }

  // Getter for camera direction (e.g., for aiming/shooting)
  getDirection(vector) {
       this.camera.getWorldDirection(vector);
       return vector;
  }
}

import * as THREE from 'three';

// Collision detection and resolution system
export class CollisionSystem {
  constructor() {
    this.collidableObjects = []; // Array to hold world geometry meshes
    console.log("Collision System Initialized.");
  }

  // Add a single collidable mesh object
  addObject(mesh, type = 'object') {
    if (mesh instanceof THREE.Mesh) {
        mesh.userData.collisionType = type;
        this.collidableObjects.push(mesh);
    } else {
        console.warn("CollisionSystem.addObject: Passed object is not a Mesh.", mesh);
    }
  }

  // Clear all collidable objects
  clearObjects() {
      this.collidableObjects = [];
      console.log("Cleared collidable objects.");
  }

  /**
   * Resolves player collision based on desired movement.
   * @param {THREE.Vector3} oldPosition - Player's EYE LEVEL position before movement.
   * @param {THREE.Vector3} newPosition - Player's desired EYE LEVEL position after applying velocity.
   * @param {number} playerHeightCurrent - Current height of the player (standing or crouching).
   * @param {number} playerRadius - Collision radius of the player.
   * @returns {{position: THREE.Vector3, onGround: boolean, hitCeiling: boolean}} - The resolved position and status flags.
   */
  resolveCollision(oldPosition, newPosition, playerHeightCurrent, playerRadius) {
    let resolvedPosition = newPosition.clone(); // Start with the desired eye-level position
    let onGround = false;
    let hitCeiling = false;
    const stepHeight = 0.2; // How high the player can step up
    const collisionPadding = 0.01; // Small padding for checks

    // --- 1. Ground Check ---
    const groundCheckRay = new THREE.Raycaster(
        newPosition,
        new THREE.Vector3(0, -1, 0),
        0,
        playerHeightCurrent + stepHeight + 0.1
    );
    const groundIntersects = groundCheckRay.intersectObjects(this.collidableObjects, true);
    let highestGroundY = -Infinity;
    groundIntersects.forEach(intersect => {
        if (intersect.point.y < newPosition.y) {
             highestGroundY = Math.max(highestGroundY, intersect.point.y);
        }
    });
    const targetFeetY = newPosition.y - playerHeightCurrent;
    if (highestGroundY > -Infinity && targetFeetY <= highestGroundY + stepHeight) {
        // Apply epsilon offset when snapping to ground
        resolvedPosition.y = highestGroundY + playerHeightCurrent + collisionPadding; // Use padding
        onGround = true;
    } else {
        onGround = false;
    }

    // --- 2. Ceiling Check ---
    const ceilingCheckRay = new THREE.Raycaster(
        resolvedPosition, // Use the potentially ground-adjusted position
        new THREE.Vector3(0, 1, 0),
        0,
        collisionPadding * 2 // Check just slightly above head
    );
    const ceilingIntersects = ceilingCheckRay.intersectObjects(this.collidableObjects, true);
    if (ceilingIntersects.length > 0) {
        hitCeiling = true;
        // Stop eye level just below the hit point, considering padding
        resolvedPosition.y = Math.min(resolvedPosition.y, ceilingIntersects[0].point.y - collisionPadding);
    }


    // --- 3. Horizontal Collision Check & Resolution (Axis Separation) ---
    // Store the Y resolved from ground/ceiling checks
    const resolvedY = resolvedPosition.y;

    // Check X-axis movement using the resolved Y
    const checkPosX = resolvedPosition.clone();
    checkPosX.x = newPosition.x; // Try moving only on X (Y is already resolved)

    if (this.checkHorizontalCollision(checkPosX, playerHeightCurrent, playerRadius, collisionPadding)) {
        // Collision on X axis, revert X component
        console.log("X Collision Detected - Reverting X"); // DEBUG LOG
        resolvedPosition.x = oldPosition.x;
    }

    // Check Z-axis movement using the potentially X-resolved position and the resolved Y
    const checkPosZ = resolvedPosition.clone(); // Start with potentially X-resolved position
    checkPosZ.z = newPosition.z; // Try moving only on Z (Y is already resolved)

    if (this.checkHorizontalCollision(checkPosZ, playerHeightCurrent, playerRadius, collisionPadding)) {
        // Collision on Z axis, revert Z component
        console.log("Z Collision Detected - Reverting Z"); // DEBUG LOG
        resolvedPosition.z = oldPosition.z;
    }

    // --- Return Result ---
    // Ensure Y is maintained if horizontal collisions occurred
    resolvedPosition.y = resolvedY;

    // Final check: If onGround became false due to horizontal revert, re-validate ground?
    // This can get complex. Let's see if the above helps first.

    // Sanity check for NaN values (optional but good practice)
    if (isNaN(resolvedPosition.x) || isNaN(resolvedPosition.y) || isNaN(resolvedPosition.z)) {
        console.error("Collision resolved to NaN! Reverting to old position.", oldPosition);
        resolvedPosition.copy(oldPosition); // Fallback to old position
        onGround = false; // Assume not on ground if error occurred
        hitCeiling = false;
    }


    return {
      position: resolvedPosition,
      onGround: onGround,
      hitCeiling: hitCeiling
    };
  }


  /**
   * Helper function to check for horizontal collisions at a given position.
   * Checks at multiple vertical points along the player's height.
   * @param {THREE.Vector3} position - The EYE LEVEL position to check from.
   * @param {number} playerHeightCurrent - Current player height.
   * @param {number} playerRadius - Player collision radius.
   * @param {number} padding - Small distance less than radius for collision check.
   * @returns {boolean} - True if a horizontal collision is detected, false otherwise.
   */
  checkHorizontalCollision(position, playerHeightCurrent, playerRadius, padding) {
    const rayCount = 8;
    const checkHeights = [
        playerRadius * 0.5, // Near feet
        playerHeightCurrent * 0.5, // Center
        playerHeightCurrent - playerRadius * 0.5 // Near head
    ];
    const checkDistance = playerRadius - padding; // Check slightly inside the radius

    for (const h of checkHeights) {
        const verticalCheckPos = position.y - playerHeightCurrent + h;

        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2;
          const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
          const rayOrigin = new THREE.Vector3(position.x, verticalCheckPos, position.z);

          const ray = new THREE.Raycaster(
            rayOrigin,
            direction,
            0,
            playerRadius + 0.01 // Cast ray slightly further than checkDistance
          );

          const intersections = ray.intersectObjects(this.collidableObjects, true);

          if (intersections.length > 0) {
            // Check if the hit is within the padded distance
            if (intersections[0].distance <= checkDistance) {
                return true; // Collision detected
            }
          }
        }
    }
    return false; // No horizontal collision detected
  }

} // End CollisionSystem class

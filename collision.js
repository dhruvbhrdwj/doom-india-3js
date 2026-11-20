import * as THREE from 'three';

export const arenaHalfSize = 38;
const padding = 0.001;

export class CollisionSystem {
  constructor() {
    this.collidableObjects = [];
    this.bounds = [];
  }

  addObject(mesh) {
    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    this.collidableObjects.push(mesh);
    this.bounds.push(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  }

  clearObjects() {
    this.collidableObjects.length = 0;
    this.bounds.length = 0;
  }

  overlaps(box, x, z, radius) {
    const dx = x - THREE.MathUtils.clamp(x, box.min.x, box.max.x);
    const dz = z - THREE.MathUtils.clamp(z, box.min.z, box.max.z);
    return dx * dx + dz * dz < radius * radius;
  }

  blocked(x, z, feet, head, radius) {
    return Math.abs(x) + radius > arenaHalfSize || Math.abs(z) + radius > arenaHalfSize ||
      this.bounds.some(box => feet < box.max.y - padding && head > box.min.y + padding &&
        this.overlaps(box, x, z, radius));
  }

  resolveCollision(old, next, height, radius) {
    const feet = old.y - height;
    if (this.blocked(next.x, old.z, feet, old.y, radius)) next.x = old.x;
    if (this.blocked(next.x, next.z, feet, old.y, radius)) next.z = old.z;

    let onGround = false;
    let hitCeiling = false;
    if (next.y <= old.y) {
      let floor = 0;
      for (const box of this.bounds) {
        if (box.max.y <= feet + padding && this.overlaps(box, next.x, next.z, radius)) {
          floor = Math.max(floor, box.max.y);
        }
      }
      if (next.y <= floor + height) {
        next.y = floor + height;
        onGround = true;
      }
    } else {
      for (const box of this.bounds) {
        if (box.min.y >= old.y - padding && box.min.y < next.y &&
            this.overlaps(box, next.x, next.z, radius)) {
          next.y = box.min.y;
          hitCeiling = true;
        }
      }
    }
    return { position: next, onGround, hitCeiling };
  }
}

import * as THREE from 'three';

const movementKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyC', 'ControlLeft', 'ControlRight'
]);

export class PlayerController {
  constructor(camera, collisionSystem, canvas) {
    this.camera = camera;
    this.collisionSystem = collisionSystem;
    this.playerHeight = 1.65;
    this.crouchHeight = 0.95;
    this.radius = 0.38;
    this.initialPosition = new THREE.Vector3(0, this.playerHeight, 27);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.reset();

    document.addEventListener('keydown', event => {
      if (document.pointerLockElement !== canvas || !movementKeys.has(event.code)) return;
      event.preventDefault();
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Space' && this.canJump) {
        this.velocity.y = 6.6;
        this.canJump = false;
      }
      if (['KeyC', 'ControlLeft', 'ControlRight'].includes(event.code)) this.toggleCrouch();
    });
    document.addEventListener('keyup', event => this.keys.delete(event.code));
  }

  reset() {
    this.clearInput();
    this.velocity.y = 0;
    this.camera.position.copy(this.initialPosition);
    this.camera.rotation.set(0.035, 0, 0, 'YXZ');
    this.canJump = true;
    this.isCrouching = false;
  }

  clearInput() {
    this.keys.clear();
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  toggleCrouch() {
    const position = this.camera.position;
    const feet = position.y - (this.isCrouching ? this.crouchHeight : this.playerHeight);
    if (this.isCrouching && this.collisionSystem.blocked(
      position.x, position.z, feet, feet + this.playerHeight, this.radius
    )) return;

    this.isCrouching = !this.isCrouching;
    position.y = feet + (this.isCrouching ? this.crouchHeight : this.playerHeight);
  }

  update(delta) {
    const has = (key, alternate) => Number(this.keys.has(key) || this.keys.has(alternate));
    const forward = has('KeyW', 'ArrowUp') - has('KeyS', 'ArrowDown');
    const strafe = has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft');
    const running = has('ShiftLeft', 'ShiftRight');
    const speed = this.isCrouching ? 4 : running ? 12 : 8;
    const scale = speed / (Math.hypot(forward, strafe) || 1);
    const yaw = this.camera.rotation.y;
    const blend = 1 - Math.exp(-18 * delta);
    this.velocity.x += ((-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * scale - this.velocity.x) * blend;
    this.velocity.z += ((-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * scale - this.velocity.z) * blend;
    this.velocity.y = Math.max(this.velocity.y - 18 * delta, -18);

    const old = this.camera.position;
    const next = old.clone().addScaledVector(this.velocity, delta);
    const height = this.isCrouching ? this.crouchHeight : this.playerHeight;
    const result = this.collisionSystem.resolveCollision(old, next, height, this.radius);
    if (result.onGround || result.hitCeiling) this.velocity.y = 0;
    this.canJump = result.onGround;
    old.copy(result.position);
  }

  getPosition() {
    return this.camera.position;
  }

  getVelocity() {
    return this.velocity;
  }
}

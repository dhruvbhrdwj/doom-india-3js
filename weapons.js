import * as THREE from 'three';

const definitions = [
  { name: 'Pistol', damage: 31, delay: 0.29, reload: 1.0, capacity: 12, reserve: 60, spread: 0, kick: 0.075, length: 0.39 },
  { name: 'Rifle', damage: 21, delay: 0.11, reload: 1.42, capacity: 30, reserve: 120, spread: 0.008, kick: 0.06, length: 0.68, automatic: true },
  { name: 'Shotgun', damage: 14, delay: 0.72, reload: 1.55, capacity: 6, reserve: 30, spread: 0.063, kick: 0.19, length: 0.58, pellets: 8 },
];
const rest = new THREE.Vector3(0.23, -0.225, -0.43);

export class WeaponSystem {
  constructor(camera, viewScene, scene, player, collision, enemySystem, canvas) {
    this.camera = camera;
    this.player = player;
    this.collision = collision;
    this.enemySystem = enemySystem;
    this.raycaster = new THREE.Raycaster();
    this.ammoUI = document.getElementById('ammo-counter');
    this.weaponUI = document.getElementById('weapon-name');
    this.crosshair = document.getElementById('crosshair');
    this.viewModel = new THREE.Group();
    viewScene.add(this.viewModel);

    const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.16 });
    const finish = {
      steel: material(0x303641), highlight: material(0x6a7880),
      brass: material(0xc28a43), wood: material(0x684133), dark: material(0x171419),
      glove: material(0x5d4c42),
    };
    this.weapons = definitions.map(definition => {
      const model = this.createModel(definition, finish);
      this.viewModel.add(model);
      return { ...definition, model };
    });
    this.flash = this.createMuzzleFlash();
    this.viewModel.add(this.flash);

    const impactGeometry = new THREE.IcosahedronGeometry(0.105, 0);
    this.impacts = Array.from({ length: 20 }, () => {
      const mesh = new THREE.Mesh(impactGeometry, new THREE.MeshBasicMaterial({
        transparent: true, depthWrite: false, toneMapped: false,
      }));
      scene.add(mesh);
      return mesh;
    });

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = null;
    if (AudioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.warn('Audio is unavailable:', error.message);
      }
    }
    this.reset();

    document.addEventListener('mousedown', event => {
      if (event.button === 0 && document.pointerLockElement === canvas) {
        this.trigger = true;
        this.tryToFire();
      }
    });
    document.addEventListener('mouseup', event => {
      if (event.button === 0) this.stopFiring();
    });
    document.addEventListener('keydown', event => {
      if (event.repeat || document.pointerLockElement !== canvas) return;
      if (event.code === 'KeyR') this.reload();
      if (/^Digit[1-3]$/.test(event.code)) this.switchWeapon(Number(event.code.at(-1)) - 1);
    });
  }

  createModel(weapon, finish) {
    const group = new THREE.Group();
    const piece = (width, height, depth, x, y, z, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const pistol = weapon.name === 'Pistol';
    const shotgun = weapon.name === 'Shotgun';
    const { length } = weapon;
    piece(0.12, 0.093, pistol ? 0.26 : 0.31, 0, 0, -0.14, finish.steel);
    piece(0.104, 0.035, pistol ? 0.27 : 0.30, 0, 0.052, -0.149, finish.highlight);
    piece(0.078, 0.18, 0.10, 0, -0.12, -0.05, finish.wood).rotation.x = -0.28;
    piece(0.128, 0.13, 0.112, 0.005, -0.144, -0.037, finish.glove).rotation.x = -0.28;
    piece(0.131, 0.114, 0.31, 0.025, -0.21, 0.117, finish.wood).rotation.x = 0.23;
    piece(0.065, 0.053, length - 0.19, 0, 0.02, -(length + 0.19) / 2, finish.steel);
    piece(0.067, 0.057, 0.055, 0, 0.02, -length + 0.02, finish.highlight);
    piece(0.040, 0.031, 0.006, 0, 0.02, -length - 0.011, finish.dark);
    piece(0.021, 0.022, 0.039, 0, pistol ? 0.077 : 0.061, -length + 0.057, finish.brass);
    piece(0.096, 0.018, 0.045, 0, 0.075, -0.064, finish.dark);
    for (let index = 0; index < 4; index++) {
      piece(0.108, 0.014, 0.011, 0, 0.071, -0.091 - index * 0.023, finish.steel);
    }
    if (!pistol) {
      piece(0.110, 0.085, 0.23, 0, -0.005, -length + 0.18, shotgun ? finish.wood : finish.dark);
      piece(0.105, 0.12, 0.14, 0, -0.08, 0.036, finish.wood);
      piece(0.062, 0.13, 0.12, 0, -0.087, -0.21, shotgun ? finish.steel : finish.dark);
      piece(0.115, 0.014, 0.024, 0, 0.045, -length + 0.15, finish.brass);
    }
    return group;
  }

  createMuzzleFlash() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#fff7d3');
    gradient.addColorStop(0.26, '#ffd875');
    gradient.addColorStop(0.59, '#f78f214d');
    gradient.addColorStop(1, '#f78f2100');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    flash.scale.setScalar(0.35);
    return flash;
  }

  get current() {
    return this.weapons[this.index];
  }

  switchWeapon(index) {
    if (this.reloadLeft > 0 || index === this.index) return;
    this.stopFiring();
    this.index = index;
    this.weapons.forEach((weapon, i) => { weapon.model.visible = i === index; });
    this.flash.visible = false;
    this.updateAmmoUI();
  }

  stopFiring() {
    this.trigger = false;
  }

  tryToFire() {
    if (this.reloadLeft > 0 || this.cooldown > 0) return;
    const weapon = this.current;
    if (weapon.ammo === 0) {
      this.reload();
      return;
    }

    weapon.ammo--;
    this.cooldown = weapon.delay;
    this.kick = weapon.kick;
    this.flashTimer = 0.045;
    this.flash.position.set(0, 0.02, -weapon.length - 0.045);
    this.flash.material.rotation = Math.random() * Math.PI * 2;
    this.flash.visible = true;

    const origin = this.camera.position;
    const targets = [...this.collision.collidableObjects, ...this.enemySystem.getEnemyHitboxes()];
    this.raycaster.far = 95;
    for (let i = 0; i < (weapon.pellets || 1); i++) {
      const direction = new THREE.Vector3(
        (Math.random() * 2 - 1) * weapon.spread, (Math.random() * 2 - 1) * weapon.spread, -1,
      ).normalize().applyQuaternion(this.camera.quaternion);
      this.raycaster.set(origin, direction);
      const hit = this.raycaster.intersectObjects(targets, false)
        .find(({ object }) => object.userData.enemy?.state !== 'dying');
      if (!hit) continue;
      const enemy = hit.object.userData.enemy;
      if (enemy && this.enemySystem.damage(enemy, weapon.damage)) this.hitTimer = 0.13;
      const impact = this.impacts[this.nextImpact];
      this.nextImpact = (this.nextImpact + 1) % this.impacts.length;
      impact.position.copy(hit.point).addScaledVector(direction, -0.06);
      impact.material.color.setHex(enemy ? 0xff8564 : 0xffdb91);
      impact.userData.time = 0.19;
      impact.material.opacity = 1;
      impact.visible = true;
    }
    this.playGunshotSound(weapon.name);
    if (weapon.ammo === 0 && weapon.remaining > 0) this.reload();
    else this.updateAmmoUI();
  }

  reload() {
    const weapon = this.current;
    if (this.reloadLeft > 0 || weapon.ammo >= weapon.capacity || weapon.remaining === 0) return;
    this.reloadLeft = weapon.reload;
    this.updateAmmoUI();
  }

  update(delta) {
    const weapon = this.current;
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.reloadLeft > 0) {
      this.reloadLeft = Math.max(0, this.reloadLeft - delta);
      if (this.reloadLeft === 0) {
        const count = Math.min(weapon.capacity - weapon.ammo, weapon.remaining);
        weapon.ammo += count;
        weapon.remaining -= count;
        this.updateAmmoUI();
      }
    }
    if (this.trigger && weapon.automatic) this.tryToFire();
    this.kick *= Math.exp(-19 * delta);
    this.flashTimer -= delta;
    this.flash.visible = this.flashTimer > 0;
    this.hitTimer -= delta;
    this.crosshair.classList.toggle('hit', this.hitTimer > 0);

    const velocity = this.player.getVelocity();
    const moving = Math.min(1, Math.hypot(velocity.x, velocity.z) / 8);
    this.walk += moving * 13 * delta;
    const dip = this.reloadLeft > 0 ? Math.sin(this.reloadLeft / weapon.reload * Math.PI) : 0;
    this.viewModel.position.set(
      rest.x + Math.sin(this.walk * 0.5) * 0.014 * moving,
      rest.y + Math.sin(this.walk) * 0.009 * moving - 0.16 * dip,
      rest.z + this.kick * 0.7,
    );
    this.viewModel.rotation.x = this.kick - 0.38 * dip;

    for (const impact of this.impacts) {
      if (!impact.visible) continue;
      impact.userData.time -= delta;
      impact.material.opacity = Math.max(0, impact.userData.time / 0.19);
      impact.visible = impact.userData.time > 0;
    }
  }

  updateAmmoUI() {
    const weapon = this.current;
    this.weaponUI.textContent = this.reloadLeft > 0 ? `${weapon.name} · Reloading` : weapon.name;
    this.ammoUI.textContent = `${weapon.ammo} / ${weapon.remaining}`;
  }

  addAmmoToCurrent(amount) {
    const weapon = this.current;
    const count = Math.min(amount, weapon.reserve * 2 - weapon.remaining);
    weapon.remaining += count;
    if (count > 0) this.updateAmmoUI();
    return count;
  }

  reset() {
    this.stopFiring();
    this.index = -1;
    this.reloadLeft = this.cooldown = this.kick = this.walk = this.flashTimer = this.hitTimer = 0;
    this.nextImpact = 0;
    for (const weapon of this.weapons) {
      weapon.ammo = weapon.capacity;
      weapon.remaining = weapon.reserve;
    }
    for (const impact of this.impacts) impact.visible = false;
    this.viewModel.position.copy(rest);
    this.viewModel.rotation.set(0, 0, 0);
    this.crosshair.classList.remove('hit');
    this.switchWeapon(0);
  }
  playGunshotSound(weaponName) {
    if (this.audioContext?.state !== 'running') return;

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
    gainNode.gain.setValueAtTime(volume * 0.42, now);
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
    noiseGain.gain.setValueAtTime(volume * 0.24, now);
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
    if (this.audioContext?.state !== 'running') return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.3;

    // Create a descending tone for death sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + duration);

    gainNode.gain.setValueAtTime(0.07, now);
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
    noiseGain.gain.setValueAtTime(0.06, now);
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

}

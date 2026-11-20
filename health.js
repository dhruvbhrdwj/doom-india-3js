import * as THREE from 'three';

const pickups = [
  ['Armor', -4.5, 20], ['Ammo', 4.5, 18], ['Health', 0, -18],
  ['Health', -25, -2], ['Ammo', 24, -6], ['Armor', 0, -32],
];

export class HealthSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.ui = Object.fromEntries([
      'health-text', 'health-bar', 'armor-text', 'armor-bar', 'damage-overlay', 'pickup-message'
    ].map(id => [id, document.getElementById(id)]));
    const templates = {
      Health: this.createHealthPowerUp(),
      Armor: this.createArmorPowerUp(),
      Ammo: this.createAmmoPowerUp()
    };
    this.pickups = pickups.map(([type, x, z]) => {
      const model = templates[type].clone();
      model.position.set(x, 0.12, z);
      this.scene.add(model);
      return { type, model, time: 0 };
    });
    this.reset();
  }

  reset() {
    this.currentHealth = 100;
    this.currentArmor = 0;
    this.sinceDamage = Infinity;
    this.time = 0;
    this.messageLeft = 0;
    this.ui['damage-overlay'].style.opacity = 0;
    this.ui['pickup-message'].hidden = true;
    for (const pickup of this.pickups) {
      pickup.time = 0;
      pickup.model.visible = true;
      pickup.model.position.y = 0.12;
    }
    this.updateUI();
  }

  updateUI() {
    this.ui['health-text'].textContent = Math.ceil(this.currentHealth);
    this.ui['health-bar'].style.width = `${this.currentHealth}%`;
    this.ui['armor-text'].textContent = Math.ceil(this.currentArmor);
    this.ui['armor-bar'].style.width = `${this.currentArmor}%`;
  }

  takeDamage(amount) {
    if (this.currentHealth === 0) return;
    this.sinceDamage = 0;
    const absorbed = Math.min(this.currentArmor, amount * 0.6);
    this.currentArmor -= absorbed;
    this.currentHealth = Math.max(0, this.currentHealth - (amount - absorbed));
    this.updateUI();
  }

  collect(type) {
    if (type === 'Ammo') return this.weapon.addAmmoToCurrent(30);
    const stat = type === 'Health' ? 'currentHealth' : 'currentArmor';
    const amount = Math.min(type === 'Health' ? 30 : 50, 100 - this[stat]);
    this[stat] += amount;
    if (amount > 0) this.updateUI();
    return Math.ceil(amount);
  }

  update(delta) {
    if (this.currentHealth === 0) return;
    this.sinceDamage += delta;
    this.time += delta;
    this.ui['damage-overlay'].style.opacity = 0.65 * Math.max(0, 1 - this.sinceDamage / 0.38);
    if (this.sinceDamage > 5 && this.currentHealth < 100) {
      this.currentHealth = Math.min(100, this.currentHealth + 2 * delta);
      this.updateUI();
    }

    this.messageLeft -= delta;
    if (this.messageLeft <= 0) this.ui['pickup-message'].hidden = true;
    const position = this.player.getPosition();
    for (const [index, pickup] of this.pickups.entries()) {
      const { model, type } = pickup;
      if (!model.visible) {
        pickup.time -= delta;
        if (pickup.time <= 0) model.visible = true;
        continue;
      }
      model.rotation.y += delta * 1.5;
      model.position.y = 0.15 + Math.sin(this.time * 3 + index) * 0.12;
      if (position.y > 2.45 || Math.hypot(position.x - model.position.x, position.z - model.position.z) > 1.2) continue;
      const amount = this.collect(type);
      if (!amount) continue;
      this.ui['pickup-message'].textContent = `+${amount} ${type}`;
      this.ui['pickup-message'].hidden = false;
      this.messageLeft = 1.6;
      model.visible = false;
      pickup.time = 24;
    }
  }
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
    return powerUp;
  }

}

import * as THREE from 'three';

export const levels = [
  {
    name: 'Temple Grounds', theme: 'sandstone', trim: 0xb58253, banner: 0xab4f35,
    skyLight: 0xc3d9ff, floorLight: 0xae7855, sun: 0xffd29e,
    cover: [[-13, 5, 4, 1.02, 7], [13, 5, 4, 1.02, 7], [-18, -13, 11, 2.6, 2], [18, -13, 11, 2.6, 2], [-31, 13, 3, 2, 8], [31, 13, 3, 2, 8]],
    enemies: [
      ['Rakshasa', -2.4, 5.5], ['Naga', 4, -3], ['Rakshasa', -22, -18],
      ['Naga', 23, -21], ['Rakshasa', -15, -29], ['Naga', 17, -30],
    ],
  },
  {
    name: 'Royal Palace', theme: 'marble', trim: 0x8a6d6f, banner: 0x31656e,
    skyLight: 0xc7c5ff, floorLight: 0xa86857, sun: 0xffb892,
    cover: [[-11, -1, 2.0, 2.8, 14], [11, -1, 2.0, 2.8, 14], [-20, 12, 9, 1.02, 2], [20, 12, 9, 1.02, 2], [-23, -19, 13, 2.9, 2], [23, -19, 13, 2.9, 2], [0, -5, 4, 1, 2]],
    enemies: [
      ['Asura', -3, 0], ['Naga', 5, 0], ['Rakshasa', -12, -25], ['Rakshasa', 12, -25],
      ['Asura', -26, -26], ['Asura', 27, -28], ['Naga', -22, 0], ['Naga', 25, -8],
      ['Rakshasa', -31, 22], ['Naga', 32, 22],
    ],
  },
  {
    name: 'Dark Fortress', theme: 'redstone', trim: 0x8d625d, banner: 0xf08e55,
    skyLight: 0xd0b5dc, floorLight: 0x8f5554, sun: 0xffac78,
    cover: [[-12, 3, 6, 2.9, 4], [12, 3, 6, 2.9, 4], [-17, -15, 4, 3.2, 12], [17, -15, 4, 3.2, 12], [-28, 12, 2, 1.02, 11], [28, 12, 2, 1.02, 11]],
    enemies: [['Asura', -4, 1], ['Rakshasa', 4, -4], ['Asura', -22, -25], ['Rakshasa', 22, -26]],
    boss: ['GiantAsura', 0, -27],
  },
];

export class LevelManager {
  constructor(scene, enemySystem, player, weapon, onLevelChange, onVictory) {
    this.enemies = enemySystem;
    this.player = player;
    this.weapon = weapon;
    this.onLevelChange = onLevelChange;
    this.onVictory = onVictory;
    this.ui = Object.fromEntries([
      'level-number', 'level-name', 'objective', 'score', 'boss-health', 'boss-bar', 'level-announcement',
    ].map(id => [id, document.getElementById(id)]));
    this.currentLevel = 0;
    this.score = 0;
    this.checkpointScore = 0;
    this.portal = this.createPortal();
    this.portal.visible = false;
    scene.add(this.portal);
  }

  createPortal() {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.14, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x7affdb, toneMapped: false }));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.83, 40),
      new THREE.MeshBasicMaterial({
        color: 0x55eedc, transparent: true, depthWrite: false, opacity: 0.3, side: THREE.DoubleSide,
      }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.19, 0.028, 6, 40),
      new THREE.MeshBasicMaterial({ color: 0xe0fff2, toneMapped: false }));
    group.add(outer, inner, halo);
    group.position.set(0, 2.13, -29);
    return group;
  }

  resetForMenu() {
    this.enemies.clearAllEnemies();
    this.portal.visible = false;
    this.checkpointScore = 0;
  }

  startLevel(index) {
    this.enemies.clearAllEnemies();
    this.portal.visible = false;
    this.currentLevel = index;
    this.config = levels[index];
    this.score = this.checkpointScore;
    this.time = 0;
    this.spawned = 0;
    this.boss = null;
    this.winLeft = null;
    this.ui['level-number'].textContent = `Stage ${index + 1} of ${levels.length}`;
    this.ui['level-name'].textContent = this.config.name;
    this.announce(this.config.name, 1.9);
    this.onLevelChange(this.config);
    this.updateUI();
  }

  get remaining() {
    return this.config.enemies.length - this.spawned +
      this.enemies.enemies.filter(enemy => !enemy.isBoss && enemy.health > 0).length;
  }

  announce(message, duration) {
    this.announcementUntil = this.time + duration;
    this.ui['level-announcement'].textContent = message;
    this.ui['level-announcement'].hidden = false;
  }

  register(enemy) {
    enemy.onDeath = () => {
      this.score += enemy.isBoss ? 100 : 10;
      this.weapon.playEnemyDeathSound();
      if (enemy.isBoss) this.winLeft = 0.95;
      this.updateUI();
    };
  }

  updateUI() {
    const objective = this.boss ? 'Defeat the Giant Asura' :
      this.portal.visible ? 'Enter the gate at the far end' :
      this.remaining ? `${this.remaining} ${this.remaining === 1 ? 'demon' : 'demons'} remaining` :
      'The Giant Asura approaches';
    this.ui.objective.textContent = objective;
    this.ui.score.textContent = `Score ${this.score}`;
    this.ui['boss-health'].hidden = !this.boss;
    if (this.boss) this.ui['boss-bar'].style.width = `${100 * this.boss.health / this.boss.maxHealth}%`;
  }

  playCue(notes) {
    const audio = this.weapon.audioContext;
    if (audio?.state !== 'running') return;
    notes.forEach((frequency, index) => {
      const start = audio.currentTime + index * 0.13;
      const tone = audio.createOscillator();
      const envelope = audio.createGain();
      tone.type = 'triangle';
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.001, start);
      envelope.gain.exponentialRampToValueAtTime(0.095, start + 0.035);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      tone.connect(envelope).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.24);
    });
  }

  update(delta) {
    this.time += delta;
    if (this.time >= this.announcementUntil) this.ui['level-announcement'].hidden = true;
    const { enemies, boss } = this.config;
    if (this.spawned < enemies.length && this.time >= 0.32 + this.spawned * 0.38) {
      this.register(this.enemies.spawn(...enemies[this.spawned++]));
    }

    if (this.winLeft !== null) {
      this.winLeft -= delta;
      if (this.winLeft <= 0) {
        this.winLeft = null;
        this.playCue([262, 330, 392, 523]);
        this.onVictory();
        return;
      }
    } else if (!this.portal.visible && !this.remaining && !this.boss) {
      if (boss) {
        this.boss = this.enemies.spawn(...boss);
        this.register(this.boss);
        this.announce('The Giant Asura', 2.5);
        this.playCue([130, 92, 65]);
      } else {
        this.portal.visible = true;
        this.announce('Courtyard clear. Enter the gate.', 3.2);
        this.playCue([220, 330, 440]);
      }
      this.updateUI();
    }

    if (this.portal.visible) {
      this.portal.rotation.y = Math.sin(this.time * 1.25) * 0.38;
      this.portal.children[1].material.opacity = 0.28 + Math.sin(this.time * 4.0) * 0.10;
      const position = this.player.getPosition();
      if (Math.hypot(position.x - this.portal.position.x, position.z - this.portal.position.z) < 2.3) {
        this.checkpointScore = this.score;
        this.startLevel(this.currentLevel + 1);
      }
    }
    if (this.boss) this.ui['boss-bar'].style.width = `${100 * this.boss.health / this.boss.maxHealth}%`;
  }
}

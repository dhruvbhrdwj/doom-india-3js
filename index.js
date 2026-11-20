import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PlayerController } from './player.js';
import { CollisionSystem } from './collision.js';
import { createIndianGround, updateGroundTheme } from './ground.js';
import { createIndianSkybox, updateSkyboxTheme } from './skybox.js';
import { IndianArchitecturalElements } from './indianArchitecture.js';
import { createIndianStructures, disposeCourtyard } from './structures.js';
import { WeaponSystem } from './weapons.js';
import { EnemySystem } from './enemies.js';
import { HealthSystem } from './health.js';
import { LevelManager, levels } from './levelManager.js';

const el = id => document.getElementById(id);

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.27;
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  const canvas = renderer.domElement;
  document.body.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.075, 360);
  const viewCamera = new THREE.PerspectiveCamera(61, 1, 0.035, 8);
  const viewScene = new THREE.Scene();
  const viewLight = new THREE.DirectionalLight(0xffdac1, 2.4);
  viewLight.position.set(-1, 2, -1);
  viewScene.add(viewLight, new THREE.HemisphereLight(0xe5e9ff, 0x8a604e, 2.05));

  const sky = createIndianSkybox();
  const ground = createIndianGround();
  scene.add(sky, ground);
  const ambient = new THREE.HemisphereLight(0xc3d9ff, 0xae7855, 1.85);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd29e, 2.7);
  sun.position.set(-42, 58, 19);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -71;
  sun.shadow.camera.right = sun.shadow.camera.top = 71;
  sun.shadow.camera.far = 215;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.bias = -0.00026;
  sun.shadow.normalBias = 0.055;
  scene.add(sun);

  const collision = new CollisionSystem();
  const architecture = new IndianArchitecturalElements();
  scene.add(architecture.structuresGroup);
  const sharedMaterials = Object.values(architecture.materials);
  let courtyard;
  let layout;
  function applyLayout(config) {
    if (layout === config) return;
    layout = config;
    if (courtyard) disposeCourtyard(courtyard, sharedMaterials);
    collision.clearObjects();
    collision.addObject(ground);
    courtyard = createIndianStructures(architecture, config, collision);
    scene.add(courtyard);
    updateGroundTheme(ground, config.theme);
    const horizon = updateSkyboxTheme(sky, config.theme);
    scene.fog = new THREE.Fog(horizon, 48, 152);
    ambient.color.setHex(config.skyLight);
    ambient.groundColor.setHex(config.floorLight);
    sun.color.setHex(config.sun);
    sun.intensity = config.theme === 'redstone' ? 2.1 : 2.7;
    renderer.shadowMap.needsUpdate = true;
  }

  const player = new PlayerController(camera, collision, canvas);
  new PointerLockControls(camera, canvas);
  const health = new HealthSystem(scene, player);
  const enemies = new EnemySystem(scene, player, collision, health);
  let weapon;
  let level;
  let mode = 'main';
  let dirty = true;

  function show(nextMode) {
    mode = nextMode;
    el('main-menu').hidden = mode !== 'main';
    el('controls-menu').hidden = mode !== 'controls';
    el('pause-menu').hidden = mode !== 'paused';
    el('end-menu').hidden = mode !== 'lost' && mode !== 'won';
    el('hud').hidden = mode !== 'playing';
    dirty = true;
  }

  function end(won) {
    player.clearInput();
    weapon.stopFiring();
    show(won ? 'won' : 'lost');
    el('end-title').textContent = won ? 'The gate is sealed' : 'You fell';
    el('end-score').textContent = `Score ${level.score}`;
    el('retryButton').textContent = won ? 'Play again' : 'Retry level';
    document.exitPointerLock();
  }

  function ensureSystems() {
    if (weapon) return;
    weapon = new WeaponSystem(camera, viewScene, scene, player, collision, enemies, canvas);
    health.weapon = weapon;
    level = new LevelManager(scene, enemies, player, weapon, config => {
      applyLayout(config);
      enemies.buildNavigation();
      player.reset();
      health.reset();
      weapon.reset();
      dirty = true;
    }, () => end(true));
  }

  function lock() {
    el('pause-status').textContent = '';
    show('paused');
    weapon.audioContext?.resume().catch(() => {});
    try {
      canvas.requestPointerLock()?.catch(showLockError);
    } catch {
      showLockError();
    }
  }

  function showLockError() {
    el('pause-status').textContent = 'Mouse capture was blocked. Click Resume to try again.';
  }

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas && mode === 'paused') {
      show('playing');
    } else if (document.pointerLockElement !== canvas && mode === 'playing') {
      player.clearInput();
      weapon.stopFiring();
      show('paused');
    }
  });
  document.addEventListener('pointerlockerror', showLockError);

  function start() {
    ensureSystems();
    level.checkpointScore = 0;
    level.startLevel(0);
    lock();
  }

  function retry() {
    level.startLevel(level.currentLevel);
    lock();
  }

  function quit() {
    level.resetForMenu();
    applyLayout(levels[0]);
    player.reset();
    health.reset();
    weapon.reset();
    show('main');
  }

  el('startButton').addEventListener('click', start);
  el('controlsButton').addEventListener('click', () => show('controls'));
  el('backButton').addEventListener('click', () => show('main'));
  el('resumeButton').addEventListener('click', lock);
  el('restartButton').addEventListener('click', retry);
  el('quitButton').addEventListener('click', quit);
  el('endQuitButton').addEventListener('click', quit);
  el('retryButton').addEventListener('click', () => mode === 'won' ? start() : retry());
  document.addEventListener('keydown', event => {
    if (event.repeat) return;
    if (mode === 'playing' && (event.code === 'KeyP' || event.code === 'Escape')) {
      document.exitPointerLock();
    }
    if (event.code === 'KeyF' && document.fullscreenEnabled) {
      if (document.fullscreenElement) document.exitFullscreen()?.catch(() => {});
      else document.documentElement.requestFullscreen()?.catch(() => {});
    }
  });
  window.addEventListener('blur', () => {
    if (mode === 'playing') document.exitPointerLock();
  });

  function resize() {
    const { innerWidth: width, innerHeight: height } = window;
    camera.aspect = viewCamera.aspect = width / height;
    viewCamera.fov = viewCamera.aspect < 1.4 ? 72 : 61;
    camera.updateProjectionMatrix();
    viewCamera.updateProjectionMatrix();
    renderer.setSize(width, height);
    dirty = true;
  }
  window.addEventListener('resize', resize);
  applyLayout(levels[0]);
  resize();

  const step = 1 / 60;
  function update() {
    if (mode !== 'playing') return;
    player.update(step);
    enemies.update(step);
    if (health.currentHealth === 0) {
      end(false);
      return;
    }
    health.update(step);
    weapon.update(step);
    level.update(step);
  }

  function render() {
    renderer.info.reset();
    renderer.clear();
    renderer.render(scene, camera);
    if (mode === 'playing') {
      renderer.clearDepth();
      renderer.render(viewScene, viewCamera);
    }
    dirty = false;
  }

  let previous = performance.now();
  let accumulator = 0;
  let manual = false;
  function frame(now) {
    if (!manual && mode === 'playing') {
      accumulator += Math.min(0.1, (now - previous) / 1000);
      while (accumulator >= step) {
        update();
        accumulator -= step;
      }
      render();
    } else if (dirty) {
      if (mode !== 'playing') accumulator = 0;
      render();
    }
    previous = now;
    requestAnimationFrame(frame);
  }

  window.advanceTime = ms => {
    manual = true;
    for (let i = 0; i < Math.round(ms / (step * 1000)); i++) update();
    render();
  };
  window.render_game_to_text = () => JSON.stringify({
    axes: 'x right and z toward spawn at default view, y up, ground y=0',
    mode,
    level: level ? level.currentLevel + 1 : 1,
    score: level?.score ?? 0,
    remaining: level?.remaining ?? 0,
    player: {
      position: camera.position.toArray(), yaw: camera.rotation.y, pitch: camera.rotation.x,
      grounded: player.canJump, crouching: player.isCrouching, health: health.currentHealth, armor: health.currentArmor,
    },
    weapon: weapon ? {
      name: weapon.current.name, ammo: weapon.current.ammo, reserve: weapon.current.remaining,
      reload: weapon.reloadLeft,
    } : null,
    enemies: enemies.enemies.filter(enemy => enemy.health > 0).map(enemy => ({
      type: enemy.type, position: enemy.position.toArray(), health: enemy.health, aimHeight: enemy.aimHeight,
      state: enemy.state, windup: enemy.windup,
    })),
    pickups: health.pickups.filter(({ model }) => model.visible).map(({ type, model }) => ({
      type, position: model.position.toArray(),
    })),
    portal: level?.portal.visible ? level.portal.position.toArray() : null,
    drawCalls: renderer.info.render.calls,
  });
  canvas.addEventListener('webglcontextlost', () => {
    show('main');
    el('status').hidden = false;
    el('status').textContent = 'Graphics connection lost. Reload the page to continue.';
    el('startButton').disabled = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });

  requestAnimationFrame(frame);
  el('status').hidden = true;
  el('startButton').disabled = false;
  el('controlsButton').disabled = false;
}

try {
  boot();
} catch (error) {
  el('status').textContent = 'The arena could not start. Try a desktop browser with WebGL enabled.';
  console.error(error);
}

import * as THREE from 'three';

const themes = {
  sandstone: ['#a88159', '#684832', '#ddb889'],
  marble: ['#c4b2a4', '#776a72', '#f2dbbf'],
  redstone: ['#644b47', '#392c32', '#af7561'],
};

function createGroundTexture(theme) {
  const [base, grout, detail] = themes[theme];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = base;
  context.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col < 4; col++) {
      const x = col * 128 + (row % 2) * 64;
      const y = row * 128;
      context.globalAlpha = Math.random() * 0.2 + 0.07;
      context.fillStyle = col % 2 ? grout : detail;
      context.fillRect(x, y, 128, 128);
      context.globalAlpha = 1;
      context.strokeStyle = grout;
      context.strokeRect(x, y, 128, 128);
      context.strokeStyle = detail;
      context.strokeRect(x + 2, y + 2, 123, 123);
    }
  }
  context.fillStyle = grout;
  context.globalAlpha = 0.15;
  for (let i = 0; i < 9000; i++) {
    context.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 5 + 1, 1 + Math.random());
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(15, 15);
  texture.anisotropy = 8;
  return texture;
}

export function createIndianGround() {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.94 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(182, 182), material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

export function updateGroundTheme(ground, theme) {
  if (ground.userData.theme === theme) return;
  ground.material.map?.dispose();
  ground.material.map = createGroundTexture(theme);
  ground.material.needsUpdate = true;
  ground.userData.theme = theme;
}

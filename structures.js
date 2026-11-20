import * as THREE from 'three';
import { arenaHalfSize } from './collision.js';

export function createIndianStructures(architecture, config, collision) {
  const courtyard = new THREE.Group();
  const stone = architecture.materials[config.theme];
  const trim = new THREE.MeshStandardMaterial({ color: config.trim, roughness: 0.82 });
  const brass = architecture.materials.gold;
  const ember = new THREE.MeshBasicMaterial({ color: 0xffb666, toneMapped: false });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const decorations = new Map();
  const transform = new THREE.Matrix4();
  const box = (x, y, z, width, height, depth, material, solid = false) => {
    if (solid) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, depth);
      mesh.castShadow = mesh.receiveShadow = true;
      courtyard.add(mesh);
      collision.addObject(mesh);
    } else {
      if (!decorations.has(material)) decorations.set(material, []);
      decorations.get(material).push(transform.makeScale(width, height, depth).setPosition(x, y, z).clone());
    }
  };

  const wall = (x, z, width, height, depth) => {
    box(x, height / 2, z, width, height, depth, stone, true);
    box(x, height - 0.12, z, width + 0.12, 0.2, depth + 0.12, trim);
    box(x, 0.16, z, width + 0.16, 0.32, depth + 0.16, trim);
  };

  const edge = arenaHalfSize + 0.8;
  const side = 2 * edge;
  wall(0, -edge, side, 2.75, 1.5);
  wall(0, edge, side, 4.0, 1.5);
  wall(edge, 0, 1.5, 4.0, side);
  wall(-edge, 0, 1.5, 4.0, side);
  for (let tile = -36; tile <= 36; tile += 6) {
    for (const sign of [-1, 1]) {
      box(sign * edge, 4.28, tile, 2.25, 0.56, 1.55, stone);
      box(tile, sign < 0 ? 3.04 : 4.28, sign * edge, 1.55, 0.56, 2.25, stone);
    }
  }
  for (const [x, z, width, height, depth] of config.cover) wall(x, z, width, height, depth);

  // The broad central avenue leaves room for the boss and a clear route to the portal.
  for (const sign of [-1, 1]) {
    for (const z of [-27, -10, 9, 27]) {
      const x = sign * 6.5;
      box(x, 0.64, z, 0.72, 1.28, 0.72, stone, true);
      box(x, 1.26, z, 0.83, 0.16, 0.83, trim);
      box(x, 1.54, z, 0.46, 0.40, 0.46, ember);
      for (const dx of [-0.22, 0.22]) {
        for (const dz of [-0.22, 0.22]) box(x + dx, 1.53, z + dz, 0.085, 0.47, 0.085, trim);
      }
      box(x, 1.78, z, 0.59, 0.14, 0.59, brass);
      box(x, 1.88, z, 0.33, 0.10, 0.33, trim);
    }
  }

  const banner = new THREE.MeshStandardMaterial({ color: config.banner, roughness: 0.93 });
  for (const x of [-28, -18, -9, 9, 18, 28]) {
    box(x, 1.65, -edge + 0.81, 1.9, 2.2, 0.08, banner);
    box(x, 2.69, -edge + 0.92, 2.28, 0.10, 0.15, brass);
    box(x, 0.60, -edge + 0.86, 1.9, 0.11, 0.11, brass);
    box(x, 1.64, -edge + 0.87, 0.45, 0.10, 0.09, brass);
    box(x, 1.64, -edge + 0.87, 0.10, 0.45, 0.09, brass);
  }

  for (const [material, matrices] of decorations) {
    const batch = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = batch.receiveShadow = true;
    courtyard.add(batch);
  }

  // Landmarks sit beyond the battlements. The courtyard has its own simple, precise colliders.
  const landmarks = architecture.structuresGroup;
  landmarks.visible = true;
  landmarks.children.forEach(group => { group.visible = false; });
  const landmark = landmarks.getObjectByName(config.theme);
  if (landmark) landmark.visible = true;
  else {
    const create = {
      sandstone: () => {
        const temple = architecture.createNagaraTemple(8, -60, 1.15);
        for (const [x, z, scale] of [[-28, -63, 0.64], [29, -62, 0.57]]) {
          temple.attach(architecture.createNagaraTemple(x, z, scale));
        }
        return temple;
      },
      marble: () => architecture.createIndoIslamicStructure(8, -72, 0.95),
      redstone: () => architecture.createDravidianTemple(11, -81, 1.02),
    };
    create[config.theme]().name = config.theme;
  }

  return courtyard;
}

export function disposeCourtyard(courtyard, sharedMaterials) {
  courtyard.removeFromParent();
  const meshes = courtyard.children;
  meshes[0].geometry.dispose();
  for (const mesh of meshes) if (mesh.isInstancedMesh) mesh.dispose();
  for (const material of new Set(meshes.map(mesh => mesh.material))) {
    if (!sharedMaterials.includes(material)) material.dispose();
  }
}

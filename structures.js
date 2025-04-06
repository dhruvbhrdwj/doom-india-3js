import * as THREE from 'three';

// Create basic Indian architectural structures
export function createIndianStructures() {
  const structures = new THREE.Group();
  
  // Materials
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xE8C8A0, // Sandstone color
    roughness: 0.9,
    metalness: 0.1
  });
  
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xA52A2A, // Brown/red for roof tiles
    roughness: 0.8,
    metalness: 0.2
  });
  
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700, // Gold for decorative elements
    roughness: 0.3,
    metalness: 0.8
  });
  
  // Create a temple structure
  function createTemple(x, z, scale = 1) {
    const temple = new THREE.Group();
    
    // Base platform
    const baseGeometry = new THREE.BoxGeometry(20 * scale, 2 * scale, 20 * scale);
    const base = new THREE.Mesh(baseGeometry, wallMaterial);
    base.position.set(0, 1 * scale, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    temple.add(base);
    
    // Main structure
    const mainGeometry = new THREE.BoxGeometry(15 * scale, 10 * scale, 15 * scale);
    const main = new THREE.Mesh(mainGeometry, wallMaterial);
    main.position.set(0, 7 * scale, 0);
    main.castShadow = true;
    main.receiveShadow = true;
    temple.add(main);
    
    // Dome/Shikhara
    const domeGeometry = new THREE.ConeGeometry(7.5 * scale, 15 * scale, 4);
    const dome = new THREE.Mesh(domeGeometry, roofMaterial);
    dome.position.set(0, 19.5 * scale, 0);
    dome.castShadow = true;
    dome.receiveShadow = true;
    temple.add(dome);
    
    // Entrance
    const entranceGeometry = new THREE.BoxGeometry(5 * scale, 7 * scale, 1 * scale);
    const entrance = new THREE.Mesh(entranceGeometry, wallMaterial);
    entrance.position.set(0, 5.5 * scale, 8 * scale);
    entrance.castShadow = true;
    entrance.receiveShadow = true;
    temple.add(entrance);
    
    // Entrance hole
    const entranceHoleGeometry = new THREE.BoxGeometry(3 * scale, 5 * scale, 2 * scale);
    const entranceHole = new THREE.Mesh(entranceHoleGeometry, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    entranceHole.position.set(0, 5 * scale, 8.5 * scale);
    temple.add(entranceHole);
    
    // Decorative elements
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const pillarX = Math.sin(angle) * 9 * scale;
      const pillarZ = Math.cos(angle) * 9 * scale;
      
      const pillarGeometry = new THREE.CylinderGeometry(1 * scale, 1 * scale, 12 * scale, 8);
      const pillar = new THREE.Mesh(pillarGeometry, detailMaterial);
      pillar.position.set(pillarX, 8 * scale, pillarZ);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      temple.add(pillar);
    }
    
    // Position the entire temple
    temple.position.set(x, 0, z);
    
    // Add temple to collision objects
    temple.children.forEach(child => {
      if (child !== entranceHole) { // Don't add the entrance hole to collision objects
        child.userData.isCollidable = true;
      }
    });
    
    return temple;
  }
  
  // Create a small house
  function createHouse(x, z, rotation = 0, scale = 1) {
    const house = new THREE.Group();
    
    // House base
    const baseGeometry = new THREE.BoxGeometry(10 * scale, 8 * scale, 12 * scale);
    const base = new THREE.Mesh(baseGeometry, wallMaterial);
    base.position.set(0, 4 * scale, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData.isCollidable = true;
    house.add(base);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(8 * scale, 6 * scale, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 11 * scale, 0);
    roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.isCollidable = true;
    house.add(roof);
    
    // Door
    const doorGeometry = new THREE.PlaneGeometry(2.5 * scale, 4 * scale);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 2.5 * scale, 6.01 * scale);
    door.castShadow = true;
    door.receiveShadow = true;
    house.add(door);
    
    // Windows
    const windowGeometry = new THREE.PlaneGeometry(2 * scale, 2 * scale);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xADD8E6,
      roughness: 0.3,
      metalness: 0.5,
      side: THREE.DoubleSide
    });
    
    // Front windows
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(-3 * scale, 4 * scale, 6.01 * scale);
    window1.castShadow = true;
    window1.receiveShadow = true;
    house.add(window1);
    
    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(3 * scale, 4 * scale, 6.01 * scale);
    window2.castShadow = true;
    window2.receiveShadow = true;
    house.add(window2);
    
    // Position and rotate the house
    house.position.set(x, 0, z);
    house.rotation.y = rotation;
    
    return house;
  }
  
  // Add a temple at the center
  structures.add(createTemple(0, -50, 1.5));
  
  // Add houses around
  structures.add(createHouse(-30, -20, Math.PI / 6));
  structures.add(createHouse(-40, -35, -Math.PI / 4));
  structures.add(createHouse(25, -25, Math.PI / 3));
  structures.add(createHouse(35, -40, -Math.PI / 5));
  structures.add(createHouse(-20, -60, Math.PI / 2));
  structures.add(createHouse(20, -70, -Math.PI / 2));
  
  return structures;
}

import * as THREE from 'three';

// Create a textured ground with Indian-inspired patterns
export function createIndianGround() {
  // Create a repeating texture for the ground
  const textureLoader = new THREE.TextureLoader();
  
  // Create a canvas for the procedural texture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;
  
  // Fill background with sandy color
  context.fillStyle = '#D2B48C';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some Indian-inspired patterns
  context.strokeStyle = '#8B4513';
  context.lineWidth = 2;
  
  // Draw mandala-like patterns
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Outer circle
  context.beginPath();
  context.arc(centerX, centerY, 200, 0, Math.PI * 2);
  context.stroke();
  
  // Inner circles and patterns
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * 150;
    const y = centerY + Math.sin(angle) * 150;
    
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.stroke();
  }
  
  // Create radial patterns
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x1 = centerX + Math.cos(angle) * 80;
    const y1 = centerY + Math.sin(angle) * 80;
    const x2 = centerX + Math.cos(angle) * 180;
    const y2 = centerY + Math.sin(angle) * 180;
    
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  
  // Create ground geometry
  const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
  
  // Create material with the texture
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  
  return ground;
}
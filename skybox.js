import * as THREE from 'three';

// Create a skybox with Indian-themed sky
export function createIndianSkybox() {
  const textureLoader = new THREE.TextureLoader();
  
  // Create a canvas for the procedural skybox
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 1024;
  
  // Create gradient for sky (warm Indian sunset)
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#FF7F50'); // Coral at top
  gradient.addColorStop(0.3, '#FFA07A'); // Light salmon
  gradient.addColorStop(0.6, '#FFD700'); // Gold
  gradient.addColorStop(1, '#FF4500'); // OrangeRed at horizon
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some clouds
  context.fillStyle = 'rgba(255, 255, 255, 0.7)';
  
  // Draw stylized clouds
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.5; // Clouds only in top half
    const width = 50 + Math.random() * 100;
    const height = 20 + Math.random() * 30;
    
    context.beginPath();
    context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    context.fill();
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create skybox geometry (large sphere)
  const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
  
  // Create material with the texture (inside of sphere)
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide // Render on inside of sphere
  });
  
  // Create mesh
  const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
  
  return skybox;
}

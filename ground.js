import * as THREE from 'three';

// Ground themes for different levels
const groundThemes = {
  sandstone: {
    baseColor: '#D2B48C',
    patternColor: '#8B4513',
    name: 'Temple Grounds'
  },
  marble: {
    baseColor: '#FFFAFA',
    patternColor: '#C0C0C0',
    name: 'Royal Palace'
  },
  redstone: {
    baseColor: '#8B0000',
    patternColor: '#4A0000',
    name: 'Dark Fortress'
  }
};

// Create a themed ground texture
function createGroundTexture(theme = 'sandstone') {
  const themeConfig = groundThemes[theme] || groundThemes.sandstone;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;
  
  // Fill background with theme color
  context.fillStyle = themeConfig.baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some texture noise
  for (let i = 0; i < 30000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2 + 1;
    const alpha = Math.random() * 0.15;
    context.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    context.fillRect(x, y, size, size);
  }
  
  // Add Indian-inspired patterns
  context.strokeStyle = themeConfig.patternColor;
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

  // Add theme-specific decorations
  if (theme === 'redstone') {
    // Add cracks/lava lines for dark fortress
    context.strokeStyle = '#FF4500';
    context.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const startX = Math.random() * canvas.width;
      const startY = Math.random() * canvas.height;
      context.beginPath();
      context.moveTo(startX, startY);
      for (let j = 0; j < 5; j++) {
        const dx = (Math.random() - 0.5) * 100;
        const dy = (Math.random() - 0.5) * 100;
        context.lineTo(startX + dx, startY + dy);
      }
      context.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(25, 25);
  
  return texture;
}

// Create ground mesh with default theme
export function createIndianGround(theme = 'sandstone') {
  const texture = createGroundTexture(theme);
  
  // Create ground geometry - expanded to 500x500
  const groundGeometry = new THREE.PlaneGeometry(500, 500, 64, 64);
  
  // Create material with the texture
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0; // Explicitly set ground at y=0
  ground.receiveShadow = true;
  ground.name = 'ground';
  
  // Store reference to update theme later
  ground.userData.currentTheme = theme;
  ground.userData.updateTheme = (newTheme) => {
    const newTexture = createGroundTexture(newTheme);
    ground.material.map = newTexture;
    ground.material.needsUpdate = true;
    ground.userData.currentTheme = newTheme;
  };
  
  return ground;
}

// Update existing ground with new theme
export function updateGroundTheme(ground, theme) {
  if (ground && ground.userData.updateTheme) {
    ground.userData.updateTheme(theme);
  }
}

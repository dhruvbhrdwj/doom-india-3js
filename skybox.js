import * as THREE from 'three';

// Skybox themes for different levels
const skyThemes = {
  sandstone: {
    gradientStops: [
      { stop: 0, color: '#87CEEB' },    // Light blue at top
      { stop: 0.3, color: '#B0E0E6' },  // Powder blue
      { stop: 0.6, color: '#FFD700' },  // Gold
      { stop: 1, color: '#FFA500' }     // Orange at horizon
    ],
    cloudColor: 'rgba(255, 255, 255, 0.7)',
    cloudCount: 15
  },
  marble: {
    gradientStops: [
      { stop: 0, color: '#FF7F50' },    // Coral at top
      { stop: 0.3, color: '#FFA07A' },  // Light salmon
      { stop: 0.6, color: '#FFD700' },  // Gold
      { stop: 1, color: '#FF4500' }     // OrangeRed at horizon
    ],
    cloudColor: 'rgba(255, 200, 150, 0.6)',
    cloudCount: 20
  },
  redstone: {
    gradientStops: [
      { stop: 0, color: '#1a0000' },    // Almost black at top
      { stop: 0.3, color: '#4A0000' },  // Dark red
      { stop: 0.6, color: '#8B0000' },  // Crimson
      { stop: 1, color: '#FF4500' }     // Fire orange at horizon
    ],
    cloudColor: 'rgba(100, 0, 0, 0.5)',
    cloudCount: 8
  }
};

// Create skybox texture with theme
function createSkyTexture(theme = 'sandstone') {
  const themeConfig = skyThemes[theme] || skyThemes.sandstone;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 1024;
  
  // Create gradient for sky
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  themeConfig.gradientStops.forEach(({ stop, color }) => {
    gradient.addColorStop(stop, color);
  });
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add clouds
  context.fillStyle = themeConfig.cloudColor;
  
  for (let i = 0; i < themeConfig.cloudCount; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.5;
    const width = 50 + Math.random() * 100;
    const height = 20 + Math.random() * 30;
    
    context.beginPath();
    context.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    context.fill();
  }

  // Add atmospheric effects for dark theme
  if (theme === 'redstone') {
    // Add some ember particles
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = canvas.height * 0.6 + Math.random() * canvas.height * 0.4;
      const size = 2 + Math.random() * 4;
      
      context.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.5})`;
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
    }
  }
  
  return new THREE.CanvasTexture(canvas);
}

// Create a skybox with themed sky
export function createIndianSkybox(theme = 'sandstone') {
  const texture = createSkyTexture(theme);
  
  // Create skybox geometry (large sphere)
  const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
  
  // Create material with the texture (inside of sphere)
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });
  
  // Create mesh
  const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
  skybox.name = 'skybox';
  
  // Store reference to update theme later
  skybox.userData.currentTheme = theme;
  skybox.userData.updateTheme = (newTheme) => {
    const newTexture = createSkyTexture(newTheme);
    skybox.material.map = newTexture;
    skybox.material.needsUpdate = true;
    skybox.userData.currentTheme = newTheme;
  };
  
  return skybox;
}

// Update existing skybox with new theme
export function updateSkyboxTheme(skybox, theme) {
  if (skybox && skybox.userData.updateTheme) {
    skybox.userData.updateTheme(theme);
  }
}

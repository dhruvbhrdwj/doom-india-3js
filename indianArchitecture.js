// Indian architectural elements and textures
import * as THREE from 'three';

// Create detailed Indian architectural elements
export class IndianArchitecturalElements {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.materials = this.createMaterials();
        this.structuresGroup = new THREE.Group(); // Group to hold all created structures
        // Note: The original 'structures' array is removed as we now use the group's children.
        // If you need the array for specific logic, you can re-add it and populate it within the creation methods.
    }

    // Create various materials with Indian-inspired textures
    createMaterials() {
        // Create procedural textures
        return {
            // Sandstone material (for temples in Nagara style)
            sandstone: new THREE.MeshStandardMaterial({
                color: 0xE8C8A0,
                roughness: 0.9,
                metalness: 0.1,
                map: this.createSandstoneTexture(),
                side: THREE.DoubleSide // Ensure material is visible from inside if needed
            }),

            // Red stone material (for temples in Dravidian style)
            redstone: new THREE.MeshStandardMaterial({
                color: 0xA52A2A,
                roughness: 0.8,
                metalness: 0.2,
                map: this.createRedStoneTexture(),
                side: THREE.DoubleSide
            }),

            // Marble material (for Indo-Islamic architecture)
            marble: new THREE.MeshStandardMaterial({
                color: 0xFFFAFA,
                roughness: 0.2,
                metalness: 0.1,
                map: this.createMarbleTexture(),
                side: THREE.DoubleSide
            }),

            // Gold material (for decorative elements)
            gold: new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                roughness: 0.3,
                metalness: 0.8,
                side: THREE.DoubleSide
            }),

            // Wood material (for doors and structural elements)
            wood: new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 0.9,
                metalness: 0.1,
                map: this.createWoodTexture(),
                side: THREE.DoubleSide
            }),

            // Painted wall material (for colorful temple walls)
            paintedWall: new THREE.MeshStandardMaterial({
                color: 0xFAF0E6,
                roughness: 0.7,
                metalness: 0.1,
                map: this.createPaintedWallTexture(),
                side: THREE.DoubleSide
            }),

            // Simple black material for holes/entrances
            blackHole: new THREE.MeshBasicMaterial({
                 color: 0x000000,
                 side: THREE.DoubleSide // Make sure it's visible
            })
        };
    }

    // --- Procedural Texture Creation Methods ---
    // (These methods remain the same as in your original code)

    // Create procedural sandstone texture
    createSandstoneTexture() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Base color
        context.fillStyle = '#E8C8A0';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add grain and variation
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            const shade = Math.random() * 30;

            context.fillStyle = `rgba(${150 + shade}, ${130 + shade}, ${100 + shade}, 0.5)`;
            context.fillRect(x, y, size, size);
        }

        // Add some cracks
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const length = Math.random() * 100 + 50;
            const angle = Math.random() * Math.PI * 2;

            context.strokeStyle = 'rgba(100, 80, 60, 0.3)';
            context.lineWidth = Math.random() * 2 + 0.5;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            context.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true; // Important for canvas textures

        return texture;
    }

    // Create procedural red stone texture
    createRedStoneTexture() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Base color
        context.fillStyle = '#A52A2A';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add grain and variation
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            const shade = Math.random() * 30;

            context.fillStyle = `rgba(${165 + shade}, ${42 + shade}, ${42 + shade}, 0.5)`;
            context.fillRect(x, y, size, size);
        }

        // Add some cracks and lines
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const length = Math.random() * 100 + 50;
            const angle = Math.random() * Math.PI * 2;

            context.strokeStyle = 'rgba(80, 30, 30, 0.3)';
            context.lineWidth = Math.random() * 2 + 0.5;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            context.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        return texture;
    }

    // Create procedural marble texture
    createMarbleTexture() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Base color
        context.fillStyle = '#FFFAFA';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add marble veins
        for (let i = 0; i < 15; i++) {
            let currentX = Math.random() * canvas.width;
            let currentY = Math.random() * canvas.height;
            const segments = Math.floor(Math.random() * 5) + 3; // Number of segments in the vein
            const veinWidth = Math.random() * 8 + 2;
            const veinColor = `rgba(200, 200, 200, ${Math.random() * 0.3 + 0.1})`; // Vary opacity

            context.strokeStyle = veinColor;
            context.lineWidth = veinWidth;
            context.beginPath();
            context.moveTo(currentX, currentY);

            for (let j = 0; j < segments; j++) {
                const angle = (Math.random() - 0.5) * Math.PI * 0.8; // Keep veins somewhat directional
                const length = Math.random() * 100 + 50;
                const nextX = currentX + Math.cos(angle) * length;
                const nextY = currentY + Math.sin(angle) * length;
                context.lineTo(nextX, nextY);
                currentX = nextX;
                currentY = nextY;
            }
            context.stroke();
        }


        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        return texture;
    }

    // Create procedural wood texture
    createWoodTexture() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Base color with slight variation
        const baseR = 139;
        const baseG = 69;
        const baseB = 19;
        context.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add wood grain using Perlin noise or simpler lines
        const grainColor = `rgba(${baseR - 40}, ${baseG - 30}, ${baseB - 10}, 0.3)`;
        context.strokeStyle = grainColor;
        context.lineWidth = 1.5;

        for (let y = 0; y < canvas.height; y += Math.random() * 5 + 3) {
            context.beginPath();
            context.moveTo(0, y);
            let currentX = 0;
            while (currentX < canvas.width) {
                const segmentLength = Math.random() * 50 + 20;
                const yOffset = (Math.random() - 0.5) * 4; // Slight waviness
                context.lineTo(currentX + segmentLength, y + yOffset);
                currentX += segmentLength;
            }
            context.stroke();
        }


        // Add knots
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 15 + 5;
            const knotColor = `rgba(${baseR - 60}, ${baseG - 40}, ${baseB - 15}, 0.8)`;

            context.fillStyle = knotColor;
            context.beginPath();
            context.ellipse(x, y, radius, radius * (Math.random() * 0.4 + 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
            context.fill();

            // Add rings around the knot
             const ringColor = `rgba(${baseR - 50}, ${baseG - 35}, ${baseB - 12}, 0.6)`;
             context.strokeStyle = ringColor;
             context.lineWidth = 1;
             for (let j=1; j<4; j++) {
                 context.beginPath();
                 context.ellipse(x, y, radius * (1 + j*0.3), radius * (0.6 + j*0.2), Math.random() * Math.PI, 0, Math.PI * 2);
                 context.stroke();
             }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        return texture;
    }

    // Create procedural painted wall texture with Indian motifs
    createPaintedWallTexture() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;

        // Base color
        context.fillStyle = '#FAF0E6'; // Linen color
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add subtle plaster texture/noise
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 1.5 + 0.5;
            const shade = (Math.random() - 0.5) * 20; // Lighter or darker spots

            context.fillStyle = `rgba(${250 + shade}, ${240 + shade}, ${230 + shade}, 0.15)`; // More subtle
            context.fillRect(x, y, size, size);
        }

        // Add Indian motifs - simplified paisley and lotus
        const motifColors = [
            'rgba(180, 60, 60, 0.6)', // Muted red
            'rgba(60, 120, 60, 0.6)', // Muted green
            'rgba(60, 60, 180, 0.6)', // Muted blue
            'rgba(180, 120, 60, 0.6)'  // Ochre
        ];
        for (let i = 0; i < 8; i++) { // More motifs
            const x = Math.random() * (canvas.width - 80) + 40; // Avoid edges
            const y = Math.random() * (canvas.height - 80) + 40;
            const size = Math.random() * 30 + 15;
            const color = motifColors[Math.floor(Math.random() * motifColors.length)];

            if (Math.random() > 0.5) {
                this.drawLotusPattern(context, x, y, size, color);
            } else {
                this.drawPaisleyPattern(context, x, y, size, color);
            }
        }

        // Add border patterns
        context.strokeStyle = 'rgba(160, 100, 70, 0.5)'; // Slightly darker/richer border
        context.lineWidth = 15; // Thicker border
        context.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        // Add decorative inner border line
        context.strokeStyle = 'rgba(210, 150, 100, 0.7)'; // Lighter inner line
        context.lineWidth = 2;
        context.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);


        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        return texture;
    }

    // Helper method to draw lotus pattern
    drawLotusPattern(context, x, y, size, color) {
        const petalCount = 8;
        context.fillStyle = color;
        context.strokeStyle = 'rgba(50, 50, 50, 0.2)'; // Subtle outline
        context.lineWidth = 0.5;

        // Draw petals
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalLength = size * 0.6;
            const petalWidth = size * 0.3;

            context.save(); // Save context state
            context.translate(x, y); // Move origin to center
            context.rotate(angle); // Rotate for petal placement

            context.beginPath();
            // Draw petal shape using bezier curves for a more organic look
            context.moveTo(0, 0);
            context.bezierCurveTo(petalWidth / 2, -petalLength / 2, petalWidth / 2, -petalLength, 0, -petalLength);
            context.bezierCurveTo(-petalWidth / 2, -petalLength, -petalWidth / 2, -petalLength / 2, 0, 0);
            context.fill();
            context.stroke();

            context.restore(); // Restore context state
        }

        // Draw center
        context.beginPath();
        context.arc(x, y, size * 0.2, 0, Math.PI * 2);
        context.fillStyle = 'rgba(220, 180, 50, 0.8)'; // Yellowish center
        context.fill();
        context.stroke(); // Outline center
    }

     // Helper method to draw paisley pattern
    drawPaisleyPattern(context, x, y, size, color) {
        context.fillStyle = color;
        context.strokeStyle = 'rgba(50, 50, 50, 0.2)';
        context.lineWidth = 0.5;

        context.beginPath();
        context.moveTo(x, y);
        // Define control points for the paisley curve
        const cp1x = x - size * 1.5; // Control point 1 x
        const cp1y = y - size * 0.5; // Control point 1 y
        const cp2x = x - size * 0.5; // Control point 2 x
        const cp2y = y + size * 1.5; // Control point 2 y
        const endX = x + size * 0.8; // End point x
        const endY = y + size * 0.2; // End point y

        // Draw the main curve
        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

        // Draw the bottom curve back to the start
        context.quadraticCurveTo(x + size * 0.1, y + size * 0.6, x, y); // Simpler curve for bottom

        context.fill();
        context.stroke();

        // Add a small dot inside
        context.beginPath();
        context.arc(x - size * 0.1, y + size * 0.3, size * 0.1, 0, Math.PI * 2);
        context.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Light inner dot
        context.fill();
    }


    // --- Structure Creation Methods ---

    // Create a Nagara style temple (Northern Indian)
    createNagaraTemple(x, z, scale = 1) {
        const temple = new THREE.Group();
        temple.name = "NagaraTemple"; // Add name for identification

        // Base platform (jagati)
        const baseGeometry = new THREE.BoxGeometry(20 * scale, 2 * scale, 20 * scale);
        const base = new THREE.Mesh(baseGeometry, this.materials.sandstone);
        base.position.set(0, 1 * scale, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        base.userData = { isCollidable: true, type: 'structure_base' }; // Add type info
        temple.add(base);

        // Main structure (garbhagriha)
        const mainGeometry = new THREE.BoxGeometry(12 * scale, 10 * scale, 12 * scale);
        const main = new THREE.Mesh(mainGeometry, this.materials.sandstone);
        main.position.set(0, 7 * scale, 0);
        main.castShadow = true;
        main.receiveShadow = true;
        main.userData = { isCollidable: true, type: 'structure_wall' };
        temple.add(main);

        // Shikhara (tower)
        const shikharaGeometry = this.createNagaraShikharaGeometry(6 * scale, 15 * scale);
        const shikhara = new THREE.Mesh(shikharaGeometry, this.materials.sandstone);
        shikhara.position.set(0, 12 * scale, 0); // Position base of shikhara on top of main structure
        shikhara.castShadow = true;
        shikhara.receiveShadow = true;
        shikhara.userData = { isCollidable: true, type: 'structure_tower' };
        temple.add(shikhara);

        // Amalaka (stone disk at the top of shikhara)
        const amalakaGeometry = new THREE.TorusGeometry(2 * scale, 0.5 * scale, 16, 32);
        const amalaka = new THREE.Mesh(amalakaGeometry, this.materials.sandstone);
        // Position relative to the top of the shikhara
        amalaka.position.set(0, 12 * scale + 15 * scale, 0); // main height + shikhara height
        amalaka.rotation.x = Math.PI / 2; // Rotate to lie flat
        amalaka.castShadow = true;
        amalaka.receiveShadow = true;
        temple.add(amalaka);

        // Kalasha (finial)
        const kalashaGeometry = new THREE.SphereGeometry(1 * scale, 16, 16);
        const kalasha = new THREE.Mesh(kalashaGeometry, this.materials.gold);
         // Position relative to the top of the amalaka
        kalasha.position.set(0, 12 * scale + 15 * scale + 0.5 * scale, 0); // main height + shikhara height + amalaka radius
        kalasha.castShadow = true;
        kalasha.receiveShadow = true;
        temple.add(kalasha);

        // Entrance (mandapa) - make it slightly separate for collision clarity if needed
        const entranceGroup = new THREE.Group();
        entranceGroup.position.set(0, 0, 11 * scale); // Position relative to main structure center

        const entranceBaseGeometry = new THREE.BoxGeometry(8 * scale, 7 * scale, 12 * scale);
        const entranceBase = new THREE.Mesh(entranceBaseGeometry, this.materials.sandstone);
        entranceBase.position.set(0, 5.5 * scale, 0); // Centered y on base
        entranceBase.castShadow = true;
        entranceBase.receiveShadow = true;
        entranceBase.userData = { isCollidable: true, type: 'structure_entrance' };
        entranceGroup.add(entranceBase);

        // Entrance roof
        const entranceRoofGeometry = new THREE.BoxGeometry(10 * scale, 2 * scale, 14 * scale);
        const entranceRoof = new THREE.Mesh(entranceRoofGeometry, this.materials.sandstone);
        entranceRoof.position.set(0, 10 * scale, 0); // On top of entrance base
        entranceRoof.castShadow = true;
        entranceRoof.receiveShadow = true;
        entranceRoof.userData = { isCollidable: true, type: 'structure_roof' };
        entranceGroup.add(entranceRoof);

        // Entrance hole (visual only, doesn't need collision usually)
        const entranceHoleGeometry = new THREE.PlaneGeometry(4 * scale, 6 * scale); // Use Plane for a simple hole
        const entranceHole = new THREE.Mesh(entranceHoleGeometry, this.materials.blackHole);
        // Positioned on the front face of the entrance base
        entranceHole.position.set(0, 5 * scale, 6.01 * scale); // Slightly in front of the entrance base face
        entranceGroup.add(entranceHole);

        temple.add(entranceGroup);


        // Decorative pillars around the main structure
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4; // Offset angle
            const radius = 8 * scale; // Distance from center
            const pillarX = Math.cos(angle) * radius;
            const pillarZ = Math.sin(angle) * radius;

            const pillar = this.createDecorativePillar(scale * 0.8); // Slightly smaller scale
            pillar.position.set(pillarX, 2*scale, pillarZ); // Position on the base platform
            temple.add(pillar);
        }

        // Position the entire temple
        temple.position.set(x, 0, z); // Set final world position
        // Add the completed temple group to the main structures group
        this.structuresGroup.add(temple);
        return temple; // Return the individual temple if needed elsewhere
    }

    // Function to create Nagara Shikhara Geometry using LatheGeometry
    createNagaraShikharaGeometry(baseRadius, totalHeight) {
        const points = [];
        const segments = 12; // Number of vertical segments
        const radialSegments = 16; // Number of radial segments

        // Define the profile curve of the Shikhara (adjust points for desired shape)
        points.push(new THREE.Vector2(baseRadius, 0)); // Base right edge
        points.push(new THREE.Vector2(baseRadius * 1.1, totalHeight * 0.1)); // Slight outward curve
        points.push(new THREE.Vector2(baseRadius * 0.8, totalHeight * 0.4));
        points.push(new THREE.Vector2(baseRadius * 0.5, totalHeight * 0.7));
        points.push(new THREE.Vector2(baseRadius * 0.2, totalHeight * 0.9));
        points.push(new THREE.Vector2(0.01, totalHeight)); // Point slightly off center for sharp top

        // Create geometry by rotating the profile curve
        const geometry = new THREE.LatheGeometry(points, radialSegments, 0, Math.PI * 2);
        return geometry;
    }


    // Create a Dravidian style temple (Southern Indian)
    createDravidianTemple(x, z, scale = 1) {
        const temple = new THREE.Group();
        temple.name = "DravidianTemple";

        // Base platform (jagati) - Often more ornate
        const baseGeometry = new THREE.BoxGeometry(30 * scale, 3 * scale, 30 * scale);
        const base = new THREE.Mesh(baseGeometry, this.materials.redstone);
        base.position.set(0, 1.5 * scale, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        base.userData = { isCollidable: true, type: 'structure_base' };
        temple.add(base);

        // Main structure (garbhagriha)
        const mainGeometry = new THREE.BoxGeometry(15 * scale, 12 * scale, 15 * scale);
        const main = new THREE.Mesh(mainGeometry, this.materials.redstone);
        main.position.set(0, 3 * scale + 6 * scale, 0); // On top of base
        main.castShadow = true;
        main.receiveShadow = true;
        main.userData = { isCollidable: true, type: 'structure_wall' };
        temple.add(main);

        // Vimana (tower) - created as stacked layers
        const vimanaGroup = new THREE.Group();
        vimanaGroup.name = "Vimana";
        const vimanaLayers = 5;
        let currentHeight = 3 * scale + 12 * scale; // Top of main structure
        let currentSize = 14 * scale; // Start slightly smaller than main structure

        for (let i = 0; i < vimanaLayers; i++) {
            const layerHeight = (4 - i * 0.5) * scale; // Layers get shorter towards the top
            const layerSize = currentSize * (1 - 0.15 * i); // Layers get narrower
            const layerY = currentHeight + layerHeight / 2;

            const layerGeometry = new THREE.BoxGeometry(layerSize, layerHeight, layerSize);
            const layer = new THREE.Mesh(layerGeometry, this.materials.redstone);
            layer.position.set(0, layerY, 0);
            layer.castShadow = true;
            layer.receiveShadow = true;
            layer.userData = { isCollidable: true, type: 'structure_tower_layer' };
            vimanaGroup.add(layer);

            // Add decorative elements (simple example: small spheres)
            const detailScale = layerSize * 0.05;
            for(let dx=-1; dx<=1; dx+=2) {
                for(let dz=-1; dz<=1; dz+=2) {
                    const detailGeo = new THREE.SphereGeometry(detailScale, 8, 8);
                    const detailMesh = new THREE.Mesh(detailGeo, this.materials.gold);
                    detailMesh.position.set(dx * layerSize/2 * 0.9, layerY, dz * layerSize/2 * 0.9);
                    vimanaGroup.add(detailMesh);
                }
            }


            currentHeight += layerHeight;
            // currentSize = layerSize; // Size update is handled by the formula now
        }
        temple.add(vimanaGroup);

        // Add a Stupi (similar to Kalasha) on top of Vimana
        const stupiGeometry = new THREE.ConeGeometry(1.5 * scale, 4 * scale, 16); // More conical
        const stupi = new THREE.Mesh(stupiGeometry, this.materials.gold);
        stupi.position.set(0, currentHeight + 2 * scale, 0); // Position above last layer
        stupi.castShadow = true;
        stupi.receiveShadow = true;
        temple.add(stupi);

        // Entrance Gopuram (Gateway Tower) - Often prominent in Dravidian style
        const gopuramGroup = new THREE.Group();
        gopuramGroup.position.set(0, 0, 25 * scale); // Positioned in front of the temple base

        // Gopuram Base
        const gopuramBaseWidth = 12 * scale;
        const gopuramBaseDepth = 8 * scale;
        const gopuramBaseHeight = 10 * scale;
        const gopuramBaseGeo = new THREE.BoxGeometry(gopuramBaseWidth, gopuramBaseHeight, gopuramBaseDepth);
        const gopuramBase = new THREE.Mesh(gopuramBaseGeo, this.materials.redstone);
        gopuramBase.position.set(0, gopuramBaseHeight / 2, 0);
        gopuramBase.castShadow = true;
        gopuramBase.receiveShadow = true;
        gopuramBase.userData = { isCollidable: true, type: 'structure_gopuram_base' };
        gopuramGroup.add(gopuramBase);

        // Gopuram Upper Structure (tapered)
        const gopuramTopWidth = gopuramBaseWidth * 0.7;
        const gopuramTopDepth = gopuramBaseDepth * 0.7;
        const gopuramTopHeight = 15 * scale;
        const gopuramTopShape = new THREE.Shape();
        // Define trapezoidal profile
        gopuramTopShape.moveTo(-gopuramBaseWidth/2, 0);
        gopuramTopShape.lineTo(gopuramBaseWidth/2, 0);
        gopuramTopShape.lineTo(gopuramTopWidth/2, gopuramTopHeight);
        gopuramTopShape.lineTo(-gopuramTopWidth/2, gopuramTopHeight);
        gopuramTopShape.lineTo(-gopuramBaseWidth/2, 0);

        const extrudeSettings = { depth: gopuramBaseDepth, bevelEnabled: false };
        const gopuramTopGeo = new THREE.ExtrudeGeometry(gopuramTopShape, extrudeSettings);
        // Adjust extrusion depth and position
        gopuramTopGeo.translate(0, 0, -gopuramBaseDepth/2); // Center the extrusion
        const gopuramTop = new THREE.Mesh(gopuramTopGeo, this.materials.paintedWall); // Use different material
        gopuramTop.position.set(0, gopuramBaseHeight, 0); // Position on top of base
        gopuramTop.castShadow = true;
        gopuramTop.receiveShadow = true;
        gopuramTop.userData = { isCollidable: true, type: 'structure_gopuram_top' };
        gopuramGroup.add(gopuramTop);


        // Gopuram Entrance Hole (visual)
        const entranceHoleWidth = gopuramBaseWidth * 0.4;
        const entranceHoleHeight = gopuramBaseHeight * 0.6;
        const entranceHoleGeometry = new THREE.PlaneGeometry(entranceHoleWidth, entranceHoleHeight);
        const entranceHole = new THREE.Mesh(entranceHoleGeometry, this.materials.blackHole);
        // Position on the front face of the gopuram base
        entranceHole.position.set(0, entranceHoleHeight / 2, gopuramBaseDepth / 2 + 0.01); // Slightly in front
        gopuramGroup.add(entranceHole);
         // Add a corresponding hole on the back face
        const entranceHoleBack = entranceHole.clone();
        entranceHoleBack.position.z = -gopuramBaseDepth / 2 - 0.01; // Slightly behind
        entranceHoleBack.rotation.y = Math.PI; // Rotate to face inwards
        gopuramGroup.add(entranceHoleBack);


        temple.add(gopuramGroup);

        // Position the entire temple
        temple.position.set(x, 0, z);
        this.structuresGroup.add(temple);
        return temple;
    }


    // Create an Indo-Islamic structure (e.g., mosque, tomb)
    createIndoIslamicStructure(x, z, scale = 1) {
        const structure = new THREE.Group();
        structure.name = "IndoIslamicStructure";

        // Base platform
        const baseGeometry = new THREE.BoxGeometry(40 * scale, 4 * scale, 40 * scale);
        const base = new THREE.Mesh(baseGeometry, this.materials.marble);
        base.position.set(0, 2 * scale, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        base.userData = { isCollidable: true, type: 'structure_base' };
        structure.add(base);

        // Main hall
        const hallGeometry = new THREE.BoxGeometry(30 * scale, 15 * scale, 30 * scale);
        const hall = new THREE.Mesh(hallGeometry, this.materials.marble);
        hall.position.set(0, 4 * scale + 7.5 * scale, 0); // On top of base
        hall.castShadow = true;
        hall.receiveShadow = true;
        hall.userData = { isCollidable: true, type: 'structure_wall' };
        structure.add(hall);

        // Main dome
        const mainDomeRadius = 12 * scale;
        const mainDome = this.createDome(mainDomeRadius, this.materials.marble);
        mainDome.position.set(0, 4 * scale + 15 * scale, 0); // On top of hall
        structure.add(mainDome);

        // Four smaller corner domes (Chatris)
        const cornerDomeRadius = 4 * scale;
        const cornerOffset = 13 * scale; // Offset from center
        const cornerDomeY = 4 * scale + 15 * scale; // Top of hall level
        const corners = [
            { x: cornerOffset, z: cornerOffset },
            { x: -cornerOffset, z: cornerOffset },
            { x: cornerOffset, z: -cornerOffset },
            { x: -cornerOffset, z: -cornerOffset },
        ];
        corners.forEach(corner => {
            const cornerDome = this.createDome(cornerDomeRadius, this.materials.marble);
            cornerDome.position.set(corner.x, cornerDomeY, corner.z);
            structure.add(cornerDome);
        });


        // Four Minarets at the corners of the base platform
        const minaretRadius = 2.5 * scale;
        const minaretHeight = 30 * scale;
        const minaretOffset = 18 * scale; // Offset from center on the base
        const minaretY = 4 * scale; // Base height of minarets (on the platform)
         const minaretCorners = [
            { x: minaretOffset, z: minaretOffset },
            { x: -minaretOffset, z: minaretOffset },
            { x: minaretOffset, z: -minaretOffset },
            { x: -minaretOffset, z: -minaretOffset },
        ];
         minaretCorners.forEach(corner => {
            const minaret = this.createMinaret(minaretRadius, minaretHeight, this.materials.marble);
            minaret.position.set(corner.x, minaretY, corner.z); // Position base of minaret
            structure.add(minaret);
        });


        // Arched Entrances (Iwans) on each side of the main hall
        const archWidth = 10 * scale;
        const archHeight = 12 * scale; // Make arches tall
        const archDepth = 2 * scale; // Give arch some thickness
        const archY = 4 * scale + archHeight / 2; // Center arch vertically on hall wall
        const archOffset = 15 * scale; // Center of hall wall

        // Front Arch
        const frontArch = this.createArch(archWidth, archHeight, archDepth, this.materials.marble);
        frontArch.position.set(0, archY, archOffset);
        structure.add(frontArch);
         // Back Arch
        const backArch = this.createArch(archWidth, archHeight, archDepth, this.materials.marble);
        backArch.position.set(0, archY, -archOffset);
        backArch.rotation.y = Math.PI;
        structure.add(backArch);
        // Left Arch
        const leftArch = this.createArch(archWidth, archHeight, archDepth, this.materials.marble);
        leftArch.position.set(-archOffset, archY, 0);
        leftArch.rotation.y = -Math.PI / 2;
        structure.add(leftArch);
        // Right Arch
        const rightArch = this.createArch(archWidth, archHeight, archDepth, this.materials.marble);
        rightArch.position.set(archOffset, archY, 0);
        rightArch.rotation.y = Math.PI / 2;
        structure.add(rightArch);

        // Add visual holes behind arches
        const holeMaterial = this.materials.blackHole;
        const holeWidth = archWidth * 0.8;
        const holeHeight = archHeight * 0.9; // Slightly smaller than arch opening
        const holeY = 4*scale + holeHeight/2; // Position relative to base

        const frontHole = new THREE.Mesh(new THREE.PlaneGeometry(holeWidth, holeHeight), holeMaterial);
        frontHole.position.set(0, holeY, archOffset - archDepth/2 - 0.01);
        structure.add(frontHole);

        const backHole = new THREE.Mesh(new THREE.PlaneGeometry(holeWidth, holeHeight), holeMaterial);
        backHole.position.set(0, holeY, -archOffset + archDepth/2 + 0.01);
        backHole.rotation.y = Math.PI;
        structure.add(backHole);

        const leftHole = new THREE.Mesh(new THREE.PlaneGeometry(holeWidth, holeHeight), holeMaterial);
        leftHole.position.set(-archOffset + archDepth/2 + 0.01, holeY, 0);
        leftHole.rotation.y = -Math.PI / 2;
        structure.add(leftHole);

        const rightHole = new THREE.Mesh(new THREE.PlaneGeometry(holeWidth, holeHeight), holeMaterial);
        rightHole.position.set(archOffset - archDepth/2 - 0.01, holeY, 0);
        rightHole.rotation.y = Math.PI / 2;
        structure.add(rightHole);


        // Position the entire structure
        structure.position.set(x, 0, z);
        this.structuresGroup.add(structure);
        return structure;
    }

    // --- Helper Functions for Creating Components ---

    // Helper function to create a decorative pillar
    createDecorativePillar(scale = 1) {
        const pillar = new THREE.Group();
        pillar.name = "DecorativePillar";

        const baseHeight = 1 * scale;
        const shaftHeight = 8 * scale;
        const capitalHeight = 1.5 * scale;
        const totalHeight = baseHeight + shaftHeight + capitalHeight;

        // Pillar Base
        const baseGeometry = new THREE.CylinderGeometry(1 * scale, 1.2 * scale, baseHeight, 16);
        const base = new THREE.Mesh(baseGeometry, this.materials.sandstone);
        base.position.y = baseHeight / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        base.userData = { isCollidable: true, type: 'pillar_base' };
        pillar.add(base);

        // Pillar Shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.8 * scale, 0.7 * scale, shaftHeight, 16); // Slightly tapered
        const shaft = new THREE.Mesh(shaftGeometry, this.materials.sandstone);
        shaft.position.y = baseHeight + shaftHeight / 2;
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        shaft.userData = { isCollidable: true, type: 'pillar_shaft' };
        pillar.add(shaft);

        // Pillar Capital (Top)
        const capitalGeometry = new THREE.CylinderGeometry(1.2 * scale, 1 * scale, capitalHeight, 16);
        const capital = new THREE.Mesh(capitalGeometry, this.materials.sandstone);
        capital.position.y = baseHeight + shaftHeight + capitalHeight / 2;
        capital.castShadow = true;
        capital.receiveShadow = true;
        capital.userData = { isCollidable: true, type: 'pillar_capital' };
        pillar.add(capital);

        // Add a small decorative sphere on top
        const detailGeometry = new THREE.SphereGeometry(0.6 * scale, 8, 8);
        const detail = new THREE.Mesh(detailGeometry, this.materials.gold);
        detail.position.y = totalHeight + 0.5 * scale;
        detail.castShadow = true;
        detail.receiveShadow = true;
        pillar.add(detail);

        // The pillar group's origin is at the bottom center.
        // When placing, set the Y position to where the base should sit.
        return pillar;
    }

    // Helper function to create an arch with depth
    createArch(width, height, depth, material) {
        const archShape = new THREE.Shape();
        const x = -width / 2; // Center the shape horizontally
        const y = 0;

        archShape.moveTo(x, y); // Bottom left
        archShape.lineTo(x, y + height * 0.6); // Straight part up left

        // Top arch curve (using quadratic curve for simplicity)
        archShape.quadraticCurveTo(
            0, y + height * 1.1, // Control point (higher than height for pointed arch)
            x + width, y + height * 0.6 // End point (Straight part up right)
        );

        archShape.lineTo(x + width, y); // Bottom right
        archShape.lineTo(x, y); // Close shape

        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.1, // Small bevel for smoother edges
            bevelSize: 0.1,
            bevelSegments: 2
        };

        const geometry = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
        geometry.center(); // Center the geometry for easier positioning

        const arch = new THREE.Mesh(geometry, material);
        arch.castShadow = true;
        arch.receiveShadow = true;
        arch.userData = { isCollidable: true, type: 'structure_arch' };

        // The mesh origin is now at the center of the extruded shape.
        // Adjust position accordingly when adding to the scene.
        return arch;
    }


    // Helper function to create a dome (onion dome style)
    createDome(radius, material) {
        const points = [];
        const segments = 16; // Vertical segments
        const radialSegments = 32; // Radial segments

        // Define the profile curve for an onion dome shape
        points.push(new THREE.Vector2(0.01, 0)); // Bottom center (slightly off to avoid issues)
        points.push(new THREE.Vector2(radius * 0.5, radius * 0.1));
        points.push(new THREE.Vector2(radius * 1.1, radius * 0.5)); // Widest part
        points.push(new THREE.Vector2(radius * 0.9, radius * 1.0));
        points.push(new THREE.Vector2(radius * 0.5, radius * 1.4));
        points.push(new THREE.Vector2(0.01, radius * 1.6)); // Top point

        const geometry = new THREE.LatheGeometry(points, radialSegments);
        const dome = new THREE.Mesh(geometry, material);

        // Add a finial (spike) on top
        const finialHeight = radius * 0.5;
        const finialRadius = radius * 0.05;
        const finialGeometry = new THREE.ConeGeometry(finialRadius, finialHeight, 16);
        const finial = new THREE.Mesh(finialGeometry, this.materials.gold); // Use gold material
        finial.position.y = radius * 1.6 + finialHeight / 2; // Position on top of the dome curve
        dome.add(finial); // Add finial as a child of the dome

        dome.castShadow = true;
        dome.receiveShadow = true;
        dome.userData = { isCollidable: true, type: 'structure_dome' };

        // The dome group's origin is at the base center.
        return dome;
    }


    // Helper function to create a minaret
    createMinaret(radius, height, material) {
        const minaret = new THREE.Group();
        minaret.name = "Minaret";

        const shaftHeight = height * 0.7;
        const galleryHeight = height * 0.1;
        const topHeight = height * 0.2;

        // Minaret Shaft (slightly tapered)
        const shaftGeometry = new THREE.CylinderGeometry(radius * 0.8, radius, shaftHeight, 32);
        const shaft = new THREE.Mesh(shaftGeometry, material);
        shaft.position.y = shaftHeight / 2;
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        shaft.userData = { isCollidable: true, type: 'minaret_shaft' };
        minaret.add(shaft);

        // Balcony/Gallery
        const galleryRadius = radius * 1.3;
        const galleryGeometry = new THREE.CylinderGeometry(galleryRadius, galleryRadius, galleryHeight, 32);
        const gallery = new THREE.Mesh(galleryGeometry, material);
        gallery.position.y = shaftHeight + galleryHeight / 2;
        gallery.castShadow = true;
        gallery.receiveShadow = true;
        gallery.userData = { isCollidable: true, type: 'minaret_gallery' };
        minaret.add(gallery);

        // Top Section (conical or smaller cylinder)
        const topGeometry = new THREE.CylinderGeometry(radius * 0.6, radius * 0.8, topHeight, 32);
        const top = new THREE.Mesh(topGeometry, material);
        top.position.y = shaftHeight + galleryHeight + topHeight / 2;
        top.castShadow = true;
        top.receiveShadow = true;
        top.userData = { isCollidable: true, type: 'minaret_top' };
        minaret.add(top);

        // Small dome/cap on top
        const capRadius = radius * 0.9;
        const capDome = this.createDome(capRadius, material); // Use the dome helper
        capDome.scale.set(0.5, 0.5, 0.5); // Scale down the standard dome
        capDome.position.y = shaftHeight + galleryHeight + topHeight; // Position base of cap dome
        minaret.add(capDome);

        // The minaret group's origin is at the bottom center.
        return minaret;
    }


    // --- NEW METHOD: Create a Sample Layout ---
    /**
     * Creates a sample layout with different types of structures.
     * Adds them to the internal structuresGroup and returns the group.
     * @returns {THREE.Group} A group containing the generated structures.
     */
    createSampleLayout() {
        console.log("Creating sample architectural layout...");
        // Clear previous structures if any (optional, depends on use case)
        // this.reset();

        // Create instances of different structures at various positions
        this.createNagaraTemple(-50, -40, 1.2); // x, z, scale
        this.createDravidianTemple(40, -60, 1.0);
        this.createIndoIslamicStructure(0, 50, 1.5);
        this.createNagaraTemple(60, 20, 0.8);

        console.log(`Layout created with ${this.structuresGroup.children.length} structures.`);
        return this.structuresGroup; // Return the main group containing all structures
    }


    // --- Utility Methods ---

    /**
     * Returns the main group containing all created structures.
     * @returns {THREE.Group} The group of structures.
     */
    getStructuresGroup() {
        return this.structuresGroup;
    }

    /**
    * Gets a specific structure group by its name (if names were assigned during creation).
    * @param {string} name - The name of the structure group to find.
    * @returns {THREE.Object3D | null} The found structure or null.
    */
    getStructureByName(name) {
        return this.structuresGroup.getObjectByName(name);
    }


    // Reset function to clear all created structures from the main group
    reset() {
        console.log("Resetting architectural elements...");
        // Iterate backwards while removing to avoid index issues
        for (let i = this.structuresGroup.children.length - 1; i >= 0; i--) {
            const structure = this.structuresGroup.children[i];

            // Dispose of geometries and materials to free up GPU memory
            structure.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                        // console.log("Disposed geometry");
                    }
                    if (child.material) {
                        // If materials are shared, dispose them carefully, maybe only at the end.
                        // If unique materials per mesh, dispose here.
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat.map) mat.map.dispose();
                                mat.dispose();
                            });
                        } else {
                            if (child.material.map) {
                                child.material.map.dispose(); // Dispose texture if it exists
                                // console.log("Disposed texture");
                            }
                            child.material.dispose();
                            // console.log("Disposed material");
                        }
                    }
                }
            });
            // Remove the structure group from the main structures group
            this.structuresGroup.remove(structure);
        }
         console.log("Architectural elements reset complete.");
        // Note: Textures created in createMaterials are not disposed here,
        // assuming they might be reused. Dispose them separately if needed.
    }
}

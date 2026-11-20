import * as THREE from 'three';

const skies = {
  sandstone: [0x496f85, 0xf6ab69, 0xffe6ae, 0x755762],
  marble: [0x4b4776, 0xf3a884, 0xffd4ac, 0x705470],
  redstone: [0x272439, 0xc86646, 0xffb772, 0x53425b],
};

export function createIndianSkybox() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sun: { value: new THREE.Color() },
      ridge: { value: new THREE.Color() },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 direction;
      uniform vec3 zenith, horizon, sun, ridge;
      void main() {
        vec3 d = normalize(direction);
        vec3 color = mix(horizon, zenith, smoothstep(-.015, .72, d.y));
        float sunDistance = length(d - normalize(vec3(-.43, .26, -.87)));
        color = mix(color, sun, .38 * exp(-sunDistance * 6.) + .60 * (1. - smoothstep(.045, .048, sunDistance)));
        float angle = atan(d.x, d.z);
        float cloud = sin(angle * 7. + d.y * 37.) * .5 + sin(angle * 13. - d.y * 53.) * .29
                    + sin(angle * 29. + d.y * 94.) * .12;
        color = mix(color, sun, smoothstep(.31, .79, cloud) * smoothstep(.08, .28, d.y) * .38);
        float hills = .039 + sin(angle * 6.) * .021 + sin(angle * 13. + 1.) * .016
                    + sin(angle * 37.) * .006;
        color = mix(color, mix(ridge, horizon, .39), 1. - smoothstep(hills - .001, hills + .002, d.y));
        gl_FragColor = vec4(color, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), material);
  mesh.renderOrder = -1;
  updateSkyboxTheme(mesh, 'sandstone');
  return mesh;
}

export function updateSkyboxTheme(sky, theme) {
  const colors = skies[theme];
  Object.values(sky.material.uniforms).forEach((uniform, i) => uniform.value.setHex(colors[i]));
  return colors[1];
}

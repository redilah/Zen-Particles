import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ParticleSystemProps } from '../types';
import { generateGeometry } from '../utils/geometryFactory';

// --- GLSL Shaders ---

const vertexShader = `
uniform float uTime;
uniform float uTension; 
uniform float uExplosion;
uniform float uPixelRatio;
uniform vec3 uMouse;
uniform vec3 uHandPos;
uniform float uHandActive; 

attribute vec3 targetPos;
attribute float pScale;
attribute float trailIdx; 
attribute vec3 randomness;

varying vec3 vColor;
varying float vAlpha;

// Simplex Noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  float timeLag = trailIdx * 0.1;
  float t = uTime - timeLag;
  
  vec3 pos = targetPos;
  
  // --- MOUSE REPULSION ---
  float mouseDist = distance(pos.xy, uMouse.xy);
  float mouseRadius = 2.5; 
  if (mouseDist < mouseRadius) {
      float normDist = mouseDist / mouseRadius;
      float force = pow(1.0 - normDist, 2.0) * 4.0; 
      vec2 dir = normalize(pos.xy - uMouse.xy);
      pos.xy += dir * force;
  }

  // --- HAND REPULSION ---
  if (uHandActive > 0.5) {
      float handDist = distance(pos.xy, uHandPos.xy);
      float handRadius = 3.5;
      if (handDist < handRadius) {
          float normDist = handDist / handRadius;
          float force = pow(1.0 - normDist, 1.5) * 6.0; 
          vec2 dir = normalize(pos.xy - uHandPos.xy);
          pos.xy += dir * force;
      }
  }
  
  float tensionFactor = 1.0 - uTension; 
  // Base expansion (Breathing)
  float expansion = 0.4 + (tensionFactor * 0.65); 
  
  float noise = snoise(vec2(pos.x * 0.5, t * 0.5));
  float chaos = 0.5 + tensionFactor;
  vec3 noiseOffset = randomness * noise * chaos;

  // --- EXPLOSION LOGIC (The "Out of Laptop" Effect) ---
  vec3 explosionDir = normalize(pos + randomness); // Direction based on position + random jitter
  
  // Bias Z towards positive (Screen/User)
  // This makes particles fly "out" of the screen
  explosionDir.z += 0.8; 
  explosionDir = normalize(explosionDir);

  // Huge multiplier for the scatter distance
  float explodeDist = uExplosion * 30.0; 
  
  // Add randomness to distance so they don't form a shell
  explodeDist *= (0.5 + abs(randomness.x));

  vec3 finalPos = (pos + noiseOffset) * expansion;
  
  // Apply trail offset
  if (trailIdx > 0.0) {
     finalPos += -normalize(pos) * (trailIdx * 0.05 * expansion);
  }

  // Apply Explosion
  finalPos += explosionDir * explodeDist;

  if (tensionFactor > 0.8) {
     finalPos.y -= 0.5 * tensionFactor * sin(uTime * 0.5);
  }

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Reduced size multiplier from 70.0 to 45.0 for sharper definition
  gl_PointSize = (pScale * 45.0 * uPixelRatio) * (1.0 / -mvPosition.z);
  
  vAlpha = 1.0 - (trailIdx / 5.0);
  
  // Fade out during explosion
  vAlpha *= (1.0 - uExplosion * 0.5);
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord.xy - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  // Sharper falloff: Changed power from 1.5 to 2.5
  // This reduces the fuzzy "halo" around particles
  float glow = 1.0 - (r * 2.0);
  glow = pow(glow, 2.5);

  // Reduced white mix: Changed mix factor from 0.5 to 0.2
  // Particles now retain more of their original color instead of turning white
  vec3 finalColor = mix(uColor, vec3(1.0), glow * 0.2);
  
  // Slightly reduced overall alpha to prevent blown-out brightness
  gl_FragColor = vec4(finalColor, vAlpha * glow * 0.85);
}
`;

const ParticleSystem: React.FC<ParticleSystemProps> = ({ 
  shape, 
  color, 
  handRef,
  triggerExplosion 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const frameIdRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
  
  // Smoothing vars for Hand
  const currentHandPosRef = useRef<{x: number, y: number}>({ x: 0.5, y: 0.5 });

  const particlesBaseCount = 4000;
  const trailLength = 5;
  const totalParticles = particlesBaseCount * trailLength;

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const targetPos = new Float32Array(totalParticles * 3);
    const pScale = new Float32Array(totalParticles);
    const trailIdx = new Float32Array(totalParticles);
    const randomness = new Float32Array(totalParticles * 3);

    for (let i = 0; i < totalParticles; i++) {
        pScale[i] = 0.5 + Math.random();
        trailIdx[i] = i % trailLength;
        randomness[i * 3] = (Math.random() - 0.5);
        randomness[i * 3 + 1] = (Math.random() - 0.5);
        randomness[i * 3 + 2] = (Math.random() - 0.5);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(targetPos, 3));
    geometry.setAttribute('pScale', new THREE.BufferAttribute(pScale, 1));
    geometry.setAttribute('trailIdx', new THREE.BufferAttribute(trailIdx, 1));
    geometry.setAttribute('randomness', new THREE.BufferAttribute(randomness, 3));
    geometryRef.current = geometry;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uTension: { value: 0 },
        uExplosion: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uMouse: { value: new THREE.Vector3(999, 999, 0) },
        uHandPos: { value: new THREE.Vector3(999, 999, 0) },
        uHandActive: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    updateGeometryShape(shape);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        if(materialRef.current) {
            materialRef.current.uniforms.uPixelRatio.value = rendererRef.current.getPixelRatio();
        }
      }
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Animation Loop ---
    const animate = () => {
      timeRef.current += 0.01;
      
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = timeRef.current;
        
        // Decay explosion
        if (materialRef.current.uniforms.uExplosion.value > 0.01) {
             // Slower decay for more dramatic effect
             materialRef.current.uniforms.uExplosion.value *= 0.95; 
        } else {
             materialRef.current.uniforms.uExplosion.value = 0;
        }

        // Direct Ref Reading for Performance
        const { x: targetX, y: targetY, tension, isPresent } = handRef.current;

        // Smooth Tension Update
        const currentTension = materialRef.current.uniforms.uTension.value;
        materialRef.current.uniforms.uTension.value += (tension - currentTension) * 0.1;

        // Update Mouse
        if (cameraRef.current) {
            const mouseVec = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0.5);
            mouseVec.unproject(cameraRef.current);
            const mouseDir = mouseVec.sub(cameraRef.current.position).normalize();
            const mouseDist = -cameraRef.current.position.z / mouseDir.z;
            const mouseWorldPos = cameraRef.current.position.clone().add(mouseDir.multiplyScalar(mouseDist));
            materialRef.current.uniforms.uMouse.value.set(mouseWorldPos.x, mouseWorldPos.y, mouseWorldPos.z);
        }
        
        // Update Hand (With Smoothing and direct Ref access)
        if (cameraRef.current && isPresent) {
             materialRef.current.uniforms.uHandActive.value = 1.0;
             
             // Smooth lerp towards target from handRef
             currentHandPosRef.current.x += (targetX - currentHandPosRef.current.x) * 0.25;
             currentHandPosRef.current.y += (targetY - currentHandPosRef.current.y) * 0.25;

             // Convert 0-1 to NDC
             const ndcX = (currentHandPosRef.current.x * 2) - 1;
             const ndcY = -(currentHandPosRef.current.y * 2) + 1;

             const handVec = new THREE.Vector3(ndcX, ndcY, 0.5);
             handVec.unproject(cameraRef.current);
             const handDir = handVec.sub(cameraRef.current.position).normalize();
             const handDist = -cameraRef.current.position.z / handDir.z;
             const handWorldPos = cameraRef.current.position.clone().add(handDir.multiplyScalar(handDist));
             
             materialRef.current.uniforms.uHandPos.value.set(handWorldPos.x, handWorldPos.y, handWorldPos.z);
        } else {
             materialRef.current.uniforms.uHandActive.value = 0.0;
             if (!isPresent) {
                 currentHandPosRef.current.x = targetX;
                 currentHandPosRef.current.y = targetY;
             }
        }
      }

      if(cameraRef.current) {
          const targetCamX = (mouseRef.current.x * 2) + Math.sin(timeRef.current * 0.2) * 0.5;
          const targetCamY = (mouseRef.current.y * 2) + Math.cos(timeRef.current * 0.3) * 0.5;
          cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.05;
          cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.05;
          cameraRef.current.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameIdRef.current);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateGeometryShape(shape);
  }, [shape]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.set(color);
    }
  }, [color]);

  useEffect(() => {
      if (triggerExplosion && materialRef.current) {
          materialRef.current.uniforms.uExplosion.value = 1.0;
      }
  }, [triggerExplosion]);

  const updateGeometryShape = (type: any) => {
      if (!geometryRef.current) return;
      const basePositions = generateGeometry(type, particlesBaseCount);
      const targetAttr = geometryRef.current.attributes.targetPos as THREE.BufferAttribute;
      const array = targetAttr.array as Float32Array;
      
      for (let i = 0; i < particlesBaseCount; i++) {
          const bx = basePositions[i * 3];
          const by = basePositions[i * 3 + 1];
          const bz = basePositions[i * 3 + 2];
          for (let j = 0; j < trailLength; j++) {
              const idx = (i * trailLength) + j;
              array[idx * 3] = bx;
              array[idx * 3 + 1] = by;
              array[idx * 3 + 2] = bz;
          }
      }
      targetAttr.needsUpdate = true;
  };

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none" />;
};

export default ParticleSystem;
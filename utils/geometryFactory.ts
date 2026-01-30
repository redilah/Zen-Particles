import { ShapeType } from '../types';

export const generateGeometry = (type: ShapeType, count: number): Float32Array => {
  const positions = new Float32Array(count * 3);

  const setPos = (i: number, x: number, y: number, z: number) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  };

  switch (type) {
    case ShapeType.HEART:
      for (let i = 0; i < count; i++) {
        // Parametric Heart
        const t = Math.random() * Math.PI * 2;
        
        // Base 2D heart shape logic
        const xBase = 16 * Math.pow(Math.sin(t), 3);
        const yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        // Add depth
        const scale = 0.15;
        const depth = (Math.random() - 0.5) * 10;
        
        // Blend to create volume
        setPos(i, xBase * scale, yBase * scale, depth * scale);
      }
      break;

    case ShapeType.PLANE:
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        
        // 50% Fuselage, 30% Wings, 20% Tail/Engine
        if (r < 0.5) {
          // Fuselage (Long cylinder along Z axis)
          const len = (Math.random() - 0.5) * 5.0; // Length
          const radius = 0.5 * (1.0 - Math.abs(len) / 5.0) + 0.1; // Taper towards ends
          const angle = Math.random() * Math.PI * 2;
          
          setPos(
            i, 
            radius * Math.cos(angle), 
            radius * Math.sin(angle), 
            len
          );
        } else if (r < 0.8) {
          // Main Wings
          const span = (Math.random() - 0.5) * 6.0; // Wing span
          const depth = Math.random() * 1.5;
          
          // Triangular / Swept back wing shape
          // As we go further out (abs(span)), the wing moves back (z increases)
          const zOffset = Math.abs(span) * 0.5 - 0.5;
          const yThickness = (Math.random() - 0.5) * 0.2;
          
          setPos(i, span, yThickness, zOffset + (Math.random() * 0.5));
        } else {
          // Tail Section
          const isVertical = Math.random() > 0.5;
          const tailZ = 2.0 + Math.random() * 1.0; // Back of the plane
          
          if (isVertical) {
             // Vertical Stabilizer
             const h = Math.random() * 1.5;
             const w = (Math.random() - 0.5) * 0.2;
             setPos(i, w, h, tailZ + h * 0.5);
          } else {
             // Horizontal Stabilizer
             const w = (Math.random() - 0.5) * 2.5;
             const h = (Math.random() - 0.5) * 0.1;
             setPos(i, w, h, tailZ + Math.abs(w) * 0.5);
          }
        }
      }
      break;

    case ShapeType.SATURN:
      for (let i = 0; i < count; i++) {
        const ratio = i / count;
        // 40% Planet, 60% Rings
        if (ratio < 0.4) {
          // Central Sphere
          const r = 1.5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta);
          const z = r * Math.cos(phi);
          setPos(i, x, y, z);
        } else {
          // Ring Disk
          const angle = Math.random() * Math.PI * 2;
          const minR = 2.0;
          const maxR = 4.5;
          const r = Math.sqrt(Math.random() * (maxR * maxR - minR * minR) + minR * minR);
          const x = r * Math.cos(angle);
          const z = r * Math.sin(angle);
          const y = (Math.random() - 0.5) * 0.1; // Thin disk
          
          // Tilt the ring
          const tilt = Math.PI / 6; // 30 degrees
          const yTilt = y * Math.cos(tilt) - z * Math.sin(tilt);
          const zTilt = y * Math.sin(tilt) + z * Math.cos(tilt);
          
          setPos(i, x, yTilt, zTilt);
        }
      }
      break;

    case ShapeType.BUDDHA:
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        // Abstract representation: Head, Body, Base
        if (r < 0.2) {
          // Head (Sphere at top)
          const rad = 0.8;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          setPos(
            i, 
            rad * Math.sin(phi) * Math.cos(theta), 
            rad * Math.sin(phi) * Math.sin(theta) + 1.8, 
            rad * Math.cos(phi)
          );
        } else if (r < 0.7) {
          // Body (Ellipsoid)
          const radX = 1.5;
          const radY = 1.6;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          setPos(
            i, 
            radX * Math.sin(phi) * Math.cos(theta), 
            radY * Math.sin(phi) * Math.sin(theta) - 0.2, 
            radX * Math.cos(phi)
          );
        } else {
          // Base (Torus-like or wide flattened sphere)
          const angle = Math.random() * Math.PI * 2;
          const dist = 1.0 + Math.random() * 1.5;
          setPos(
            i,
            dist * Math.cos(angle),
            -1.8 + (Math.random() - 0.5) * 0.5,
            dist * Math.sin(angle)
          );
        }
      }
      break;

    case ShapeType.FIREWORKS:
      for (let i = 0; i < count; i++) {
        // Explosion volume - concentrated center, sparse outliers
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        // Exponential distribution for burst look
        const r = Math.pow(Math.random(), 2) * 4.5; 
        
        setPos(
          i,
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }
      break;

    case ShapeType.SPHERE:
    default:
      for (let i = 0; i < count; i++) {
        const r = 2.5; // Radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        setPos(
          i,
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }
      break;
  }

  return positions;
};
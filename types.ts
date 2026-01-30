import React from 'react';

export enum ShapeType {
  SPHERE = 'Sphere',
  HEART = 'Heart',
  PLANE = 'Plane',
  SATURN = 'Saturn',
  BUDDHA = 'Buddha',
  FIREWORKS = 'Fireworks',
}

export interface ParticleSettings {
  shape: ShapeType;
  color: string;
  particleCount: number;
}

export interface HandData {
  tension: number; // 0.0 (Open) to 1.0 (Fist)
  isPresent: boolean;
  position: { x: number, y: number }; // Center of palm (for particles)
  cursor: { x: number, y: number }; // Index finger tip (for writing)
  isPinching: boolean; // True if thumb and index are touching
}

// New interface for direct mutable communication
export interface SharedHandState {
  x: number;
  y: number;
  cursorX: number;
  cursorY: number;
  tension: number;
  isPresent: boolean;
  isPinching: boolean;
}

export interface ParticleSystemProps {
  shape: ShapeType;
  color: string;
  handRef: React.MutableRefObject<SharedHandState>; // Changed from direct props to Ref
  triggerExplosion: boolean;
}
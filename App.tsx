import React, { useState, useRef, useCallback } from 'react';
import ParticleSystem from './components/ParticleSystem';
import HandTracker from './components/HandTracker';
import Controls from './components/Controls';
import DrawingBoard from './components/DrawingBoard';
import { ShapeType, HandData, SharedHandState } from './types';

function App() {
  const [shape, setShape] = useState<ShapeType>(ShapeType.SPHERE);
  const [color, setColor] = useState<string>('#00FFFF');
  // UI State (Throttled updates)
  const [uiTension, setUiTension] = useState<number>(0);
  const [uiHandPresent, setUiHandPresent] = useState<boolean>(false);
  const [explosion, setExplosion] = useState<boolean>(false);
  
  // Drawing State
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);
  const [clearDrawTrigger, setClearDrawTrigger] = useState<number>(0);

  // High-performance mutable ref for animation loop
  const handRef = useRef<SharedHandState>({
    x: 0.5,
    y: 0.5,
    cursorX: 0.5,
    cursorY: 0.5,
    tension: 0,
    isPresent: false,
    isPinching: false
  });

  const handleHandUpdate = useCallback((data: HandData) => {
    // 1. Direct update to Ref for ParticleSystem (Zero latency)
    handRef.current.x = data.position.x;
    handRef.current.y = data.position.y;
    handRef.current.cursorX = data.cursor.x;
    handRef.current.cursorY = data.cursor.y;
    handRef.current.tension = data.tension;
    handRef.current.isPresent = data.isPresent;
    handRef.current.isPinching = data.isPinching;

    // 2. Throttled update for UI components (Controls & Header)
    setUiHandPresent(prev => prev !== data.isPresent ? data.isPresent : prev);
    
    if (Math.abs(data.tension - handRef.current.tension) > 0.01) {
       setUiTension(data.tension);
    } else {
      setUiTension(data.tension);
    }
  }, []);

  const handleTrigger = useCallback(() => {
    // Trigger explosion/scatter effect
    setExplosion(true);
    // Reset after animation duration
    setTimeout(() => setExplosion(false), 500);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden text-white select-none">
      
      {/* Header */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
          ZEN PARTICLES
        </h1>
        <p className="text-sm text-white/60 mt-1 tracking-wide">
          {uiHandPresent 
            ? (isDrawMode ? "Pinch thumb & index to WRITE." : "Fist to gather, Release to scatter.")
            : "Initializing vision... Raise your hand."}
        </p>
        {!uiHandPresent && (
             <p className="text-xs text-blue-400 mt-2 animate-pulse">Waiting for hand tracking...</p>
        )}
      </div>

      {/* 3D Scene - Passes Ref directly */}
      <ParticleSystem 
        shape={shape} 
        color={color} 
        handRef={handRef}
        triggerExplosion={explosion}
      />
      
      {/* 2D Drawing Overlay */}
      <DrawingBoard 
        handRef={handRef}
        color={color}
        isActive={isDrawMode}
        clearTrigger={clearDrawTrigger}
      />

      {/* Vision */}
      <HandTracker 
        onHandUpdate={handleHandUpdate} 
        onClap={handleTrigger} 
        onRelease={handleTrigger} 
      />

      {/* UI Controls */}
      <Controls 
        currentShape={shape}
        currentColor={color}
        tension={uiTension}
        isDrawMode={isDrawMode}
        onShapeChange={setShape}
        onColorChange={setColor}
        onToggleDraw={() => setIsDrawMode(!isDrawMode)}
        onClearDraw={() => setClearDrawTrigger(prev => prev + 1)}
      />
    </div>
  );
}

export default App;
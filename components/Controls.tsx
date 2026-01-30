import React from 'react';
import { ShapeType } from '../types';
import { Heart, Plane, Globe, User, Rocket, Circle, PenTool, Eraser } from 'lucide-react';

interface ControlsProps {
  currentShape: ShapeType;
  currentColor: string;
  tension: number;
  isDrawMode: boolean;
  onShapeChange: (s: ShapeType) => void;
  onColorChange: (c: string) => void;
  onToggleDraw: () => void;
  onClearDraw: () => void;
}

const SHAPES = [
  { type: ShapeType.SPHERE, icon: Circle, label: 'Sphere' },
  { type: ShapeType.HEART, icon: Heart, label: 'Heart' },
  { type: ShapeType.PLANE, icon: Plane, label: 'Plane' },
  { type: ShapeType.SATURN, icon: Globe, label: 'Saturn' },
  { type: ShapeType.BUDDHA, icon: User, label: 'Buddha' },
  { type: ShapeType.FIREWORKS, icon: Rocket, label: 'Burst' },
];

const COLORS = [
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FFD700', // Gold
  '#32CD32', // Lime
  '#FFFFFF', // White
  '#FF4500', // OrangeRed
];

const Controls: React.FC<ControlsProps> = ({ 
  currentShape, 
  currentColor, 
  tension, 
  isDrawMode,
  onShapeChange, 
  onColorChange,
  onToggleDraw,
  onClearDraw
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 shadow-2xl flex flex-col gap-4 text-white z-50">
      
      {/* Status Bar: Tension */}
      <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-white/70">
        <span>Relaxed</span>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden relative">
           <div 
             className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-100 ease-out"
             style={{ width: `${tension * 100}%` }}
           />
        </div>
        <span>Tense</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Draw Mode Controls (New) */}
        <div className="flex gap-2">
             <button
                onClick={onToggleDraw}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-[70px]
                  ${isDrawMode ? 'bg-blue-500/40 border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/5 hover:bg-white/10'}
                `}
              >
                <PenTool size={24} className={`mb-1 ${isDrawMode ? 'text-blue-200' : 'text-white/60'}`} />
                <span className="text-[10px] font-medium opacity-80">{isDrawMode ? 'Drawing' : 'Draw'}</span>
              </button>
              
               <button
                onClick={onClearDraw}
                disabled={!isDrawMode}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-[70px]
                  ${!isDrawMode ? 'opacity-30 cursor-not-allowed' : 'bg-white/5 hover:bg-red-500/20'}
                `}
              >
                <Eraser size={24} className="mb-1 text-white/60" />
                <span className="text-[10px] font-medium opacity-80">Clear</span>
              </button>
        </div>

        <div className="hidden md:block w-px h-12 bg-white/10" />

        {/* Shape Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
          {SHAPES.map((item) => {
            const Icon = item.icon;
            const isActive = currentShape === item.type;
            return (
              <button
                key={item.type}
                onClick={() => onShapeChange(item.type)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-[70px]
                  ${isActive ? 'bg-white/20 scale-105 shadow-glow' : 'hover:bg-white/5'}
                `}
              >
                <Icon size={24} className={`mb-1 ${isActive ? 'text-white' : 'text-white/60'}`} />
                <span className="text-[10px] font-medium opacity-80">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block w-px h-12 bg-white/10" />

        {/* Color Picker */}
        <div className="flex gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`
                w-8 h-8 rounded-full border-2 transition-all duration-300
                ${currentColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}
              `}
              style={{ backgroundColor: c, boxShadow: currentColor === c ? `0 0 15px ${c}` : 'none' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Controls;
import React, { useRef, useEffect } from 'react';
import { SharedHandState } from '../types';

interface DrawingBoardProps {
  handRef: React.MutableRefObject<SharedHandState>;
  color: string;
  isActive: boolean;
  clearTrigger: number; // Increment to clear
}

const DrawingBoard: React.FC<DrawingBoardProps> = ({ handRef, color, isActive, clearTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastPosRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Clear on init
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    const handleResize = () => {
      if (canvasRef.current) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasRef.current.width;
        tempCanvas.height = canvasRef.current.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(canvasRef.current, 0, 0);

        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
           ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Clear
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [clearTrigger]);

  useEffect(() => {
    const animate = () => {
      if (!isActive || !canvasRef.current) {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      const { cursorX, cursorY, isPinching, isPresent } = handRef.current;
      const ctx = canvasRef.current.getContext('2d');

      if (ctx && isPresent) {
        const currentX = cursorX * window.innerWidth;
        const currentY = cursorY * window.innerHeight;

        if (isPinching) {
          if (lastPosRef.current) {
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            
            // Interpolate a bit for smoother curves if needed, but direct line is usually fine at 60fps
            ctx.lineTo(currentX, currentY);
            
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.stroke();
          }
          lastPosRef.current = { x: currentX, y: currentY };
        } else {
          lastPosRef.current = null;
        }
      } else {
        lastPosRef.current = null;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, color, handRef]);

  return (
    <canvas 
      ref={canvasRef}
      className={`fixed inset-0 z-20 pointer-events-none transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default DrawingBoard;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { CameraOff, RefreshCw, Power } from 'lucide-react';
import { HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  onClap: () => void;
  onRelease: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, onClap, onRelease }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastTensionRef = useRef<number>(0);
  const releaseCooldownRef = useRef<number>(0);

  const calculateTension = (landmarks: any[]) => {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    
    const palmSize = Math.sqrt(
      Math.pow(wrist.x - middleMcp.x, 2) + 
      Math.pow(wrist.y - middleMcp.y, 2)
    );

    const tips = [4, 8, 12, 16, 20];
    let totalDist = 0;

    tips.forEach(tipIdx => {
      const tip = landmarks[tipIdx];
      const dist = Math.sqrt(
        Math.pow(wrist.x - tip.x, 2) + 
        Math.pow(wrist.y - tip.y, 2)
      );
      totalDist += dist;
    });

    const avgDist = totalDist / 5;
    const ratio = avgDist / (palmSize || 0.001);
    
    let tension = 1.0 - (ratio - 1.0) / 1.2;
    tension = Math.max(0, Math.min(1, tension));
    
    return tension;
  };

  const predictWebcam = useCallback(() => {
    if (!isCameraOn || !handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const startTimeMs = performance.now();
      const result = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      let tension = 0;
      let isPresent = false;
      let position = { x: 0.5, y: 0.5 };
      let cursor = { x: 0.5, y: 0.5 };
      let isPinching = false;

      if (result.landmarks && result.landmarks.length > 0) {
        isPresent = true;
        const landmarks = result.landmarks[0];
        tension = calculateTension(landmarks);

        // Center of palm (Middle Finger MCP) - used for Particles
        position = {
            x: 1.0 - landmarks[9].x,
            y: landmarks[9].y
        };

        // Index Finger Tip (8) - used for Writing
        cursor = {
            x: 1.0 - landmarks[8].x,
            y: landmarks[8].y
        };

        // Pinch Detection (Thumb Tip 4 vs Index Tip 8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        
        // Threshold for pinch (relative to coordinate space 0-1)
        isPinching = pinchDist < 0.05;

        // Visual Feedback for Pinch/Writing Point
        if (ctx) {
            // Draw skeleton
            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
              color: 'rgba(0, 255, 0, 0.3)',
              lineWidth: 1
            });
            
            // Draw Index Tip Highlight
            ctx.beginPath();
            ctx.arc((1.0 - cursor.x) * canvas.width, cursor.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = isPinching ? '#00FFFF' : '#FFFFFF';
            ctx.fill();
            
            if (isPinching) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        const now = performance.now();

        if (now - releaseCooldownRef.current > 800) {
            if (lastTensionRef.current > 0.8 && tension < 0.4) {
                onRelease();
                releaseCooldownRef.current = now;
            }
        }

        lastTensionRef.current = tension;
      }

      onHandUpdate({ tension, isPresent, position, cursor, isPinching });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isCameraOn, onHandUpdate, onRelease]);

  const stopCamera = () => {
      if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
      }
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
      }
      setIsCameraOn(false);
      onHandUpdate({ 
          tension: 0, 
          isPresent: false, 
          position: {x: 0.5, y: 0.5},
          cursor: {x: 0.5, y: 0.5},
          isPinching: false
      });
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsCameraOn(true);

      // Initialize Landmarker if not ready
      if (!handLandmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
          );
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
          });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      }
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setError("Camera error.");
      setLoading(false);
      setIsCameraOn(false);
    }
  };

  const toggleCamera = () => {
      if (isCameraOn) {
          stopCamera();
      } else {
          startCamera();
      }
  };

  useEffect(() => {
    // Initial start
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed top-4 right-4 w-48 h-36 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-xl z-50 transition-opacity hover:opacity-100 opacity-80 group">
      {/* Off State UI */}
      {!isCameraOn && !loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
           <CameraOff className="w-8 h-8 mb-2" />
           <span className="text-xs">Camera Paused</span>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-black/80 z-20">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 p-2 text-center z-20">
          <CameraOff className="w-6 h-6 text-red-400 mb-2" />
          <span className="text-xs text-red-200">{error}</span>
          <button 
            onClick={() => startCamera()}
            className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-xs text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
           <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${isCameraOn ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${isCameraOn ? 'opacity-100' : 'opacity-0'}`}
          />
          
          {/* Active Indicator */}
          {isCameraOn && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-white/70 uppercase tracking-wider font-mono">Vision Active</span>
            </div>
          )}

          {/* Toggle Button */}
          <button 
            onClick={toggleCamera}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-white/20 text-white transition-all backdrop-blur-sm z-30"
            title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
          >
             {isCameraOn ? <Power size={14} className="text-green-400" /> : <Power size={14} className="text-red-400" />}
          </button>
        </>
      )}
    </div>
  );
};

export default HandTracker;
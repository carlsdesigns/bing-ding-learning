'use client';

import { useRef, useCallback } from 'react';
import { usePlaygroundStore, type Stroke } from '@/stores/playground-store';

interface DrawingLayerProps {
  layer: 'highlighter' | 'pen';
  isInputLayer?: boolean; // If true, this layer captures input but doesn't render strokes
}

function getPathFromPoints(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  if (points.length === 2) {
    path += ` L ${points[1].x} ${points[1].y}`;
    return path;
  }
  
  // Use quadratic Bézier curves for smooth lines
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  
  // Connect to the last point
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  
  return path;
}

function StrokePath({ stroke }: { stroke: Stroke }) {
  const path = getPathFromPoints(stroke.points);
  
  if (!path) return null;
  
  const isHighlighter = stroke.tool === 'highlighter';
  
  return (
    <path
      d={path}
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={isHighlighter ? 0.4 : 1}
      style={{
        mixBlendMode: isHighlighter ? 'multiply' : 'normal',
      }}
    />
  );
}

export function DrawingLayer({ layer, isInputLayer = false }: DrawingLayerProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const {
    canvasSize,
    activeTool,
    penStrokes,
    highlighterStrokes,
    currentStroke,
    startStroke,
    addPointToStroke,
    endStroke,
  } = usePlaygroundStore();

  const strokes = layer === 'pen' ? penStrokes : highlighterStrokes;
  const showCurrentStroke = currentStroke && currentStroke.tool === layer;

  const getPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const svg = canvasRef.current;
    if (!svg) return null;
    
    const rect = svg.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (activeTool === 'none') return;
    // Input layer handles all tools, render layers only handle their own tool
    if (!isInputLayer) {
      if (layer === 'pen' && activeTool !== 'pen') return;
      if (layer === 'highlighter' && activeTool !== 'highlighter') return;
    }
    
    const point = getPoint(e);
    if (point) {
      startStroke(point);
    }
  }, [activeTool, layer, isInputLayer, getPoint, startStroke]);

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!currentStroke) return;
    // Input layer handles all tools
    if (!isInputLayer) {
      if (layer === 'pen' && currentStroke.tool !== 'pen') return;
      if (layer === 'highlighter' && currentStroke.tool !== 'highlighter') return;
    }
    
    const point = getPoint(e);
    if (point) {
      addPointToStroke(point);
    }
  }, [currentStroke, layer, isInputLayer, getPoint, addPointToStroke]);

  const handlePointerUp = useCallback(() => {
    if (currentStroke) {
      endStroke();
    }
  }, [currentStroke, endStroke]);

  // Input layer handles all drawing input
  const shouldHandleInput = isInputLayer && activeTool !== 'none';

  // Input layer is invisible but captures events
  if (isInputLayer) {
    return (
      <svg
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        preserveAspectRatio="none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Input layer also renders current stroke for immediate feedback */}
        {currentStroke && <StrokePath stroke={currentStroke} />}
      </svg>
    );
  }

  // Render layer - just displays strokes, no interaction
  return (
    <svg
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: 'none',
      }}
      viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
      preserveAspectRatio="none"
    >
      {strokes.map((stroke) => (
        <StrokePath key={stroke.id} stroke={stroke} />
      ))}
    </svg>
  );
}

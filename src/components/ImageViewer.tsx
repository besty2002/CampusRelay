import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer = ({ images, initialIndex = 0, isOpen, onClose }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetTransform();
    }
  }, [currentIndex, images.length, resetTransform]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetTransform();
    }
  }, [currentIndex, resetTransform]);

  const handleZoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.5, 5)), []);
  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrev, goToNext, handleZoomIn, handleZoomOut]);

  // Double-tap to zoom
  const lastTapTime = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double-tap
      if (scale > 1) {
        resetTransform();
      } else {
        setScale(2.5);
      }
    }
    lastTapTime.current = now;
  };

  // Touch handlers for pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      positionStart.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance.current > 0) {
        const delta = dist / lastTouchDistance.current;
        setScale(prev => Math.min(Math.max(prev * delta, 1), 5));
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = 0;
    if (scale <= 1) resetTransform();
  };

  // Mouse drag for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      positionStart.current = { ...position };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => {
      const newScale = Math.min(Math.max(prev + delta, 1), 5);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <span className="text-white/80 text-sm font-bold">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30"
          >
            <ZoomIn size={16} />
          </button>
          {scale > 1 && (
            <button
              onClick={resetTransform}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors animate-in fade-in duration-150"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleTap}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-contain transition-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transitionDuration: isDragging ? '0ms' : '200ms',
          }}
          draggable={false}
        />
      </div>

      {/* Navigation Arrows (desktop) */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all backdrop-blur-sm hidden sm:flex"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all backdrop-blur-sm hidden sm:flex"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 py-4 shrink-0">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); resetTransform(); }}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Zoom level indicator */}
      {scale > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm animate-in fade-in duration-200">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};

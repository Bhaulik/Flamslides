import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '@/types/slide';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Presentation, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';

const PresentationMode = () => {
  const { presentationId } = useParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);

  // Auto-enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (presentationRef.current && !document.fullscreenElement) {
          await presentationRef.current.requestFullscreen();
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    };
    enterFullscreen();
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    try {
      if (presentationId) {
        const decodedData = JSON.parse(atob(presentationId));
        setSlides(decodedData.slides);
      }
    } catch (error) {
      console.error('Failed to decode presentation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [presentationId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Space':
          if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
          }
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
          }
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'h':
        case 'H':
          setIsControlsVisible(prev => !prev);
          break;
        case 'Escape':
          // Prevent default Escape behavior only when hiding controls
          if (isControlsVisible) {
            e.preventDefault();
            setIsControlsVisible(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, slides.length, isControlsVisible]);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen && presentationRef.current) {
        await presentationRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Presentation Link</h1>
          <p className="text-gray-600">This presentation link appears to be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={presentationRef}
      className={cn(
        "min-h-screen bg-black relative overflow-hidden",
        isFullscreen && "h-screen w-screen"
      )}
    >
      {/* Current Slide */}
      <div className="h-full flex items-center justify-center p-4">
        <div className={cn(
          "w-full aspect-[16/9] bg-white relative rounded-lg overflow-hidden",
          isFullscreen ? "max-h-screen" : "max-w-7xl"
        )}>
          {slides[currentIndex].imageUrl && (
            <div className="absolute inset-0">
              <img
                src={slides[currentIndex].imageUrl}
                alt=""
                className="w-full h-full object-cover opacity-10"
              />
            </div>
          )}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-16 text-center">
            <h2 className={cn(
              "font-bold mb-8 tracking-tight",
              isFullscreen ? "text-7xl" : "text-6xl"
            )}>
              {slides[currentIndex].title}
            </h2>
            <p className={cn(
              "text-gray-700 leading-relaxed max-w-4xl",
              isFullscreen ? "text-3xl" : "text-2xl"
            )}>
              {slides[currentIndex].body}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 p-4 transition-opacity duration-300",
          !isControlsVisible && "opacity-0 pointer-events-none"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-black/50 text-white rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="text-sm">
              Slide {currentIndex + 1} of {slides.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentIndex === slides.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Enter Fullscreen
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setIsControlsVisible(prev => !prev)}
            >
              {isControlsVisible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Controls
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Controls
                </>
              )}
            </Button>
            <div className="text-sm text-white/60 hidden lg:block">
              Press <kbd className="px-2 py-1 bg-white/20 rounded">→</kbd> or <kbd className="px-2 py-1 bg-white/20 rounded">Space</kbd> for next slide
            </div>
          </div>
        </div>
      </div>

      {/* Presenter Notes (if available) */}
      {slides[currentIndex].notes && (
        <div className={cn(
          "fixed left-4 right-4 bg-black/50 text-white p-4 rounded-lg max-w-2xl mx-auto backdrop-blur-sm transition-opacity duration-300",
          isFullscreen ? "bottom-28" : "bottom-20",
          !isControlsVisible && "opacity-0"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Presentation className="h-4 w-4" />
            <span className="font-medium">Presenter Notes</span>
          </div>
          <p className="text-sm">{slides[currentIndex].notes}</p>
        </div>
      )}
    </div>
  );
};

export default PresentationMode; 
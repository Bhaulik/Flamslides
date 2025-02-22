import { useState, useEffect, useRef } from "react";
import { Slide } from "@/types/slide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2, Minimize2 } from "lucide-react";

interface SlideshowProps {
  slides: Slide[];
  autoPlayInterval?: number | null;
  className?: string;
  currentSlide?: number;
  onSlideChange?: (index: number) => void;
}

export const Slideshow = ({
  slides,
  autoPlayInterval = null,
  className,
  currentSlide,
  onSlideChange,
}: SlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(currentSlide || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const slideshowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === slideshowRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (currentSlide !== undefined && currentSlide !== currentIndex) {
      setCurrentIndex(currentSlide);
    }
  }, [currentSlide]);

  useEffect(() => {
    if (!isPlaying || !autoPlayInterval) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      setCurrentIndex(nextIndex);
      onSlideChange?.(nextIndex);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isPlaying, slides.length, autoPlayInterval, currentIndex, onSlideChange]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    onSlideChange?.(index);
  };

  const previousSlide = () => {
    setCurrentIndex((current) => 
      current === 0 ? slides.length - 1 : current - 1
    );
    onSlideChange?.((currentIndex - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((current) => 
      (current + 1) % slides.length
    );
    onSlideChange?.((currentIndex + 1) % slides.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await slideshowRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  return (
    <div 
      ref={slideshowRef}
      className={cn(
        "relative w-full max-w-4xl mx-auto aspect-[16/9] bg-white rounded-lg shadow-lg overflow-hidden",
        isFullscreen && "max-w-none rounded-none h-screen",
        className
      )}
    >
      <div className="absolute inset-0 p-8 flex flex-col justify-center">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 p-8 flex flex-col justify-center transition-opacity duration-500",
              currentIndex === index ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {slide.imageUrl && (
              <div className="absolute inset-0 z-0">
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-10"
                />
              </div>
            )}
            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-4 tracking-tight">{slide.title}</h2>
              <p className="text-lg text-gray-700 leading-relaxed">{slide.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-black/10"
          onClick={previousSlide}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentIndex === index
                  ? "bg-gray-800 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-black/10"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <div className="absolute right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-black/10"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-black/10"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

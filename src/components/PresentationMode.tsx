import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { Slide } from "@/types/slide";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PresentationModeProps {
  slides: Slide[];
  initialSlide?: number;
}

export const PresentationMode = ({ slides, initialSlide = 0 }: PresentationModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialSlide);
  const [isPlaying, setIsPlaying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const previousSlide = () => {
    setCurrentIndex((current) => 
      current === 0 ? slides.length - 1 : current - 1
    );
  };

  const nextSlide = () => {
    setCurrentIndex((current) => 
      (current + 1) % slides.length
    );
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const exitPresentation = () => {
    navigate('/');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          previousSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case 'Escape':
          exitPresentation();
          break;
        case ' ':
          togglePlayPause();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/10 text-white"
          onClick={exitPresentation}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="h-screen flex items-center justify-center">
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
            <div className="relative z-10 max-w-6xl mx-auto text-center text-white">
              <h2 className="text-7xl font-bold mb-8 tracking-tight">{slide.title}</h2>
              <p className="text-3xl leading-relaxed">{slide.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/10 text-white"
          onClick={previousSlide}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentIndex === index
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              )}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/10 text-white"
          onClick={nextSlide}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/10 text-white absolute right-8"
          onClick={togglePlayPause}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

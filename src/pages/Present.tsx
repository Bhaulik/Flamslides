import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Slide } from '@/types/slide';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import OpenAI from 'openai';
import { 
  ChevronLeft, 
  ChevronRight, 
  Presentation, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  MessageSquare,
  Send,
  Loader2,
  X
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SLIDE_TRANSITION = "transform transition-all duration-500 ease-in-out";
const CONTROL_TRANSITION = "transition-all duration-300 ease-in-out";
const BLUR_BACKDROP = "backdrop-blur-md bg-black/40";

const PresentationMode = () => {
  const { presentationId } = useParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const presentationRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    const loadPresentation = async () => {
      try {
        if (presentationId) {
          // Try to get presentation data from localStorage
          const storedData = localStorage.getItem(`presentation_${presentationId}`);
          if (!storedData) {
            throw new Error("Presentation not found");
          }
          
          const presentationData = JSON.parse(storedData);
          const loadedSlides = presentationData.slides;

          // Process slides to handle images
          const processedSlides = await Promise.all(loadedSlides.map(async (slide) => {
            if (!slide.imageUrl) return slide;

            // If it's already a base64 image or a URL, use it directly
            if (slide.imageUrl.startsWith('data:') || slide.imageUrl.startsWith('http')) {
              return slide;
            }

            // If we need to fetch and convert URL to base64
            try {
              const response = await fetch(slide.imageUrl);
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              return { ...slide, imageUrl: base64 };
            } catch (error) {
              console.error('Failed to load image:', error);
              return slide;
            }
          }));

          setSlides(processedSlides);
        }
      } catch (error) {
        console.error('Failed to load presentation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPresentation();
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
          if (isFullscreen) {
            // Exit fullscreen when in fullscreen mode
            document.exitFullscreen();
          } else if (isControlsVisible) {
            // Only toggle controls if not in fullscreen
            e.preventDefault();
            setIsControlsVisible(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, slides.length, isControlsVisible, isFullscreen]);

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

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return;
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });

    const currentSlide = slides[currentIndex];
    const userMessage = input;
    setInput('');
    setIsProcessing(true);
    setStreamingMessage("");

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a concise research assistant helping with a presentation. Current slide:
Title: ${currentSlide.title}
Content: ${currentSlide.body}
Provide brief, focused responses (max 2-3 sentences) to help enhance the presentation.`
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        stream: true,
        max_tokens: 150
      });

      let fullMessage = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullMessage += content;
        setStreamingMessage(fullMessage);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullMessage }]);
      setStreamingMessage("");
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsProcessing(false);
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
        "min-h-screen bg-gradient-to-br from-gray-900 to-black relative overflow-hidden",
        isFullscreen && "h-screen w-screen"
      )}
    >
      {/* Current Slide */}
      <div className={cn(
        "h-full flex items-center justify-center p-8",
        isChatOpen && "mr-[400px]",
        SLIDE_TRANSITION
      )}>
        <div className={cn(
          "w-full aspect-[16/9] bg-white relative rounded-2xl overflow-hidden shadow-2xl",
          isFullscreen ? "max-h-screen" : "max-w-7xl",
          SLIDE_TRANSITION
        )}>
          {slides[currentIndex]?.imageUrl && (
            <div className="absolute inset-0">
              <img
                src={slides[currentIndex].imageUrl}
                alt=""
                className="w-full h-full object-cover opacity-15 transform scale-105 transition-transform duration-1000"
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="relative z-10 h-full flex flex-col items-center justify-center p-16 text-center">
            <h2 className={cn(
              "font-bold mb-12 tracking-tight bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent",
              isFullscreen ? "text-7xl" : "text-6xl",
              SLIDE_TRANSITION
            )}>
              {slides[currentIndex]?.title}
            </h2>
            <p className={cn(
              "text-gray-700 leading-relaxed max-w-4xl",
              isFullscreen ? "text-3xl" : "text-2xl",
              SLIDE_TRANSITION
            )}>
              {slides[currentIndex]?.body}
            </p>
          </div>
        </div>
      </div>

      {/* Research Chat Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[400px] bg-black/30 backdrop-blur-2xl border-l border-white/10 transform transition-transform duration-500 ease-in-out shadow-2xl",
        !isChatOpen && "translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Research Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4" ref={chatScrollRef}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-200",
                    message.role === 'user' 
                      ? "bg-orange-500/20 ml-12 hover:bg-orange-500/30" 
                      : "bg-white/10 mr-12 hover:bg-white/20"
                  )}
                >
                  <p className="text-sm text-white/90 leading-relaxed">{message.content}</p>
                </div>
              ))}
              {streamingMessage && (
                <div className="bg-white/10 mr-12 p-3 rounded-xl">
                  <p className="text-sm text-white/90 leading-relaxed">{streamingMessage}</p>
                </div>
              )}
              {isProcessing && !streamingMessage && (
                <div className="flex justify-center p-3">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-6">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a brief question..."
              className="min-h-[60px] bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm rounded-xl resize-none focus:ring-orange-400/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex justify-end mt-2">
              <Button
                className="bg-orange-500/80 hover:bg-orange-500 text-white"
                size="sm"
                disabled={isProcessing || !input.trim()}
                onClick={handleSendMessage}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500",
          isChatOpen ? "right-[400px]" : "right-0",
          !isControlsVisible && "translate-y-full opacity-0"
        )}
      >
        <div className={cn(
          "max-w-4xl mx-auto flex items-center justify-between rounded-2xl p-4",
          BLUR_BACKDROP,
          "border border-white/10 shadow-xl"
        )}>
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="text-sm font-medium text-white/70">
              {currentIndex + 1} / {slides.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10"
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
              className="text-white/70 hover:text-white hover:bg-white/10"
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
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsControlsVisible(prev => !prev)}
            >
              {isControlsVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsChatOpen(prev => !prev)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Presenter Notes */}
      {slides[currentIndex].notes && (
        <div className={cn(
          "fixed left-8 max-w-2xl mx-auto rounded-2xl",
          BLUR_BACKDROP,
          "border border-white/10 shadow-xl p-6",
          isChatOpen ? "right-[416px]" : "right-8",
          isFullscreen ? "bottom-32" : "bottom-28",
          !isControlsVisible && "opacity-0 translate-y-full",
          CONTROL_TRANSITION
        )}>
          <div className="flex items-center gap-3 mb-3">
            <Presentation className="h-5 w-5 text-orange-400" />
            <span className="font-medium text-white">Presenter Notes</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{slides[currentIndex].notes}</p>
        </div>
      )}
    </div>
  );
};

export default PresentationMode; 
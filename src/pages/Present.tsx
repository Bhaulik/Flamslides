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
        "min-h-screen bg-black relative overflow-hidden",
        isFullscreen && "h-screen w-screen"
      )}
    >
      {/* Current Slide */}
      <div className={cn(
        "h-full flex items-center justify-center p-4",
        isChatOpen && "mr-[400px]"
      )}>
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

      {/* Research Chat Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[400px] bg-white/10 backdrop-blur-lg transform transition-transform duration-300",
        !isChatOpen && "translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Research Assistant</h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3" ref={chatScrollRef}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded-lg",
                    message.role === 'user' 
                      ? "bg-orange-500/20 ml-12" 
                      : "bg-white/10 mr-12"
                  )}
                >
                  <p className="text-sm text-white leading-relaxed">{message.content}</p>
                </div>
              ))}
              {streamingMessage && (
                <div className="bg-white/10 mr-12 p-2 rounded-lg">
                  <p className="text-sm text-white leading-relaxed">{streamingMessage}</p>
                </div>
              )}
              {isProcessing && !streamingMessage && (
                <div className="flex justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a brief question..."
              className="min-h-[60px] bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              className="self-end bg-orange-500 hover:bg-orange-600"
              size="icon"
              disabled={isProcessing || !input.trim()}
              onClick={handleSendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className={cn(
          "fixed bottom-0 left-0 transition-all duration-300",
          isChatOpen ? "right-[400px]" : "right-0",
          "p-4",
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
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setIsChatOpen(prev => !prev)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {isChatOpen ? "Close Chat" : "Research Chat"}
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
          "fixed left-4 bg-black/50 text-white p-4 rounded-lg backdrop-blur-sm transition-all duration-300",
          isChatOpen ? "right-[416px]" : "right-4",
          "max-w-2xl mx-auto",
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
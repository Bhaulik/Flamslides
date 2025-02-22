import { useState, useRef, useEffect } from 'react';
import { Slide } from '@/types/slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  MoveUp, 
  MoveDown, 
  Trash2,
  FileUp,
  Loader2,
  Edit,
  X,
  Save,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { SlideEditor } from '@/components/SlideEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import OpenAI from 'openai';

const CARD_STYLES = "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100/20";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ImageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'Image must be less than 5MB')
    .refine(file => ALLOWED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .png, .webp and .gif formats are supported'),
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SlideManagerProps {
  slides: Slide[];
  onSlidesChange: (slides: Slide[]) => void;
  currentSlide: number;
  onSlideSelect: (index: number) => void;
  isGenerating?: boolean;
  onGenerateImage?: (description: string) => Promise<string>;
  loadingMessage?: string;
}

export const SlideManager = ({
  slides,
  onSlidesChange,
  currentSlide,
  onSlideSelect,
  isGenerating = false,
  onGenerateImage,
  loadingMessage = ""
}: SlideManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [suggestedContent, setSuggestedContent] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Update refs array when slides change
  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, slides.length);
  }, [slides.length]);

  // Scroll to current slide when it changes
  useEffect(() => {
    const currentSlideRef = slideRefs.current[currentSlide];
    if (currentSlideRef) {
      currentSlideRef.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentSlide]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleImageUpload = async (file: File, slideIndex: number) => {
    try {
      // Validate file
      ImageUploadSchema.parse({ file });

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newSlides = [...slides];
        newSlides[slideIndex] = {
          ...newSlides[slideIndex],
          imageUrl: base64String
        };
        onSlidesChange(newSlides);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Image",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const addNewSlide = () => {
    const newSlide: Slide = {
      title: "New Slide",
      body: "Add your content here",
      notes: "",
      imageUrl: null,
      ai_image_description: ""
    };
    onSlidesChange([...slides, newSlide]);
    onSlideSelect(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "Presentation must have at least one slide",
        variant: "destructive",
      });
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    onSlidesChange(newSlides);
    if (currentSlide >= newSlides.length) {
      onSlideSelect(newSlides.length - 1);
    }
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    onSlidesChange(newSlides);
    onSlideSelect(newIndex);
  };

  const importSlides = async (file: File) => {
    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const importedSlides = JSON.parse(reader.result as string);
          // Validate imported slides structure
          const ImportedSlidesSchema = z.array(z.object({
            title: z.string(),
            body: z.string(),
            notes: z.string().optional(),
            imageUrl: z.string().nullable().optional(),
            ai_image_description: z.string().optional()
          }));
          
          const validatedSlides = ImportedSlidesSchema.parse(importedSlides);
          onSlidesChange([...slides, ...validatedSlides]);
          toast({
            title: "Import Successful",
            description: `Imported ${validatedSlides.length} slides`,
          });
        } catch (error) {
          toast({
            title: "Invalid File",
            description: "The file format is not correct",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import slides",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEditing = (index: number) => {
    setEditingSlideIndex(index);
    setEditingSlide({ ...slides[index] }); // Create a copy for editing
  };

  const handleCancelEdit = () => {
    setEditingSlideIndex(null);
    setEditingSlide(null);
  };

  const handleSaveEdit = () => {
    if (editingSlideIndex !== null && editingSlide) {
      const newSlides = [...slides];
      newSlides[editingSlideIndex] = editingSlide;
      onSlidesChange(newSlides);
      toast({
        title: "Changes Saved",
        description: "Your slide has been updated successfully.",
      });
      setEditingSlideIndex(null);
      setEditingSlide(null);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return;
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });

    const currentSlideContent = slides[currentSlide];
    const userMessage = chatInput;
    setChatInput('');
    setIsProcessing(true);
    setStreamingMessage("");
    setSuggestedContent(null);

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a concise research assistant helping with a presentation. Current slide:
Title: ${currentSlideContent.title}
Content: ${currentSlideContent.body}
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
      setSuggestedContent(fullMessage.trim());
      
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

  const handleApplySuggestion = () => {
    if (suggestedContent) {
      const newSlides = [...slides];
      newSlides[currentSlide] = {
        ...newSlides[currentSlide],
        body: suggestedContent
      };
      onSlidesChange(newSlides);
      setSuggestedContent(null);
      toast({
        title: "Changes Applied",
        description: "The suggested content has been applied to the slide.",
      });
    }
  };

  return (
    <div className={cn("space-y-2", CARD_STYLES, "p-4")}>
      {/* Loading Dialog */}
      <Dialog open={isGenerating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full text-white">
                <Wand2 className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                {loadingMessage || "Generating your slideshow..."}
              </h3>
              <p className="text-sm text-gray-500">Please wait while we work our magic</p>
            </div>

            <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 w-1/2 animate-[slide_2s_ease-in-out_infinite]"></div>
            </div>

            <div className="flex gap-2 items-center text-sm text-gray-500">
              <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
              <span>Crafting beautiful slides</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Slides</h3>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
            {slides.length}
          </span>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import Slides</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={addNewSlide}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add New Slide</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importSlides(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="h-[calc(100vh-32rem)] overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent hover:scrollbar-thumb-orange-300">
        {slides.map((slide, index) => (
          <div
            key={index}
            ref={el => slideRefs.current[index] = el}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border relative overflow-hidden",
              currentSlide === index ? "border-orange-500 bg-orange-50" : "border-gray-200",
              isGenerating && "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent before:animate-shimmer before:-translate-x-full"
            )}
          >
            <div
              className={cn(
                "w-16 h-16 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0",
                isGenerating && "animate-pulse"
              )}
              onClick={() => onSlideSelect(index)}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    isGenerating && "opacity-50"
                  )}
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>

            <div 
              className={cn(
                "flex-1 min-w-0",
                isGenerating && "animate-pulse"
              )} 
            >
              <div className="flex items-center gap-4">
                <div 
                  className="flex-1 min-w-0 cursor-pointer" 
                  onClick={() => onSlideSelect(index)}
                >
                  <h4 className="font-medium text-base truncate max-w-[300px]">{slide.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-1 max-w-[400px]">{slide.body}</p>
                </div>
                
                <div className="flex items-center gap-0.5 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsChatOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Quick Edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(index);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Slide</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleImageUpload(file, index);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload Image</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex items-center border-l border-gray-200 ml-1 pl-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSlide(index, 'up');
                            }}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move Up</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSlide(index, 'down');
                            }}
                            disabled={index === slides.length - 1}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Move Down</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSlide(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Slide</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={(open) => {
        if (!open) {
          setMessages([]);
          setChatInput('');
          setStreamingMessage('');
          setSuggestedContent(null);
        }
        setIsChatOpen(open);
      }}>
        <DialogContent className="w-[90vw] max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>AI Chat Assistant</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
              <h4 className="font-medium text-base mb-2">Current Slide Content</h4>
              <p className="text-sm text-gray-600">{slides[currentSlide]?.body}</p>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4" ref={chatScrollRef}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-xl max-w-[80%] transition-all duration-200",
                      message.role === 'user' 
                        ? "bg-orange-500/20 ml-auto" 
                        : "bg-gray-100"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="bg-gray-100 p-3 rounded-xl max-w-[80%]">
                    <p className="text-sm leading-relaxed">{streamingMessage}</p>
                  </div>
                )}
                {isProcessing && !streamingMessage && (
                  <div className="flex justify-center p-3">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {suggestedContent && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-base text-green-800">Suggested Content</h4>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApplySuggestion}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Apply to Slide
                  </Button>
                </div>
                <p className="text-sm text-green-700">{suggestedContent}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask the AI to help improve your slide content..."
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 self-end"
                size="icon"
                onClick={handleSendMessage}
                disabled={isProcessing || !chatInput.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Slide Modal */}
      <Dialog open={editingSlideIndex !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="w-[90vw] max-w-3xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-orange-100/20 flex flex-row items-center justify-between">
            <DialogTitle>
              Edit Slide {editingSlideIndex !== null ? editingSlideIndex + 1 : ''}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700"
                onClick={handleSaveEdit}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogHeader>
          {editingSlide && (
            <div className="px-6 py-4">
              <SlideEditor
                slide={editingSlide}
                onSlideUpdate={setEditingSlide}
                onGenerateImage={onGenerateImage}
                isGenerating={isGenerating}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 
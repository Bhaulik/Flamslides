import { useState } from "react";
import { Slideshow } from "@/components/Slideshow";
import { ChatArea } from "@/components/ChatArea";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Flame, Loader2, Play, QrCode, Presentation, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  PresentationRequest,
  PresentationSchema,
  PresentationRequestType,
  openAIResponseSchema
} from "@/types/slide";
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SlideManager } from "@/components/SlideManager";
import { SlideEditor } from "@/components/SlideEditor";
import { exportToPowerPoint } from "@/lib/export";

const sampleSlides: Slide[] = [
  {
    title: "Welcome to FlamSlides",
    body: "Create stunning AI-powered presentations in minutes. Transform your ideas into professional, engaging slideshows with just a few clicks.",
    imageUrl: "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0",
    ai_image_description: "A modern, minimalist presentation screen with elegant flame logo, professional lighting, warm colors"
  },
  {
    title: "AI-Powered Content Generation",
    body: "Let our advanced AI create well-structured, coherent presentations. From professional reports to academic lectures, FlamSlides adapts to your style and needs.",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
    ai_image_description: "Futuristic AI visualization, neural networks, glowing connections, professional tech aesthetic"
  },
  {
    title: "Smart Customization",
    body: "Fine-tune your presentations with our interactive chat interface. Adjust content, style, and themes in real-time while maintaining professional consistency.",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978",
    ai_image_description: "Interactive design interface, modern UI elements, warm professional color scheme"
  },
  {
    title: "Beautiful Themes & Layouts",
    body: "Every presentation comes with carefully crafted themes and responsive layouts. Enjoy automatic image selection and consistent visual styling.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    ai_image_description: "Elegant presentation layout with modern design elements, professional color palette, subtle patterns"
  },
  {
    title: "Present with Confidence",
    body: "Get AI-generated presenter notes, smart slide transitions, and optimized content flow. Focus on delivery while FlamSlides handles the structure.",
    imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
    ai_image_description: "Professional presenter on stage with modern presentation display, confident pose, warm lighting"
  }
];

const steps = [
  { number: 1, title: "Enter Topic & Details", description: "Provide the main topic and description for your presentation" },
  { number: 2, title: "Generate Slides", description: "AI will create engaging slides based on your input" },
  { number: 3, title: "Refine Content", description: "Use the chat interface to perfect each slide" }
];

const systemPrompt = `You are a presentation expert that creates engaging and informative slides.
Follow these guidelines:
- Create clear, concise titles that capture attention
- Each slide should have a coherent message
- Use professional language appropriate for the context
- Include optional presenter notes for guidance
- Maintain consistent theming throughout
- Structure content logically with a clear flow

The presentation should follow this structure:
- Title slide introducing the topic
- Content slides developing key points
- Summary or conclusion slide

For theme colors, provide a complete theme with the following hex color codes:
- primary: Main brand color (e.g., #2563eb)
- secondary: Complementary color
- background: Base background color
- accent: Highlight color
- text:
  - heading: Color for headings
  - body: Color for main content
  - muted: Color for less important text

Example theme:
{
  "primary": "#2563eb",
  "secondary": "#4f46e5",
  "background": "#ffffff",
  "accent": "#f59e0b",
  "text": {
    "heading": "#1e293b",
    "body": "#334155",
    "muted": "#64748b"
  }
}`;

const generateImage = async (prompt: string): Promise<string> => {
  try {
    logger.info("Starting DALL-E image generation", { prompt });

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Professional presentation visual: ${prompt}. Style: Modern, minimalist, professional. The image should be clean, elegant, and suitable for a professional presentation.`,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        style: "natural"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error("DALL-E image generation failed", {
        status: response.status,
        error: error
      });
      throw new Error(error.error?.message || error.error || 'Failed to generate image');
    }

    const data = await response.json();
    logger.debug("DALL-E image generated successfully", { data });

    if (!data.data?.[0]?.url) {
      throw new Error("No image URL in DALL-E response");
    }

    return data.data[0].url;
  } catch (error) {
    logger.error("Image generation failed", { error });
    
    // Return a fallback image URL from Unsplash based on the prompt theme
    const fallbackImages = [
      "https://images.unsplash.com/photo-1516383740770-fbcc5ccbece0",
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
      "https://images.unsplash.com/photo-1552664730-d307ca884978",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0"
    ];
    
    // Use a consistent but pseudo-random selection based on the prompt
    const index = Math.abs(prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % fallbackImages.length;
    return fallbackImages[index];
  }
};

const GRADIENT_TEXT = "bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent";
const CARD_STYLES = "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100/20";
const INPUT_STYLES = "bg-white/80 border-orange-100/30 focus:border-orange-500/30 focus:ring-orange-500/20";

const Index = () => {
  const [slides, setSlides] = useState<Slide[]>(sampleSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState<PresentationRequestType>({
    topic: "",
    description: "",
    numberOfSlides: 3,
    duration: 5,
    style: "professional"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info("Starting slide generation", { formData });
    setIsGenerating(true);
    setShowSteps(false);
    setLoadingMessage("Initializing slide generation...");

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      logger.error("API key missing");
      toast({
        title: "Configuration Error",
        description: "API key is not configured. Please check your environment variables.",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    try {
      logger.info("Validating input data");
      const validatedInput = PresentationRequest.parse(formData);
      logger.debug("Input validation successful", { validatedInput });
      
      setLoadingMessage("Creating engaging presentation content with ChatGPT...");
      logger.info("Sending request to OpenAI");

      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `${systemPrompt}
Please provide the response in the following JSON format:
{
  "title": "string",
  "slides": [
    {
      "title": "string",
      "body": "string",
      "notes": "string (optional)",
      "imageUrl": "string (optional)",
      "ai_image_description": "A detailed description for AI image generation. Should describe the visual elements, style, and mood of the image that would best support the slide's content."
    }
  ],
  "theme": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex",
    "accent": "#hex",
    "text": {
      "heading": "#hex",
      "body": "#hex",
      "muted": "#hex"
    }
  }
}`
          },
          {
            role: "user",
            content: `Create a presentation about ${validatedInput.topic}. 
Include ${validatedInput.numberOfSlides} slides.
Style: ${validatedInput.style}
Additional context: ${validatedInput.description}
Duration: ${validatedInput.duration} minutes

For each slide, provide a detailed image description that will be used to generate a supporting visual.
Return the presentation in JSON format as specified.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      logger.info("Received response from OpenAI");
      
      if (!completion.choices[0]?.message?.content) {
        throw new Error("No content received from OpenAI");
      }

      const rawResponse = JSON.parse(completion.choices[0].message.content);
      logger.debug("Parsed JSON response", { rawResponse });

      // Validate with Zod schema
      const presentation = PresentationSchema.parse(rawResponse);
      logger.info("Successfully validated presentation", {
        slideCount: presentation.slides.length,
        hasTheme: !!presentation.theme
      });

      setLoadingMessage("Processing and formatting slides...");
      
      // Generate images for slides
      const processedSlides = await Promise.all(
        presentation.slides.map(async (slide, index) => {
          try {
            if (slide.ai_image_description) {
              setLoadingMessage(`Generating image for slide ${index + 1}...`);
              const imageUrl = await generateImage(slide.ai_image_description);
              return { ...slide, imageUrl };
            }
            return {
              ...slide,
              imageUrl: slide.imageUrl || sampleSlides[index % sampleSlides.length].imageUrl
            };
          } catch (error) {
            logger.warn(`Using fallback image for slide ${index + 1}`, { error });
            return {
              ...slide,
              imageUrl: sampleSlides[index % sampleSlides.length].imageUrl
            };
          }
        })
      );

      logger.info("Slides processed successfully", { 
        processedCount: processedSlides.length,
        hasImages: processedSlides.every(slide => !!slide.imageUrl)
      });

      setSlides(processedSlides);
      toast({
        title: "Slides Generated",
        description: `Created ${processedSlides.length} slides with AI-generated images.`,
      });

    } catch (error) {
      logger.error("Error in slide generation", { error });
      
      if (error instanceof z.ZodError) {
        logger.error("Validation error", { 
          issues: error.issues 
        });
        toast({
          title: "Invalid Input",
          description: "Please check your input values and try again.",
          variant: "destructive",
        });
      } else {
        console.error('Error generating slides:', error);
        toast({
          title: "Error",
          description: "Failed to generate slides. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
      setLoadingMessage("");
      logger.info("Slide generation process completed");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    logger.debug("Form input changed", { field: name, value });
    
    setFormData((prev) => {
      // Handle numeric fields
      if (name === "numberOfSlides" || name === "duration") {
        const numValue = parseInt(value);
        // Only update if it's a valid number and within bounds
        if (!isNaN(numValue)) {
          if (name === "numberOfSlides" && (numValue < 1 || numValue > 10)) {
            return prev;
          }
          if (name === "duration" && (numValue < 1 || numValue > 30)) {
            return prev;
          }
          return {
            ...prev,
            [name]: numValue
          };
        }
        return prev;
      }
      
      // Handle text fields and select
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSlideUpdate = (index: number, updatedSlide: Slide) => {
    const newSlides = [...slides];
    newSlides[index] = updatedSlide;
    setSlides(newSlides);
  };

  const generatePresentationId = () => {
    // Generate a shorter unique ID
    const uniqueId = Math.random().toString(36).substring(2, 15);
    
    // Store the full presentation data in localStorage
    const presentationData = {
      timestamp: Date.now(),
      slides: slides.map(slide => ({
        ...slide,
        id: Math.random().toString(36).substr(2, 9)
      }))
    };
    localStorage.setItem(`presentation_${uniqueId}`, JSON.stringify(presentationData));
    
    return uniqueId;
  };

  const handleStartPresentation = () => {
    const presentationId = generatePresentationId();
    window.open(`/present/${presentationId}`, '_blank');
  };

  const handleExportPPT = async () => {
    try {
      setLoadingMessage("Exporting to PowerPoint...");
      setIsGenerating(true);
      const fileName = await exportToPowerPoint(slides, formData.topic || "FlamSlides Presentation");
      toast({
        title: "Export Successful",
        description: `Presentation saved as ${fileName}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export presentation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-8 bg-gradient-to-br from-orange-50 to-red-50 p-8">
      {/* Title Area */}
      <div className={cn("w-full text-center py-12", CARD_STYLES)}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <Flame className="h-10 w-10 text-orange-500" />
          <h1 className={cn("text-5xl font-bold", GRADIENT_TEXT)}>
            FlamSlides
          </h1>
        </div>
        <p className="text-lg text-gray-600">Create stunning presentations with AI-powered content generation</p>
      </div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-[1fr_300px] gap-8">
        {/* Input Form */}
        <div className={cn("p-8", CARD_STYLES)}>
          <h2 className={cn("text-3xl font-bold mb-6 text-center", GRADIENT_TEXT)}>Generate Slideshow</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-2 text-gray-700">
                Topic/Title
              </label>
              <Input
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="Enter the main topic"
                className={INPUT_STYLES}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2 text-gray-700">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what you want in your slides"
                className={cn("min-h-[120px] resize-none", INPUT_STYLES)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="numberOfSlides" className="block text-sm font-medium mb-2 text-gray-700">
                  Number of Slides
                </label>
                <Input
                  id="numberOfSlides"
                  name="numberOfSlides"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.numberOfSlides}
                  onChange={handleInputChange}
                  className={INPUT_STYLES}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Between 1-10 slides</p>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium mb-2 text-gray-700">
                  Duration
                </label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.duration}
                  onChange={handleInputChange}
                  className={INPUT_STYLES}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Between 1-30 minutes</p>
              </div>
            </div>

            <div>
              <label htmlFor="style" className="block text-sm font-medium mb-2 text-gray-700">
                Presentation Style
              </label>
              <select
                id="style"
                name="style"
                value={formData.style}
                onChange={handleInputChange}
                className={cn("w-full rounded-md px-3 py-2", INPUT_STYLES)}
                required
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="academic">Academic</option>
              </select>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
              size="lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating Presentation...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Presentation className="h-5 w-5" />
                  <span>Generate Slideshow</span>
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Steps Section - Now Vertical */}
        {showSteps && (
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className={cn("p-6 relative", CARD_STYLES)}>
                <div className="absolute -left-4 flex items-center justify-center w-8 h-8 text-white bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg font-bold text-lg">
                  {step.number}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isGenerating && (
        <div className={cn("w-full max-w-2xl mx-auto p-8 mt-8", CARD_STYLES)}>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-xl font-medium text-gray-700">{loadingMessage}</p>
          </div>
          <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Slideshow and Edit Area */}
      <div className="w-full max-w-[1600px] mx-auto">
        {slides.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
              {/* Left Column - Slideshow and Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">Preview</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                      onClick={handleExportPPT}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4 mr-2" />
                      )}
                      Export to PPT
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
                      onClick={handleStartPresentation}
                    >
                      <Play className="w-4 w-4 mr-2" />
                      Start Presentation
                    </Button>
                  </div>
                </div>

                {/* Slideshow */}
                <div>
                  <Slideshow 
                    slides={slides} 
                    currentSlide={currentSlide}
                    onSlideChange={setCurrentSlide}
                  />
                </div>

                {/* Slide Editor */}
                <div className={cn("p-4 rounded-xl mt-2", CARD_STYLES)}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Edit Current Slide</h3>
                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                      Slide {currentSlide + 1} of {slides.length}
                    </span>
                  </div>
                  
                  <SlideEditor
                    slide={slides[currentSlide]}
                    onSlideUpdate={(updatedSlide) => handleSlideUpdate(currentSlide, updatedSlide)}
                    onGenerateImage={async (description) => {
                      setLoadingMessage(`Regenerating image for slide ${currentSlide + 1}...`);
                      setIsGenerating(true);
                      try {
                        const newImageUrl = await generateImage(description);
                        return newImageUrl;
                      } finally {
                        setIsGenerating(false);
                        setLoadingMessage("");
                      }
                    }}
                    isGenerating={isGenerating}
                  />
                </div>
              </div>

              {/* Right Column - Slide Manager & Chat */}
              <div className="space-y-8">
                <SlideManager
                  slides={slides}
                  onSlidesChange={setSlides}
                  currentSlide={currentSlide}
                  onSlideSelect={setCurrentSlide}
                />

                <ChatArea 
                  slides={slides} 
                  onSlideUpdate={handleSlideUpdate} 
                  selectedSlide={currentSlide}
                  onSlideSelect={setCurrentSlide}
                />
              </div>
            </div>

            {/* QR Code Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-8 border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className={GRADIENT_TEXT}>Share Presentation</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-8 space-y-6">
                  <QRCodeSVG
                    value={`${window.location.origin}/present/${generatePresentationId()}`}
                    size={256}
                    level="M"
                    includeMargin
                    className="border-8 border-white rounded-2xl shadow-xl"
                  />
                  <p className="text-sm text-gray-600 text-center">
                    Scan this QR code to follow along with the presentation on your device
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;

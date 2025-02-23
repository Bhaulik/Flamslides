import { useState } from "react";
import { Slideshow } from "@/components/Slideshow";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Flame, Loader2, Play, QrCode, Presentation, ChevronLeft, ChevronRight, FileDown, Key } from "lucide-react";
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
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { getApiKey, removeApiKey } from '@/lib/crypto';

const GRADIENT_TEXT = "bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent";
const CARD_STYLES = "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-100/20";
const INPUT_STYLES = "bg-white/80 border-orange-100/30 focus:border-orange-500/30 focus:ring-orange-500/20";

const sampleSlides: Slide[] = [
  {
    title: "Welcome to FlamSlides",
    body: "Create stunning AI-powered presentations in minutes. Transform your ideas into professional, engaging slideshows with just a few clicks.\n\nDeveloped by Brijesh Patel & Bhaulik Patel",
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
  { 
    number: 1, 
    title: "Enter Topic & Details", 
    description: "Provide the main topic and description for your presentation",
    icon: "✏️"
  },
  { 
    number: 2, 
    title: "Generate Slides", 
    description: "AI will create engaging slides based on your input",
    icon: "🤖"
  },
  { 
    number: 3, 
    title: "Refine Content", 
    description: "Use the chat interface to perfect each slide",
    icon: "✨"
  }
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
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingMessage, setLoadingMessage] = useState("");
  const { toast } = useToast();
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [pendingImagePrompt, setPendingImagePrompt] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info("Starting slide generation", { formData });
    
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.info("No API key found, showing dialog");
      setIsApiKeyDialogOpen(true);
      return;
    }

    setIsGenerating(true);
    setCurrentStep(2);
    setLoadingMessage("Initializing slide generation...");

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
      setCurrentStep(3);
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
      setCurrentStep(1);
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
    try {
      // Generate a shorter unique ID
      const uniqueId = Math.random().toString(36).substring(2, 15);
      
      // Create presentation data
      const presentationData = {
        timestamp: Date.now(),
        slides: slides.map(slide => ({
          title: slide.title,
          body: slide.body,
          notes: slide.notes,
          imageUrl: slide.imageUrl,
          ai_image_description: slide.ai_image_description
        }))
      };

      // Try storing complete data first
      try {
        localStorage.setItem(`presentation_${uniqueId}`, JSON.stringify(presentationData));
        logger.info('Stored presentation data successfully', { id: uniqueId });
        return uniqueId;
      } catch (storageError) {
        // If direct storage fails, try storing without images
        logger.warn('Full storage failed, trying without images', { error: storageError });
        
        const minimalData = {
          timestamp: Date.now(),
          slides: slides.map(slide => ({
            title: slide.title,
            body: slide.body,
            notes: slide.notes,
            // Keep URLs but remove base64 data
            imageUrl: slide.imageUrl?.startsWith('data:') ? null : slide.imageUrl
          }))
        };

        localStorage.setItem(`presentation_${uniqueId}`, JSON.stringify(minimalData));
        
        toast({
          title: "Limited Storage Mode",
          description: "Images will be limited in presentation mode due to storage constraints.",
        });
        
        return uniqueId;
      }
    } catch (error) {
      logger.error('Failed to store presentation:', error);
      toast({
        title: "Storage Warning",
        description: "Unable to store presentation data. Some features may be limited.",
        variant: "destructive",
      });
      return Math.random().toString(36).substring(2, 15);
    }
  };

  const handleGenerateQRCode = () => {
    const id = generatePresentationId();
    setPresentationId(id);
  };

  const handleStartPresentation = () => {
    const id = generatePresentationId();
    window.open(`/present/${id}`, '_blank');
  };

  const handleExportPPT = async () => {
    try {
      setIsGenerating(true);
      setLoadingMessage("Starting PowerPoint export...");
      
      const fileName = await exportToPowerPoint(
        slides, 
        formData.topic || "FlamSlides Presentation",
        (progress) => {
          setLoadingMessage(progress.status);
        }
      );
      
      toast({
        title: "Export Successful",
        description: `Presentation saved as ${fileName}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export presentation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setLoadingMessage("");
    }
  };

  const generateImage = async (prompt: string): Promise<string> => {
    try {
      logger.info("Starting DALL-E image generation", { prompt });

      const apiKey = getApiKey();
      if (!apiKey) {
        setPendingImagePrompt(prompt);
        setIsApiKeyDialogOpen(true);
        throw new Error("Please enter your OpenAI API key to generate images");
      }

      // First, generate the image with DALL-E
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
          style: "natural",
          response_format: "b64_json" // Get base64 directly
        })
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error("DALL-E image generation failed", {
          status: response.status,
          error: error
        });
        
        if (response.status === 401) {
          // Invalid API key
          removeApiKey();
          setPendingImagePrompt(prompt);
          setIsApiKeyDialogOpen(true);
          throw new Error("Invalid API key. Please enter a valid OpenAI API key.");
        }
        
        throw new Error(error.error?.message || error.error || 'Failed to generate image');
      }

      const data = await response.json();
      logger.debug("DALL-E image generated successfully", { data });

      if (!data.data?.[0]?.b64_json) {
        throw new Error("No image data in DALL-E response");
      }

      // Return the base64 data directly
      return `data:image/png;base64,${data.data[0].b64_json}`;

    } catch (error) {
      logger.error("Image generation failed", { error });
      
      // If it's not an API key error, use fallback images
      if (!error.message.includes("API key")) {
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
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-8 bg-gradient-to-br from-orange-50 to-red-50 p-8">
      {/* Title Area */}
      <div className={cn("w-full text-center py-12 relative", CARD_STYLES)}>
        <div className="flex items-center justify-between px-8">
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex items-center justify-center gap-4">
            <Flame className="h-10 w-10 text-orange-500" />
            <h1 className={cn("text-5xl font-bold", GRADIENT_TEXT)}>
              FlamSlides
            </h1>
          </div>
          <div className="flex-1 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApiKeyDialogOpen(true)}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Key className="h-4 w-4 mr-2" />
              {getApiKey() ? "Update API Key" : "Enter API Key"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-lg text-gray-600 mt-4">
          <p>Open-source AI powered Power Point alternative</p>
          <a
            href="https://github.com/bhaulik/Flamslides"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex hover:text-gray-900 transition-colors duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
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

        {/* Steps Section - Always visible */}
        <div className={cn("space-y-4", CARD_STYLES)}>
          {steps.map((step) => (
            <div 
              key={step.number}
              className={cn(
                "relative flex items-start gap-6 p-6 rounded-xl transition-all duration-300",
                step.number === currentStep 
                  ? "bg-orange-50/80" 
                  : step.number < currentStep 
                    ? "bg-green-50/80" 
                    : "bg-white/50 hover:bg-white/70",
                "group"
              )}
            >
              {/* Step Number */}
              <div className="flex-shrink-0">
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform duration-300",
                  step.number === currentStep 
                    ? "bg-gradient-to-br from-orange-500 to-red-600"
                    : step.number < currentStep
                      ? "bg-gradient-to-br from-green-500 to-green-600"
                      : "bg-gradient-to-br from-gray-400 to-gray-500"
                )}>
                  {step.number < currentStep ? "✓" : step.icon}
                </div>
              </div>
              
              {/* Step Content */}
              <div className="flex-1">
                <h3 className={cn(
                  "text-xl font-semibold mb-2",
                  step.number === currentStep ? "text-orange-800" : "text-gray-800"
                )}>
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {step.number !== steps.length && (
                <div className={cn(
                  "absolute left-[2.35rem] top-[4.5rem] w-[2px] h-8",
                  step.number < currentStep 
                    ? "bg-gradient-to-b from-green-500/50 to-green-600/50"
                    : "bg-gradient-to-b from-orange-500/50 to-red-600/50"
                )} />
              )}
            </div>
          ))}
        </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Slideshow */}
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
                <div className={cn(CARD_STYLES, "p-4")}>
                  <Slideshow 
                    slides={slides} 
                    currentSlide={currentSlide}
                    onSlideChange={setCurrentSlide}
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
                  isGenerating={isGenerating}
                  loadingMessage={loadingMessage}
                  onApiKeyRequired={() => setIsApiKeyDialogOpen(true)}
                  onGenerateImage={async (description) => {
                    setLoadingMessage(`Generating image...`);
                    setIsGenerating(true);
                    try {
                      const newImageUrl = await generateImage(description);
                      return newImageUrl;
                    } finally {
                      setIsGenerating(false);
                      setLoadingMessage("");
                    }
                  }}
                />
              </div>
            </div>

            {/* QR Code Dialog */}
            <Dialog onOpenChange={(open) => {
              if (open) {
                handleGenerateQRCode();
              } else {
                setPresentationId(null);
              }
            }}>
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
                  {presentationId && (
                    <QRCodeSVG
                      value={`${window.location.origin}/present/${presentationId}`}
                      size={256}
                      level="M"
                      includeMargin
                      className="border-8 border-white rounded-2xl shadow-xl"
                    />
                  )}
                  <p className="text-sm text-gray-600 text-center">
                    Scan this QR code to follow along with the presentation on your device
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-16 pb-8 text-center text-sm text-gray-500">
        <p>
          Maintained and developed by{' '}
          <a 
            href="https://github.com/Loopy178" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 transition-colors"
          >
            Brijesh Patel
          </a>
          {' & '}
          <a 
            href="https://github.com/bhaulik" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 transition-colors"
          >
            Bhaulik Patel
          </a>
        </p>
      </div>

      <ApiKeyDialog
        open={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
        onSuccess={async () => {
          // If there's a pending image generation, retry it
          if (pendingImagePrompt) {
            const prompt = pendingImagePrompt;
            setPendingImagePrompt(null);
            try {
              const newImageUrl = await generateImage(prompt);
              // Update the current slide with the new image
              if (currentSlide !== undefined) {
                const newSlides = [...slides];
                newSlides[currentSlide] = {
                  ...newSlides[currentSlide],
                  imageUrl: newImageUrl
                };
                setSlides(newSlides);
              }
            } catch (error) {
              console.error('Failed to generate image after API key update:', error);
            }
          } else {
            // Regular form submission
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }}
      />
    </div>
  );
};

export default Index;

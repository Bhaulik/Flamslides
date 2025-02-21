import { useState } from "react";
import { Slideshow } from "@/components/Slideshow";
import { ChatArea } from "@/components/ChatArea";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Flame, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  PresentationRequest,
  PresentationSchema,
  PresentationRequestType,
  Presentation,
  openAIResponseSchema
} from "@/types/slide";

const sampleSlides: Slide[] = [
  {
    title: "Innovation Through Design",
    body: "Creating experiences that seamlessly blend form and function, bringing ideas to life through thoughtful design and attention to detail.",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"
  },
  {
    title: "Building Tomorrow",
    body: "Empowering teams to create groundbreaking solutions that push the boundaries of what's possible in technology.",
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c"
  },
  {
    title: "Crafted with Precision",
    body: "Every pixel, every interaction, and every line of code is carefully considered to deliver an exceptional user experience.",
    imageUrl: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7"
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

For theme colors, use hex color codes (e.g., #2563eb for blue).`;

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
        description: "OpenAI API key is not configured. Please check your environment variables.",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });

    try {
      logger.info("Validating input data");
      const validatedInput = PresentationRequest.parse(formData);
      logger.debug("Input validation successful", { validatedInput });
      
      setLoadingMessage("Creating engaging presentation content with ChatGPT...");
      logger.info("Sending request to OpenAI");

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
      "imageUrl": "string (optional)"
    }
  ],
  "theme": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex"
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
      
      // Update slides with the generated content
      const processedSlides = presentation.slides.map((slide, index) => ({
        ...slide,
        imageUrl: slide.imageUrl || sampleSlides[index % sampleSlides.length].imageUrl
      }));

      logger.info("Slides processed successfully", { 
        processedCount: processedSlides.length,
        hasImages: processedSlides.every(slide => !!slide.imageUrl)
      });

      setSlides(processedSlides);
      toast({
        title: "Slides Generated",
        description: `Created ${processedSlides.length} slides successfully.`,
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

  return (
    <div className="min-h-screen flex flex-col gap-8 bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      {/* Title Area */}
      <div className="w-full text-center py-8 bg-white shadow-lg rounded-lg">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Flame className="h-8 w-8 text-orange-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            FlamSlides
          </h1>
        </div>
        <p className="text-gray-600">Create stunning presentations with AI-powered content generation</p>
      </div>

      {/* Input Form */}
      <div className="w-full max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Generate Slideshow</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium mb-1">
              Topic/Title
            </label>
            <Input
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              placeholder="Enter the main topic"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what you want in your slides"
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="numberOfSlides" className="block text-sm font-medium mb-1">
                Number of Slides (1-10)
              </label>
              <Input
                id="numberOfSlides"
                name="numberOfSlides"
                type="number"
                min={1}
                max={10}
                value={formData.numberOfSlides}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-1">
                Duration (1-30 min)
              </label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min={1}
                max={30}
                value={formData.duration}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-medium mb-1">
              Presentation Style
            </label>
            <select
              id="style"
              name="style"
              value={formData.style}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="academic">Academic</option>
            </select>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </div>
            ) : (
              "Generate Slideshow"
            )}
          </Button>
        </form>
      </div>

      {/* Loading Indicator */}
      {isGenerating && (
        <div className="w-full max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            <p className="text-lg font-medium text-gray-700">{loadingMessage}</p>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Steps Section */}
      {showSteps && (
        <div className="w-full max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-8 h-8 text-white bg-orange-500 rounded-full font-bold">
                    {step.number}
                  </span>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                </div>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slideshow and Chat Area */}
      <div className="w-full max-w-7xl mx-auto">
        <Slideshow 
          slides={slides} 
          currentSlide={currentSlide}
          onSlideChange={setCurrentSlide}
        />
        <ChatArea 
          slides={slides} 
          onSlideUpdate={handleSlideUpdate} 
          selectedSlide={currentSlide}
          onSlideSelect={setCurrentSlide}
        />
      </div>
    </div>
  );
};

export default Index;

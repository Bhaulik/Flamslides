
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

const Index = () => {
  const [slides, setSlides] = useState<Slide[]>(sampleSlides);
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    numberOfSlides: "3",
    duration: "5"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setShowSteps(false);
    setLoadingMessage("Initializing slide generation...");

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
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
      setLoadingMessage("Creating engaging presentation content with ChatGPT...");
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a presentation expert that creates engaging and informative slides. Format your response as a list of slides, each with 'Title:' and 'Body:' sections."
          },
          {
            role: "user",
            content: `Create a ${formData.numberOfSlides}-slide presentation about ${formData.topic}. Here's more context: ${formData.description}`
          }
        ],
        temperature: 0.7,
      });

      if (completion.choices[0]?.message?.content) {
        setLoadingMessage("Processing and formatting slides...");
        const content = completion.choices[0].message.content;
        
        const slides = content.split('\n\n')
          .filter((slide: string) => slide.trim() && slide.includes('Title:') && slide.includes('Body:'))
          .map((slide: string, index: number) => {
            const parts = slide.split('Body:');
            return {
              title: parts[0].replace('Title:', '').trim(),
              body: parts[1].trim(),
              imageUrl: sampleSlides[index % sampleSlides.length].imageUrl
            };
          });

        if (slides.length > 0) {
          setSlides(slides);
          toast({
            title: "Slides Generated",
            description: "Your presentation has been created successfully using ChatGPT.",
          });
        } else {
          throw new Error('Invalid slide format received');
        }
      }
    } catch (error) {
      console.error('Error generating slides:', error);
      toast({
        title: "Error",
        description: "Failed to generate slides. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setLoadingMessage("");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
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
                Number of Slides
              </label>
              <Input
                id="numberOfSlides"
                name="numberOfSlides"
                type="number"
                min="1"
                max="10"
                value={formData.numberOfSlides}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-1">
                Duration (minutes)
              </label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min="1"
                max="30"
                value={formData.duration}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Slideshow"}
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

      {/* Slideshow */}
      {!isGenerating && slides.length > 0 && (
        <div className="w-full">
          <Slideshow 
            slides={slides} 
            autoPlayInterval={5000} 
          />
        </div>
      )}

      {/* Chat Area */}
      {!isGenerating && slides.length > 0 && (
        <ChatArea 
          slides={slides}
          onSlideUpdate={handleSlideUpdate}
        />
      )}
    </div>
  );
};

export default Index;


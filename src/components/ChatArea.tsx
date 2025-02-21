import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageSquare } from "lucide-react";
import type { Slide } from "@/types/slide";
import { useToast } from "./ui/use-toast";
import OpenAI from "openai";

interface ChatAreaProps {
  slides: Slide[];
  onSlideUpdate: (index: number, updatedSlide: Slide) => void;
  selectedSlide: number;
  onSlideSelect: (index: number) => void;
}

export const ChatArea = ({ 
  slides, 
  onSlideUpdate, 
  selectedSlide, 
  onSlideSelect 
}: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsUpdating(true);
    try {
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a presentation expert that updates slide content based on user feedback. Format your response with 'Title:' and 'Body:' sections."
          },
          {
            role: "user",
            content: `Update this slide content based on the following feedback. Current slide title: "${slides[selectedSlide].title}". Current slide body: "${slides[selectedSlide].body}". User feedback: "${message}". Provide the response in this format - Title: [new title] Body: [new body]`
          }
        ],
        temperature: 0.7,
      });

      if (completion.choices[0]?.message?.content) {
        const content = completion.choices[0].message.content;
        const contentParts = content.split('Body:');
        const newTitle = contentParts[0].replace('Title:', '').trim();
        const newBody = contentParts[1].trim();

        onSlideUpdate(selectedSlide, {
          ...slides[selectedSlide],
          title: newTitle,
          body: newBody,
        });

        setMessage("");
        toast({
          title: "Slide Updated",
          description: "The slide content has been successfully updated.",
        });
      }
    } catch (error) {
      console.error('Error updating slide:', error);
      toast({
        title: "Error",
        description: "Failed to update the slide. Please try again.",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Slide Editor Chat</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Slide to Edit</label>
        <div className="flex flex-wrap gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => onSlideSelect(index)}
              className={`px-3 py-1 rounded ${
                selectedSlide === index
                  ? "bg-primary text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Slide {index + 1}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe how you want to update the selected slide..."
          disabled={isUpdating}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isUpdating || !message.trim()}
        >
          <MessageSquare className="mr-2" />
          {isUpdating ? "Updating..." : "Update Slide"}
        </Button>
      </form>
    </div>
  );
};

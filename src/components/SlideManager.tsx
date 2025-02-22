import { useState, useRef } from 'react';
import { Slide } from '@/types/slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  MoveUp, 
  MoveDown, 
  Trash2,
  FileUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ImageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'Image must be less than 5MB')
    .refine(file => ALLOWED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .png, .webp and .gif formats are supported'),
});

interface SlideManagerProps {
  slides: Slide[];
  onSlidesChange: (slides: Slide[]) => void;
  currentSlide: number;
  onSlideSelect: (index: number) => void;
}

export const SlideManager = ({
  slides,
  onSlidesChange,
  currentSlide,
  onSlideSelect,
}: SlideManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Slides</h3>
        <div className="flex gap-2">
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
            <span className="ml-2">Import</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={addNewSlide}
          >
            <Plus className="h-4 w-4" />
            <span className="ml-2">Add Slide</span>
          </Button>
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

      <div className="space-y-2">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              currentSlide === index ? "border-orange-500 bg-orange-50" : "border-gray-200"
            )}
          >
            <div
              className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden"
              onClick={() => onSlideSelect(index)}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0" onClick={() => onSlideSelect(index)}>
              <h4 className="font-medium truncate">{slide.title}</h4>
              <p className="text-sm text-gray-500 truncate">{slide.body}</p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSlide(index, 'up')}
                disabled={index === 0}
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSlide(index, 'down')}
                disabled={index === slides.length - 1}
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSlide(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 
import { Slide } from '@/types/slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useState, useRef } from 'react';
import { z } from 'zod';

const INPUT_STYLES = "bg-white/80 border-orange-100/30 focus:border-orange-500/30 focus:ring-orange-500/20";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ImageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= MAX_FILE_SIZE, 'Image must be less than 5MB')
    .refine(file => ALLOWED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .png, .webp and .gif formats are supported'),
});

interface SlideEditorProps {
  slide: Slide;
  onSlideUpdate: (updatedSlide: Slide) => void;
  onGenerateImage?: (description: string) => Promise<string>;
  isGenerating?: boolean;
}

export const SlideEditor = ({
  slide,
  onSlideUpdate,
  onGenerateImage,
  isGenerating = false,
}: SlideEditorProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      // Validate file
      ImageUploadSchema.parse({ file });

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onSlideUpdate({
          ...slide,
          imageUrl: base64String,
          // Clear AI image description when uploading custom image
          ai_image_description: ""
        });
        setIsUploading(false);
        toast({
          title: "Image Uploaded",
          description: "Your image has been added to the slide",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="slideTitle" className="block text-sm font-medium mb-2 text-gray-700">
          Title
        </label>
        <Input
          id="slideTitle"
          value={slide.title}
          onChange={(e) => {
            onSlideUpdate({
              ...slide,
              title: e.target.value
            });
          }}
          className={cn("text-lg font-medium", INPUT_STYLES)}
        />
      </div>

      <div>
        <label htmlFor="slideBody" className="block text-sm font-medium mb-2 text-gray-700">
          Content
        </label>
        <Textarea
          id="slideBody"
          value={slide.body}
          onChange={(e) => {
            onSlideUpdate({
              ...slide,
              body: e.target.value
            });
          }}
          className={cn("min-h-[120px] resize-none text-base leading-relaxed", INPUT_STYLES)}
        />
      </div>

      <div>
        <label htmlFor="slideNotes" className="block text-sm font-medium mb-2 text-gray-700">
          Presenter Notes
        </label>
        <Textarea
          id="slideNotes"
          value={slide.notes || ""}
          onChange={(e) => {
            onSlideUpdate({
              ...slide,
              notes: e.target.value
            });
          }}
          className={cn("min-h-[100px] resize-none", INPUT_STYLES)}
          placeholder="Add notes for the presenter..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Slide Image
          </label>
          {slide.imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                onSlideUpdate({
                  ...slide,
                  imageUrl: null,
                  ai_image_description: ""
                });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Remove Image
            </Button>
          )}
        </div>

        {slide.imageUrl && (
          <div className="mb-4 relative rounded-lg overflow-hidden border border-gray-200">
            <img
              src={slide.imageUrl}
              alt="Slide"
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = ''; // Reset input
              }}
            />
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Image
            </Button>
          </div>

          {onGenerateImage && (
            <div className="space-y-2">
              <Textarea
                value={slide.ai_image_description || ""}
                onChange={(e) => {
                  onSlideUpdate({
                    ...slide,
                    ai_image_description: e.target.value
                  });
                }}
                className={cn("min-h-[80px] resize-none", INPUT_STYLES)}
                placeholder="Describe the image you want AI to generate..."
              />
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-sm"
                onClick={async () => {
                  if (!slide.ai_image_description || !onGenerateImage) return;
                  const newImageUrl = await onGenerateImage(slide.ai_image_description);
                  onSlideUpdate({
                    ...slide,
                    imageUrl: newImageUrl
                  });
                }}
                disabled={!slide.ai_image_description || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  "Generate image with FlamSlide Image AI"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
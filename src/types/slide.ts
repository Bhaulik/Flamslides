import { z } from 'zod';

// Base slide schema
export const SlideContent = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Content is required"),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  ai_image_description: z.string().optional()
});

// Theme schema
export const ThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
});

// Presentation schema
export const PresentationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slides: z.array(SlideContent).min(1, "At least one slide is required"),
  theme: ThemeSchema.optional(),
});

// Request schema
export const PresentationRequest = z.object({
  topic: z.string().min(1, "Topic is required"),
  description: z.string().min(1, "Description is required"),
  numberOfSlides: z.number().min(1).max(10),
  duration: z.number().min(1).max(30),
  style: z.enum(['professional', 'casual', 'academic']).default('professional'),
});

// TypeScript types
export type Slide = z.infer<typeof SlideContent>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Presentation = z.infer<typeof PresentationSchema>;
export type PresentationRequestType = z.infer<typeof PresentationRequest>;

// OpenAI schema helper
export const openAIResponseSchema = {
  name: "presentation_response",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      slides: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            notes: { type: "string" },
            imageUrl: { type: "string" },
            ai_image_description: { type: "string" }
          },
          required: ["title", "body"]
        }
      },
      theme: {
        type: "object",
        properties: {
          primary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
          secondary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
          background: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }
        },
        required: ["primary", "secondary", "background"]
      }
    },
    required: ["title", "slides"]
  },
  strict: true
} as const;

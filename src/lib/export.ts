import pptxgen from "pptxgenjs";
import type { Slide } from "@/types/slide";

export async function exportToPowerPoint(slides: Slide[], title: string = "FlamSlides Presentation") {
  // Create a new PowerPoint presentation
  const pptx = new pptxgen();

  // Set presentation properties
  pptx.author = "FlamSlides";
  pptx.title = title;
  pptx.subject = "Generated with FlamSlides";

  // Define common slide layout
  const TITLE_STYLE = {
    fontSize: 36,
    color: "363636",
    bold: true,
    fontFace: "Arial",
    align: "left" as const,
  };

  const BODY_STYLE = {
    fontSize: 18,
    color: "666666",
    fontFace: "Arial",
    align: "left" as const,
    breakLine: true,
  };

  const NOTES_STYLE = {
    fontSize: 12,
    color: "666666",
    fontFace: "Arial",
  };

  // Process each slide
  for (const slide of slides) {
    const pptSlide = pptx.addSlide();

    // Add background color (simplified due to pptxgenjs limitations)
    pptSlide.background = { color: "FFFFFF" };

    // Add title
    pptSlide.addText(slide.title, {
      ...TITLE_STYLE,
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 1,
    });

    // Add body text
    pptSlide.addText(slide.body, {
      ...BODY_STYLE,
      x: 0.5,
      y: 2,
      w: "45%",
      h: 3,
    });

    // Add image if available
    if (slide.imageUrl) {
      try {
        // For base64 images
        if (slide.imageUrl.startsWith('data:image')) {
          pptSlide.addImage({
            data: slide.imageUrl,
            x: "55%",
            y: 2,
            w: "40%",
            h: 3,
          });
        } else {
          // For URL images
          pptSlide.addImage({
            path: slide.imageUrl,
            x: "55%",
            y: 2,
            w: "40%",
            h: 3,
          });
        }
      } catch (error) {
        console.error("Failed to add image to slide:", error);
      }
    }

    // Add notes if available
    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  // Save the presentation
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
} 
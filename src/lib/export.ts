import pptxgen from "pptxgenjs";
import type { Slide } from "@/types/slide";

interface ExportProgress {
  status: string;
  current: number;
  total: number;
}

export async function exportToPowerPoint(
  slides: Slide[], 
  title: string = "FlamSlides Presentation",
  onProgress?: (progress: ExportProgress) => void
) {
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
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    onProgress?.({
      status: `Processing slide ${i + 1} of ${slides.length}`,
      current: i + 1,
      total: slides.length
    });

    const pptSlide = pptx.addSlide();

    // Add background color
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
        onProgress?.({
          status: `Adding image to slide ${i + 1}`,
          current: i + 1,
          total: slides.length
        });

        let imageData = slide.imageUrl;

        // If it's a URL (not base64), try to fetch it
        if (!slide.imageUrl.startsWith('data:')) {
          try {
            const response = await fetch(slide.imageUrl);
            const blob = await response.blob();
            imageData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.error('Failed to fetch image:', error);
            // Use a transparent placeholder if fetch fails
            imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
          }
        }

        pptSlide.addImage({
          data: imageData,
          x: "55%",
          y: 2,
          w: "40%",
          h: 3,
        });
      } catch (error) {
        console.error("Failed to add image to slide:", error);
        // Add a transparent placeholder
        pptSlide.addImage({
          data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          x: "55%",
          y: 2,
          w: "40%",
          h: 3,
        });
      }
    }

    // Add notes if available
    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  onProgress?.({
    status: "Generating PowerPoint file...",
    current: slides.length,
    total: slides.length
  });

  // Save the presentation
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
} 
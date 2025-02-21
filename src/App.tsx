import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { PresentationMode } from './components/PresentationMode';
import { createContext, useContext, useState } from 'react';
import type { Slide } from './types/slide';

const queryClient = new QueryClient();

interface SlidesContextType {
  slides: Slide[];
  setSlides: (slides: Slide[]) => void;
}

export const SlidesContext = createContext<SlidesContextType | null>(null);

export const useSlidesContext = () => {
  const context = useContext(SlidesContext);
  if (!context) {
    throw new Error('useSlidesContext must be used within a SlidesProvider');
  }
  return context;
};

function App() {
  const [slides, setSlides] = useState<Slide[]>([]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SlidesContext.Provider value={{ slides, setSlides }}>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route 
                path="/present" 
                element={
                  <PresentationMode 
                    slides={slides} 
                    initialSlide={Number(new URLSearchParams(window.location.search).get('slide')) || 0} 
                  />
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SlidesContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

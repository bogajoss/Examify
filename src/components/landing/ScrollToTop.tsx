"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        id="scrollToTopBtn"
        aria-label="উপরে যান"
        onClick={scrollToTop}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg bg-primary/90 text-primary-foreground backdrop-blur-xs hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-300",
          isVisible
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-80 translate-y-5 pointer-events-none",
        )}
      >
        <ArrowUp className="h-6 w-6" />
      </Button>
    </div>
  );
}

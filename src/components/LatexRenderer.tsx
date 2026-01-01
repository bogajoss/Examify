import React, { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
// @ts-expect-error - KaTeX auto-render types not available
import renderMathInElement from "katex/dist/contrib/auto-render";

interface LatexRendererProps {
  html: string;
  className?: string;
}

export default function LatexRenderer({ html, className }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && html) {
      // Remove any color attribute from font tags as a fallback for existing data
      const processedHtml = html.replace(
        /<font\b([^>]*?)\bcolor\s*=\s*["']?[^"'>]*?["']?([^>]*?)>/gi,
        "<font$1$2>",
      );

      containerRef.current.innerHTML = processedHtml;

      // Add download protection to all images
      const images = containerRef.current.querySelectorAll("img");
      images.forEach((img) => {
        img.addEventListener("contextmenu", (e) => e.preventDefault());
        img.addEventListener("dragstart", (e) => e.preventDefault());
        img.style.userSelect = "none";
      });

      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    } else if (containerRef.current && !html) {
      containerRef.current.innerHTML = ""; // Clear the container if no html
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`latex-content ${className || ""}`}
      style={{
        display: "block",
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        overflowWrap: "break-word",
        wordWrap: "break-word",
      }}
    />
  );
}

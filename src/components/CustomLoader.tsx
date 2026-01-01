"use client";

import { useEffect, useState } from "react";
import "./CustomLoader.css";

interface CustomLoaderProps {
  message?: string;
  minimal?: boolean;
}

export function CustomLoader({
  message = "লোড হচ্ছে...",
  minimal = false,
}: CustomLoaderProps) {
  const [loaderType, setLoaderType] = useState<"circle" | "triangle" | "rect">(
    "circle",
  );

  useEffect(() => {
    const types: Array<"circle" | "triangle" | "rect"> = [
      "circle",
      "triangle",
      "rect",
    ];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setLoaderType(randomType);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center ${minimal ? "py-0 gap-2" : "py-8 gap-4"}`}
    >
      {loaderType === "circle" && (
        <div className={`loader ${minimal ? "scale-50" : ""}`}>
          <svg viewBox="0 0 80 80">
            <circle r="32" cy="40" cx="40" id="test"></circle>
          </svg>
        </div>
      )}

      {loaderType === "triangle" && (
        <div className={`loader triangle ${minimal ? "scale-50" : ""}`}>
          <svg viewBox="0 0 86 80">
            <polygon points="43 8 79 72 7 72"></polygon>
          </svg>
        </div>
      )}

      {loaderType === "rect" && (
        <div className={`loader ${minimal ? "scale-50" : ""}`}>
          <svg viewBox="0 0 80 80">
            <rect height="64" width="64" y="8" x="8"></rect>
          </svg>
        </div>
      )}

      {!minimal && message && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
}

export default CustomLoader;

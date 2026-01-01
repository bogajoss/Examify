"use client";

import React, { useState } from "react";
import { LucideIcon } from "lucide-react";

interface AnimatedIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function AnimatedIconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className = "",
}: AnimatedIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className={`
        font-inherit text-[16px] bg-[#212121] text-white 
        flex items-center cursor-pointer border-none rounded-[15px] font-extrabold 
        transition-colors duration-300 active:scale-95
        px-[1em] py-[0.7em] pl-[0.9em]
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:bg-black
        ${className}
      `}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="svg-wrapper-1">
        <div
          className={`
            svg-wrapper transition-transform duration-[500ms] linear 
            ${isHovered ? "scale-125" : ""}
          `}
        >
          <Icon
            className={`
              h-[30px] w-[30px] block transition-all duration-300 ease-in-out
              ${
                isHovered
                  ? "translate-x-[1.2em] scale-110 fill-white"
                  : "fill-[rgb(155,153,153)]"
              }
            `}
            fill={isHovered ? "white" : "rgb(155, 153, 153)"}
          />
        </div>
      </div>

      <span
        className={`
          block ml-[0.3em] transition-all duration-500 linear 
          ${isHovered ? "opacity-0" : ""}
        `}
      >
        {label}
      </span>
    </button>
  );
}

"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoItem {
  icon?: React.ElementType;
  label?: string;
  value: ReactNode;
  className?: string;
}

interface UniversalDetailsCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;

  // Header: Either Image or Custom Content (Gradient/Color)
  imageSrc?: string | null;
  // If imageSrc is NOT provided, this renders in the header area.
  // If imageSrc IS provided, this renders ON TOP or below?
  // Convention: If imageSrc, headerContent is ignored or overlay.
  // Let's assume headerContent replaces image if image is missing.
  headerContent?: ReactNode;
  headerClassName?: string;

  // Badges next to Title
  badges?: ReactNode;

  // Main Content
  info?: InfoItem[];

  // Footer
  actions?: ReactNode;
  actionsClassName?: string; // e.g. "grid grid-cols-2 gap-2"

  // Styling
  className?: string;
  contentClassName?: string;

  // Interaction
  onClick?: () => void;
}

export function UniversalDetailsCard({
  title,
  subtitle,
  imageSrc,
  headerContent,
  headerClassName,
  badges,
  info,
  actions,
  actionsClassName,
  className,
  contentClassName,
  onClick,
}: UniversalDetailsCardProps) {
  const isBase64 = imageSrc?.startsWith("data:image");

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 bg-white dark:bg-neutral-950 flex flex-col h-full border border-neutral-200 dark:border-neutral-800",
        onClick && "cursor-pointer hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      {/* Header Section */}
      {imageSrc ? (
        <div
          className={cn(
            "relative aspect-[16/9] w-full bg-muted",
            headerClassName,
          )}
        >
          {isBase64 ? (
            <img
              src={imageSrc}
              alt={typeof title === "string" ? title : "Card Image"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={imageSrc}
              alt={typeof title === "string" ? title : "Card Image"}
              fill
              className="object-cover"
              priority={false}
            />
          )}
        </div>
      ) : headerContent ? (
        <div
          className={cn(
            "border-b border-neutral-200 dark:border-neutral-800",
            headerClassName,
          )}
        >
          {headerContent}
        </div>
      ) : null}

      {/* Content Section */}
      <CardContent className={cn("p-4 space-y-3 flex-grow", contentClassName)}>
        {/* Title & Subtitle (Only if provided) */}
        {(title || subtitle || badges) && (
          <div>
            <div className="flex items-start justify-between gap-2">
              {title && (
                <div className="font-semibold text-lg line-clamp-2 leading-tight flex-1">
                  {title}
                </div>
              )}
              {badges && (
                <div className="flex flex-wrap gap-1 shrink-0">{badges}</div>
              )}
            </div>

            {subtitle && (
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                {subtitle}
              </div>
            )}
          </div>
        )}

        {/* Info Items List */}
        {info && info.length > 0 && (
          <div className="space-y-2 text-sm pt-1">
            {info.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex justify-between items-center",
                  item.className,
                )}
              >
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </span>
                <span className="font-medium text-right">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer / Actions */}
      {actions && (
        <CardFooter
          className={cn(
            "p-4 pt-0 border-t-0 mt-auto w-full",
            actionsClassName || "flex gap-2",
          )}
        >
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}

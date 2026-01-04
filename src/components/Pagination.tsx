"use client";

import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  label?: string;
  showNumbers?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = "আইটেম",
  showNumbers = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const renderPageNumbers = () => {
    if (!showNumbers) return null;

    const maxVisible = 5;

    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return (
      <div className="flex gap-1">
        {start > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-9 h-9 p-0"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {start > 2 && <span className="px-1 self-end">...</span>}
          </>
        )}

        {Array.from({ length: end - start + 1 }).map((_, i) => {
          const p = start + i;
          return (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "outline"}
              size="sm"
              className="w-9 h-9 p-0"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          );
        })}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 self-end">...</span>}
            <Button
              variant="outline"
              size="sm"
              className="w-9 h-9 p-0"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-sm font-medium text-muted-foreground">
        পৃষ্ঠা {currentPage} / {totalPages} (মোট {totalItems} টি {label})
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> আগের
        </Button>

        {renderPageNumbers()}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalItems === 0}
        >
          পরবর্তী <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

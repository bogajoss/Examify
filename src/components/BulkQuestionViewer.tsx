"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LatexRenderer from "@/components/LatexRenderer";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[] | null;
}
export default function BulkQuestionViewer({
  open,
  onOpenChange,
  questions,
}: Props) {
  const [mode, setMode] = React.useState<"question" | "solution">("question");

  React.useEffect(() => {
    // Reset to question only when closed
    if (!open) setMode("question");
  }, [open]);

  React.useEffect(() => {
    // autoPrint removed — printing handled elsewhere if needed
    if (open) {
      // keep current behavior of resetting mode on open
    }
  }, [open]);

  // printing removed: printable HTML and window.print are no longer used

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-xl opacity-5 pointer-events-none select-none z-0">
          <img src="/icon.png" alt="watermark" className="w-full h-auto" />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle>সকল প্রশ্ন দেখুন</DialogTitle>
          <DialogDescription>
            এখানে আপনি সকল প্রশ্ন শুধুমাত্র বা সমাধান সহ দেখতে পারবেন।
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mt-2 mb-4 gap-2 flex-wrap relative z-10">
          <div className="flex gap-2 items-center">
            <Button
              variant={mode === "question" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("question")}
            >
              শুধু প্রশ্ন
            </Button>

            <Button
              variant={mode === "solution" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("solution")}
            >
              সম্পূর্ণ সমাধান
            </Button>

            {/* Print removed */}
          </div>
          <div className="text-sm text-muted-foreground">
            ({questions?.length || 0} টি প্রশ্ন)
          </div>
        </div>

        <div
          className={cn(
            "prose dark:prose-invert max-w-none p-4 rounded-md border space-y-6 max-h-[60vh] overflow-y-auto relative z-10",
            mode === "question" ? "bg-white/50" : "bg-muted/10",
          )}
        >
          {questions && questions.length > 0 ? (
            questions.map((q, idx) => (
              <div key={q.id || idx} className="border-b pb-6 last:border-b-0">
                <div className="mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <strong className="text-lg">প্রশ্ন {idx + 1}.</strong>
                    {(q.subject || q.paper || q.chapter || q.highlight) && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.subject && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200 font-normal"
                          >
                            {q.subject as string}
                          </Badge>
                        )}
                        {q.paper && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-green-50 text-green-600 border-green-200 font-normal"
                          >
                            {q.paper as string}
                          </Badge>
                        )}
                        {q.chapter && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-purple-50 text-purple-600 border-purple-200 font-normal"
                          >
                            {q.chapter as string}
                          </Badge>
                        )}
                        {q.highlight && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-200 font-normal"
                          >
                            {q.highlight as string}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <LatexRenderer html={q.question || q.question_text || ""} />
                  </div>
                  {q.question_image_url && (
                    <div className="my-3 rounded-lg overflow-hidden border border-border bg-muted/30 max-w-md">
                      <img
                        src={q.question_image_url as string}
                        alt="Question"
                        className="max-w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Options - show options in question-only view as well */}
                {q.options && (
                  <div className="mt-3 space-y-2 ml-4">
                    {Array.isArray(q.options)
                      ? (q.options as unknown as string[]).map(
                          (opt: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="font-semibold">
                                {String.fromCharCode(65 + i)}.
                              </div>
                              <div className="flex-1">
                                <LatexRenderer html={String(opt)} />
                              </div>
                            </div>
                          ),
                        )
                      : null}

                    {/* Answer & explanation - show only in solution or print mode */}
                    {mode === "solution" && (
                      <>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <strong>উত্তর:</strong>
                          <span className="ml-2">
                            {typeof q.answer === "number"
                              ? String.fromCharCode(65 + Number(q.answer))
                              : String(q.answer)}
                          </span>
                        </div>

                        {(q.explanation || q.explanation_image_url) && (
                          <div className="mt-3">
                            <strong>ব্যাখ্যা:</strong>
                            {q.explanation && (
                              <div className="mt-1 text-sm">
                                <LatexRenderer html={q.explanation} />
                              </div>
                            )}
                            {q.explanation_image_url && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-border bg-muted/30 max-w-md">
                                <img
                                  src={q.explanation_image_url as string}
                                  alt="Explanation"
                                  className="max-w-full h-auto"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">কোনো প্রশ্ন নেই</p>
          )}
        </div>

        <div className="flex justify-end mt-4 gap-2 relative z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            বন্ধ করুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

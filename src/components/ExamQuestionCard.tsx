"use client";

import React from "react";
import type { Question } from "@/lib/types";
import { RadioGroup } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOUCH_TARGETS } from "@/lib/examConstants";
import LatexRenderer from "@/components/LatexRenderer";

interface Props {
  question: Question;
  globalIndex: number; // absolute index for numbering
  selectedAnswer?: number | undefined;
  onSelect: (questionId: string, optionIndex: number) => void;
}

export default function ExamQuestionCard({
  question,
  globalIndex,
  selectedAnswer,
  onSelect,
}: Props) {
  return (
    <Card id={`question-${question.id}`} className="mb-6">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="font-semibold">
            প্রশ্ন {globalIndex + 1}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-3">
        <div className="text-base">
          <LatexRenderer html={question.question || ""} />
        </div>

        {question.question_image_url && (
          <div className="my-4 rounded-lg overflow-hidden border border-border bg-muted/30">
            <img
              src={question.question_image_url}
              alt="Question"
              className="max-w-full h-auto mx-auto"
              loading="lazy"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ userSelect: "none" }}
            />
          </div>
        )}

        <RadioGroup
          value={
            question.id && selectedAnswer !== undefined
              ? String(selectedAnswer)
              : ""
          }
          onValueChange={(value) =>
            onSelect(question.id || "", parseInt(value))
          }
        >
          <div className="space-y-3">
            {(Array.isArray(question.options)
              ? question.options
              : Object.values(
                  question.options || ({} as Record<string, string>),
                )
            ).map((option: string, optionIndex: number) => {
              const bengaliLetters = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
              const letter =
                bengaliLetters[optionIndex] ||
                String.fromCharCode(65 + optionIndex);

              return (
                <label
                  key={optionIndex}
                  className={`flex items-start space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[${TOUCH_TARGETS.normal}px] ${
                    selectedAnswer === optionIndex
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    <div
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                        selectedAnswer === optionIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-muted/30 text-foreground"
                      }`}
                    >
                      {letter}
                    </div>
                  </div>

                  <input
                    type="radio"
                    value={optionIndex.toString()}
                    id={`q${question.id}-o${optionIndex}`}
                    checked={selectedAnswer === optionIndex}
                    onChange={() => onSelect(question.id || "", optionIndex)}
                    className="hidden"
                  />

                  <div className="flex-1 min-w-0 text-sm md:text-base font-medium break-words pt-1">
                    <LatexRenderer html={option} />
                  </div>
                </label>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

"use client";

import type { Exam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, HelpCircle, ListChecks } from "lucide-react";
import LatexRenderer from "@/components/LatexRenderer";

interface ExamInstructionsProps {
  exam: Exam | null;
  onStartExam: () => void;
  questionCount: number;
}

export function ExamInstructions({
  exam,
  onStartExam,
  questionCount,
}: ExamInstructionsProps) {
  if (!exam) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {exam.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <LatexRenderer html={exam.description || ""} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">বিষয়</p>
                <p>{exam.course_name || "সাধারণ"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <ListChecks className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">প্রশ্ন সংখ্যা</p>
                <p>{questionCount} টি</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">সময়</p>
                <p>{exam.duration_minutes} মিনিট</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">নেগেটিভ মার্ক</p>
                <p>{exam.negative_marks_per_wrong || 0} প্রতি ভুল উত্তরে</p>
              </div>
            </div>
          </div>
          <Button
            onClick={onStartExam}
            className="w-full h-12 text-lg font-bold"
          >
            পরীক্ষা শুরু করুন
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

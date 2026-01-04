"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { fetchQuestions, type RawQuestion } from "@/lib/fetchQuestions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CustomLoader } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Exam, Question, SubjectConfig } from "@/lib/types";
import {
  QUESTIONS_PER_PAGE,
  QUESTIONS_PER_PAGE_MOBILE,
  CRITICAL_TIME_THRESHOLD,
  TIMER_CLASSES,
  BREAKPOINTS,
} from "@/lib/examConstants";
import { ExamInstructions } from "@/components/ExamInstruction";
import LatexRenderer from "@/components/LatexRenderer";
import {
  Clock,
  Flag,
  ArrowLeft,
  Eye,
  ArrowRight,
  Send,
  CheckCircle2,
  BookOpen,
  Zap,
  ListChecks,
  HelpCircle,
} from "lucide-react";
import { cn, validateExamTime, formatExamDateTime } from "@/lib/utils";
import dayjs, { formatDate } from "@/lib/date-utils";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const subjectsMap: { [key: string]: string } = {
  p: "পদার্থবিজ্ঞান",
  c: "রসায়ন",
  m: "উচ্চতর গণিত",
  b: "জীববিজ্ঞান",
  bm: "জীববিজ্ঞান + উচ্চতর গণিত",
  bn: "বাংলা",
  e: "ইংরেজী",
  i: "আইসিটি",
  gk: "জিকে",
  iq: "আইকিউ",
};

const getSubjectName = (id: string) => subjectsMap[id] || id;

function SubjectSelectionScreen({
  exam,
  onStart,
  questionCount,
}: {
  exam: Exam;
  onStart: (selectedSubjects: string[]) => void;
  questionCount: number;
}) {
  const mandatorySubjects = (exam.mandatory_subjects as SubjectConfig[]) || [];
  const optionalSubjects = (exam.optional_subjects as SubjectConfig[]) || [];
  const totalSubjectsToAnswer = exam.total_subjects || 0;

  const numMandatory = mandatorySubjects.length;
  const numToSelectFromOptional = Math.max(
    0,
    totalSubjectsToAnswer - numMandatory,
  );

  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);

  const handleOptionalSelect = (subjectId: string) => {
    setSelectedOptional((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((s) => s !== subjectId);
      }
      if (
        numToSelectFromOptional > 0 &&
        prev.length < numToSelectFromOptional
      ) {
        return [...prev, subjectId];
      }
      return prev;
    });
  };

  // If no optional subjects need to be selected (e.g. total_subjects covered by mandatory), allow start
  const canStart = selectedOptional.length === numToSelectFromOptional;

  const handleStartClick = () => {
    if (canStart && examTimeStatus.isValid) {
      onStart([
        ...mandatorySubjects.map((s) => (typeof s === "string" ? s : s.id)),
        ...selectedOptional,
      ]);
    }
  };

  const parseDateField = (keys: string[]) => {
    const examRecord = exam as Record<string, unknown> | null;
    for (const k of keys) {
      const v = examRecord ? examRecord[k] : undefined;
      if (!v) continue;

      let d = dayjs(String(v));

      // If it's a space-separated datetime (MySQL format), parse it
      if (
        !d.isValid() ||
        (typeof v === "string" && v.includes(" ") && !v.includes("T"))
      ) {
        d = dayjs(String(v), "YYYY-MM-DD HH:mm:ss");
      }

      // If it's an ISO string, parse and convert to local (display) time
      if (d.isValid()) {
        return d.toDate();
      }
    }
    return null;
  };

  const startDate = parseDateField([
    "start_at",
    "start_time",
    "starts_at",
    "start",
    "startDate",
  ]);
  const endDate = parseDateField([
    "end_at",
    "end_time",
    "ends_at",
    "end",
    "endDate",
  ]);
  let isPractice = exam?.is_practice;

  // Auto-convert to practice mode if exam time has expired
  const now = dayjs.utc();
  const currentEndDate = exam?.end_at ? dayjs.utc(exam.end_at) : null;
  if (!isPractice && currentEndDate && now.isAfter(currentEndDate)) {
    isPractice = true; // Auto-enable practice mode after exam ends
  }

  // Check if exam is within valid time window
  const getExamTimeStatus = () => {
    if (isPractice) return { isValid: true, message: "" };

    const now = dayjs.utc();
    const start = startDate ? dayjs.utc(startDate) : null;
    const end = endDate ? dayjs.utc(endDate) : null;

    if (!start && !end) return { isValid: true, message: "" };

    if (start && now.isBefore(start)) {
      return {
        isValid: false,
        message: `পরীক্ষা এখনো শুরু হয়নি। শুরু হবে ${formatDate(startDate, "DD MMMM YYYY, hh:mm A")} এ।`,
      };
    }

    if (end && now.isAfter(end)) {
      return {
        isValid: false,
        message: `পরীক্ষার সময় শেষ হয়ে গেছে। সময় ছিল ${formatDate(endDate, "DD MMMM YYYY, hh:mm A")} পর্যন্ত।`,
      };
    }

    return { isValid: true, message: "" };
  };

  const examTimeStatus = getExamTimeStatus();

  const getSubjectDisplayName = (s: string | SubjectConfig) => {
    if (typeof s === "string") return getSubjectName(s);
    return s.name || getSubjectName(s.id);
  };

  return (
    <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">
            {exam.name}
          </CardTitle>
          <CardDescription className="text-center">
            অনুগ্রহ করে আপনার বিষয় নির্বাচন করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center text-center gap-2">
                <div>
                  {isPractice ? (
                    <div className="text-sm font-semibold">
                      এটি একটি প্রাকটিস পরীক্ষা — আনলিমিটেড প্রবেশাধিকার
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {startDate && (
                        <div>
                          <strong>শুরুর সময়:</strong>{" "}
                          {formatDate(startDate, "DD MMMM YYYY, hh:mm A")}
                        </div>
                      )}
                      {endDate && (
                        <div>
                          <strong>সম্ভাব্য শেষ সময়:</strong>{" "}
                          {formatDate(endDate, "DD MMMM YYYY, hh:mm A")}
                        </div>
                      )}
                      {!startDate && !endDate && (
                        <div>
                          এই পরীক্ষার কোনো নির্দিষ্ট সময়সীমা সেট করা হয়নি।
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm">
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

          {numMandatory > 0 && (
            <div>
              <h3 className="font-semibold mb-2">বাধ্যতামূলক বিষয়</h3>
              <div className="flex flex-wrap gap-2">
                {mandatorySubjects.map((sub) => (
                  <Badge
                    key={typeof sub === "string" ? sub : sub.id}
                    variant="secondary"
                  >
                    {getSubjectDisplayName(sub)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {optionalSubjects.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm md:text-base">
                ঐচ্ছিক বিষয়{" "}
                {numToSelectFromOptional > 0
                  ? `(যেকোনো ${numToSelectFromOptional}টি)`
                  : "(প্রয়োজন নেই)"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {optionalSubjects.map((sub) => {
                  const subId = typeof sub === "string" ? sub : sub.id;
                  const isChecked = selectedOptional.includes(subId);
                  const isDisabled =
                    !isChecked &&
                    selectedOptional.length >= numToSelectFromOptional &&
                    numToSelectFromOptional > 0;
                  return (
                    <label
                      key={subId}
                      className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        isChecked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                          : isDisabled
                            ? "opacity-50 cursor-not-allowed border-muted"
                            : "border-muted hover:border-primary/30"
                      }`}
                    >
                      <Checkbox
                        id={subId}
                        checked={isChecked}
                        onCheckedChange={() => handleOptionalSelect(subId)}
                        disabled={isDisabled}
                        className="rounded-md"
                      />
                      <span
                        className={`text-sm md:text-base font-medium flex-1 min-w-0 break-words ${isDisabled ? "text-muted-foreground" : ""}`}
                      >
                        {getSubjectDisplayName(sub)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {!examTimeStatus.isValid && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive font-semibold text-sm">
                ⏱️ {examTimeStatus.message}
              </p>
            </div>
          )}

          <Button
            onClick={handleStartClick}
            disabled={!canStart || !examTimeStatus.isValid}
            className="w-full h-12 text-lg font-bold"
          >
            {!examTimeStatus.isValid
              ? "পরীক্ষার সময় নয়"
              : "পরীক্ষা শুরু করুন"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authContextLoading } = useAuth();
  const exam_id = params.exam_id as string;
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: number;
  }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [orderedSubjects, setOrderedSubjects] = useState<string[]>([]);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const questionsPerPage = isMobile
    ? QUESTIONS_PER_PAGE_MOBILE
    : QUESTIONS_PER_PAGE;

  // Get unique subjects and filter questions
  const uniqueSubjects = useMemo(() => {
    if (orderedSubjects.length > 0) return orderedSubjects;
    const subjects = new Set<string>();
    allQuestions.forEach((q) => {
      if (q.subject) {
        subjects.add(q.subject);
      }
    });
    return Array.from(subjects).sort();
  }, [allQuestions, orderedSubjects]);

  // Filter questions based on selected subject
  const filteredQuestions = useMemo(() => {
    if (selectedSubject === "all") {
      // If custom exam with subjects, showing "all" might violate the separation rule
      // But we keep it as fallback or if specifically set.
      return questions;
    }
    // Match logic: Subject ID vs Question Subject
    // Question.subject usually stores the name "physics" or ID "p"?
    // fetchQuestions usually maps it.
    // Let's assume strict matching for now, or use the subjectsMap to check.
    return questions.filter((q) => {
      if (q.subject === selectedSubject) return true;
      // Also check if mapped name matches
      if (subjectsMap[selectedSubject] === q.subject) return true;
      // Or reverse
      const key = Object.keys(subjectsMap).find(
        (k) => subjectsMap[k] === q.subject,
      );
      if (key === selectedSubject) return true;

      return false;
    });
  }, [questions, selectedSubject]);

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = currentPageIndex * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentPageQuestions = filteredQuestions.slice(startIndex, endIndex);

  const handleStartCustomExam = (selectedSubjectIds: string[]) => {
    if (!exam) return;

    // Helper to find config for a subject ID
    const findConfig = (id: string) => {
      const mandatory = exam.mandatory_subjects as (string | SubjectConfig)[];
      const optional = exam.optional_subjects as (string | SubjectConfig)[];

      const m = mandatory?.find(
        (s) => (typeof s === "string" ? s : s.id) === id,
      );
      if (m) return typeof m === "string" ? { id: m } : m;

      const o = optional?.find(
        (s) => (typeof s === "string" ? s : s.id) === id,
      );
      if (o) return typeof o === "string" ? { id: o } : o;
      return null;
    };
    let selectedQuestions: Question[] = [];
    const subjectsOrder: string[] = [];

    selectedSubjectIds.forEach((subId) => {
      const config = findConfig(subId);
      // Map ID to subject name for display/filtering
      // If the backend stores full names in question.subject, we need to map 'p' -> 'Physics'
      // If we used QuestionSelector with specific IDs, we can match by ID.

      let subjectQuestions: Question[] = [];

      if (config && config.question_ids && config.question_ids.length > 0) {
        // Priority: Use specific question IDs from config
        const ids = config.question_ids;
        subjectQuestions = allQuestions.filter(
          (q) => q.id && ids.includes(q.id),
        );
      } else {
        // Fallback: Filter by subject tag
        // Try both ID and mapped name
        const subjectName = subjectsMap[subId] || subId;
        subjectQuestions = allQuestions.filter(
          (q) => q.subject === subId || q.subject === subjectName,
        );

        // If config has count, limit it?
        if (config && config.count) {
          subjectQuestions = subjectQuestions.slice(0, config.count);
        }
      }

      // Tag them with the subject ID/Name for grouping
      // We use the mapped name for display if available, or just the ID.
      // Actually uniqueSubjects uses question.subject.
      // We should ensure question.subject aligns with what we want to display.
      // If question.subject is "Physics" and we selected "p", uniqueSubjects will show "Physics".
      // But if we want to enforce order, we should know which subject is which.

      if (subjectQuestions.length > 0) {
        // Determine the display name for this subject section
        // We use the mapped name (e.g. "পদার্থবিজ্ঞান") if available, otherwise the ID.
        // We do NOT rely on question.subject because it might vary or be inconsistent.
        const displayName = config?.name || subjectsMap[subId] || subId;

        // Override the subject property of the questions to match the section display name.
        // This ensures they are correctly filtered and grouped under this tab.
        subjectQuestions = subjectQuestions.map((q) => ({
          ...q,
          subject: displayName,
        }));

        // Shuffle within the section if enabled
        if (exam.shuffle_questions) {
          subjectQuestions = shuffleArray(subjectQuestions);
        }

        if (!subjectsOrder.includes(displayName)) {
          subjectsOrder.push(displayName);
        }
        selectedQuestions = [...selectedQuestions, ...subjectQuestions];
      }
    });

    setQuestions(selectedQuestions);
    setOrderedSubjects(subjectsOrder);
    if (subjectsOrder.length > 0) {
      setSelectedSubject(subjectsOrder[0]);
    } else {
      setSelectedSubject("all");
    }
    // setTimeLeft handled by effect
    const now = dayjs().toISOString();
    setStartedAt(now);
    setExamStarted(true);

    if (user?.uid && exam_id) {
      // Record start in Supabase
      supabase
        .from("student_exams")
        .upsert(
          {
            exam_id: exam_id.toString(),
            student_id: user.uid,
            started_at: now,
          },
          { onConflict: "student_id,exam_id" },
        )
        .then(({ error }) => {
          if (error) console.error("Error recording exam start:", error);
        });
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // Check for next subject
      const currentSubjectIndex = uniqueSubjects.indexOf(selectedSubject);
      if (
        currentSubjectIndex !== -1 &&
        currentSubjectIndex < uniqueSubjects.length - 1
      ) {
        const nextSubject = uniqueSubjects[currentSubjectIndex + 1];
        setSelectedSubject(nextSubject);
        setCurrentPageIndex(0);
        window.scrollTo(0, 0);
        toast({
          title: "বিষয় পরিবর্তন",
          description: `পরবর্তী বিষয়: ${nextSubject}`,
        });
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    } else {
      // Check for prev subject
      const currentSubjectIndex = uniqueSubjects.indexOf(selectedSubject);
      if (currentSubjectIndex > 0) {
        const prevSubject = uniqueSubjects[currentSubjectIndex - 1];
        setSelectedSubject(prevSubject);
        // Go to last page of prev subject?
        // We need to calculate pages for that subject.
        // It's dynamic. Let's just go to page 0 for simplicity or calculate it.
        setCurrentPageIndex(0);
        window.scrollTo(0, 0);
      }
    }
  };

  const isLastPageOfExam =
    currentPageIndex === totalPages - 1 &&
    (selectedSubject === "all" ||
      uniqueSubjects.indexOf(selectedSubject) === uniqueSubjects.length - 1);

  const handleSubmitExam = useCallback(async () => {
    setIsSubmitting(true);
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalScore = 0;
    const responses: Record<string, unknown>[] = [];

    questions.forEach((q) => {
      const qId = String(q.id);
      const selectedOptIndex = selectedAnswers[qId];

      let qMarks = parseFloat(String(exam?.marks_per_question || 1));
      if (
        q.question_marks !== null &&
        q.question_marks !== undefined &&
        q.question_marks !== ""
      ) {
        const parsed = parseFloat(String(q.question_marks));
        if (!isNaN(parsed)) qMarks = parsed;
      }

      let qNeg = parseFloat(String(exam?.negative_marks_per_wrong || 0));
      if (isNaN(qNeg)) qNeg = 0;

      let marksObtained = 0;
      let isCorrect = false;

      if (selectedOptIndex !== undefined) {
        if (selectedOptIndex === q.answer) {
          correctAnswers++;
          totalScore += qMarks;
          marksObtained = qMarks;
          isCorrect = true;
        } else {
          wrongAnswers++;
          totalScore -= qNeg;
          marksObtained = -qNeg;
          isCorrect = false;
        }
      }

      responses.push({
        question_id: qId,
        selected_option:
          selectedOptIndex !== undefined ? String(selectedOptIndex) : null,
        is_correct: isCorrect ? 1 : 0,
        marks_obtained: marksObtained,
      });
    });

    if (user?.uid && exam_id) {
      try {
        const { data: seData, error: seError } = await supabase
          .from("student_exams")
          .upsert(
            {
              exam_id: exam_id.toString(),
              student_id: user.uid,
              score: Number(totalScore.toFixed(2)),
              correct_answers: correctAnswers,
              wrong_answers: wrongAnswers,
              unattempted:
                questions.length - Object.keys(selectedAnswers).length,
              started_at: startedAt,
              submitted_at: dayjs().toISOString(),
            },
            { onConflict: "student_id,exam_id" },
          )
          .select()
          .single();

        if (seError) throw seError;

        if (responses.length > 0 && seData) {
          const { error: resError } = await supabase
            .from("student_responses")
            .upsert(
              responses.map((r) => ({
                student_exam_id: seData.id,
                question_id: r.question_id,
                selected_option: r.selected_option,
                is_correct: r.is_correct === 1,
                marks_obtained: r.marks_obtained,
              })),
              { onConflict: "student_exam_id,question_id" },
            );

          if (resError) console.error("Error saving responses:", resError);
        }

        toast({ title: "পরীক্ষা জমা হয়েছে!" });
      } catch (err) {
        const error = err as Error;
        console.error("Error submitting exam:", error);
        toast({
          title: "ত্রুটি",
          description:
            "পরীক্ষা জমা দিতে সমস্যা হয়েছে: " + (error.message || ""),
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "পরীক্ষা সম্পন্ন হয়েছে",
        description:
          "যেহেতু আপনি লগইন করেননি, আপনার স্কোর সেভ করা হয়নি। তবে আপনি সমাধান দেখতে পারবেন।",
      });
    }

    if (exam_id) {
      const storageKey = user?.uid
        ? `exam_answers_${user.uid}_${exam_id}`
        : `exam_answers_anonymous_${exam_id}`;

      // Clear progress storage
      if (user?.uid) {
        localStorage.removeItem(`exam_static_${user.uid}_${exam_id}`);
        localStorage.removeItem(`exam_answers_prog_${user.uid}_${exam_id}`);
      }

      const dataToStore = {
        answers: selectedAnswers,
        score: totalScore,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        unattempted: questions.length - Object.keys(selectedAnswers).length,
        submitted_at: dayjs().toISOString(),
        started_at: startedAt,
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    }

    setSubmitted(true);
    const solveUrl = `/exams/${exam_id}/solve?${searchParams.toString()}`;
    router.push(solveUrl);
  }, [
    exam_id,
    exam,
    questions,
    selectedAnswers,
    user,
    toast,
    router,
    searchParams,
    startedAt,
  ]);

  // Restore exam progress
  useEffect(() => {
    if (!user?.uid || !exam_id || !exam) return;

    const staticKey = `exam_static_${user.uid}_${exam_id}`;
    const answersKey = `exam_answers_prog_${user.uid}_${exam_id}`;

    try {
      const staticDataStr = localStorage.getItem(staticKey);
      const answersDataStr = localStorage.getItem(answersKey);

      if (staticDataStr) {
        const staticData = JSON.parse(staticDataStr);
        if (staticData.questions) setQuestions(staticData.questions);
        if (staticData.orderedSubjects)
          setOrderedSubjects(staticData.orderedSubjects);
        if (staticData.endTime) setEndTime(staticData.endTime);
        if (staticData.startedAt) setStartedAt(staticData.startedAt);
        if (staticData.examStarted) setExamStarted(true);
        if (staticData.selectedSubject)
          setSelectedSubject(staticData.selectedSubject);
      }

      if (answersDataStr) {
        const answersData = JSON.parse(answersDataStr);
        if (answersData) setSelectedAnswers(answersData);
      }

      if (staticDataStr || answersDataStr) {
        toast({ title: "পরীক্ষা পুনরুদ্ধার করা হয়েছে" });
      }
    } catch (e) {
      console.error("Failed to restore progress", e);
    }
  }, [user?.uid, exam_id, exam]);

  // Save static progress (Questions, Order, EndTime)
  useEffect(() => {
    if (!user?.uid || !exam_id || !examStarted) return;
    const staticKey = `exam_static_${user.uid}_${exam_id}`;
    const data = {
      questions,
      orderedSubjects,
      endTime,
      startedAt,
      examStarted: true,
      selectedSubject,
    };
    localStorage.setItem(staticKey, JSON.stringify(data));
  }, [
    user?.uid,
    exam_id,
    examStarted,
    questions,
    orderedSubjects,
    endTime,
    selectedSubject,
  ]);

  // Save answers progress (Frequent)
  useEffect(() => {
    if (!user?.uid || !exam_id || !examStarted) return;
    const answersKey = `exam_answers_prog_${user.uid}_${exam_id}`;
    localStorage.setItem(answersKey, JSON.stringify(selectedAnswers));
  }, [user?.uid, exam_id, examStarted, selectedAnswers]);

  // Timer Logic
  useEffect(() => {
    if (
      !submitted &&
      !isSubmitting &&
      examStarted &&
      exam?.duration_minutes &&
      exam.duration_minutes > 0
    ) {
      // Initialize endTime if not set (First start)
      if (endTime === null) {
        // If we are here, it means we started the exam but haven't set an endTime yet (fresh start)
        // Check if there is a previously saved end time that we missed? (Should be caught by restore effect)
        // So we can safely set a new one.
        const durationMs = exam.duration_minutes * 60 * 1000;
        setEndTime(Date.now() + durationMs);
        return;
      }

      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          setTimeLeft(0);
          handleSubmitExam();
        } else {
          setTimeLeft(Math.floor(diff / 1000));
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);

      return () => clearInterval(timer);
    }
  }, [submitted, isSubmitting, examStarted, exam, endTime, handleSubmitExam]);

  const showTimeWarning = useMemo(() => {
    if (timeLeft === null || exam?.duration_minutes === undefined) return false;
    const tenPercentTime = exam.duration_minutes * 60 * 0.1;
    return timeLeft <= tenPercentTime && timeLeft > 60;
  }, [timeLeft, exam?.duration_minutes]);

  const showCriticalWarning = useMemo(() => {
    if (timeLeft === null) return false;
    return timeLeft <= 60;
  }, [timeLeft]);

  useEffect(() => {
    if (showTimeWarning) {
      setTimeout(
        () =>
          toast({
            title: "⏱️ সময় শেষ হওয়ার সতর্কতা",
            description: "মাত্র ১০% সময় বাকি আছে। দ্রুত উত্তর সম্পন্ন করুন।",
            variant: "destructive",
          }),
        0,
      );
    }
  }, [showTimeWarning, toast]);

  useEffect(() => {
    if (showCriticalWarning) {
      setTimeout(
        () =>
          toast({
            title: "🚨 জরুরি: সময় শেষ হতে চলেছে",
            description:
              "মাত্র ১ মিনিট বাকি। পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হবে।",
            variant: "destructive",
          }),
        0,
      );
    }
  }, [showCriticalWarning, toast]);

  useEffect(() => {
    if (
      !loading &&
      timeLeft === null &&
      exam?.duration_minutes &&
      examStarted &&
      !searchParams.get("start_custom") // Don't start timer automatically for normal exams
    ) {
      setTimeLeft(exam.duration_minutes * 60);
    }
  }, [loading, timeLeft, exam, examStarted, searchParams]);

  useEffect(() => {
    if (!exam_id) return;

    // Initial fetch
    fetchExam();
  }, [exam_id]);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (authContextLoading) return;

      setAuthLoading(true);

      try {
        if (!exam) {
          setIsAuthorized(null);
          return;
        }

        // Strictly require logged-in user
        if (!user?.uid || user.uid.startsWith("guest_")) {
          setIsAuthorized(false);
          return;
        }

        // If it's a practice exam, allow access to all logged-in users
        if (exam.is_practice) {
          setIsAuthorized(true);
          return;
        }

        // If exam doesn't have a batch, it's considered public for all logged-in users
        if (!exam.batch_id) {
          setIsAuthorized(true);
          return;
        }

        // Check if the batch is public via Supabase
        const { data: batchData } = await supabase
          .from("batches")
          .select("is_public")
          .eq("id", exam.batch_id)
          .single();

        if (batchData?.is_public) {
          setIsAuthorized(true);
          return;
        }

        // For private batches, check enrollment
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("enrolled_batches")
          .eq("uid", user.uid)
          .single();

        if (userError || !userData) {
          setIsAuthorized(false);
          return;
        }

        const isEnrolled = userData.enrolled_batches?.includes(exam.batch_id);

        setIsAuthorized(!!isEnrolled);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthorization();
  }, [user?.uid, exam, authContextLoading, router]);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const { data: examData, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", exam_id)
        .single();

      if (error || !examData) {
        console.error("Error fetching exam:", error?.message);
        setLoading(false);
        return;
      }

      // Check if exam is enabled
      if (examData.status !== "live") {
        toast({
          title: "পরীক্ষা বন্ধ",
          description:
            "এই পরীক্ষা বর্তমানে বন্ধ রয়েছে। আপনি এটি নিতে পারবেন না।",
          variant: "destructive",
        });
        setLoading(false);
        router.push("/exams");
        return;
      }

      setExam(examData as Exam);

      // Create a mapping for subject IDs to names from exam configuration
      const customMap: { [key: string]: string } = { ...subjectsMap };
      const mConfigs =
        (examData.mandatory_subjects as (string | SubjectConfig)[]) || [];
      const oConfigs =
        (examData.optional_subjects as (string | SubjectConfig)[]) || [];

      [...mConfigs, ...oConfigs].forEach((config) => {
        if (config && typeof config === "object" && config.id && config.name) {
          customMap[config.id] = config.name;
        }
      });

      let finalQuestions: Question[] = [];

      // Collect all question IDs from subjects if it's a custom exam
      const allSubjectQuestionIds: string[] = [];
      mConfigs.forEach((config) => {
        if (typeof config === "object" && config.question_ids) {
          config.question_ids.forEach((id) => allSubjectQuestionIds.push(id));
        }
      });
      oConfigs.forEach((config) => {
        if (typeof config === "object" && config.question_ids) {
          config.question_ids.forEach((id) => allSubjectQuestionIds.push(id));
        }
      });

      const embeddedQuestions = (examData as Record<string, unknown>).questions;
      if (Array.isArray(embeddedQuestions) && embeddedQuestions.length > 0) {
        finalQuestions = (embeddedQuestions as Question[]).map((q) => {
          let answerIndex = -1;
          if (typeof q.answer === "number") {
            answerIndex = q.answer;
          } else {
            const answerString = (q.answer || q.correct || "")
              .toString()
              .trim();
            if (/^\d+$/.test(answerString)) {
              const num = parseInt(answerString, 10);
              if (num > 0) {
                answerIndex = num - 1;
              } else {
                answerIndex = num;
              }
            } else if (
              answerString.length === 1 &&
              /[a-zA-Z]/.test(answerString)
            ) {
              answerIndex = answerString.toUpperCase().charCodeAt(0) - 65;
            }
          }

          const rawOptions =
            q.options && Array.isArray(q.options) && q.options.length > 0
              ? q.options
              : [q.option1, q.option2, q.option3, q.option4, q.option5];

          const options = rawOptions.filter(
            (opt: unknown) =>
              opt && typeof opt === "string" && opt.trim() !== "",
          );

          const originalSubject = q.subject || "";
          const mappedSubject =
            customMap[originalSubject] ||
            subjectsMap[originalSubject] ||
            originalSubject;

          return {
            ...q,
            id: String(q.id),
            question: q.question || q.question_text || "",
            answer: answerIndex,
            options,
            subject: mappedSubject,
          } as Question;
        });
      } else {
        const fetched = await fetchQuestions(
          examData.file_id,
          examData.id,
          undefined,
          undefined,
          undefined,
          allSubjectQuestionIds.length > 0 ? allSubjectQuestionIds : undefined,
        );

        if (Array.isArray(fetched) && fetched.length > 0) {
          finalQuestions = fetched.map((q: RawQuestion) => {
            let answerIndex = -1;
            const answerString = (q.answer || q.correct || "A")
              .toString()
              .trim();

            const answerNum = parseInt(answerString, 10);
            if (!isNaN(answerNum)) {
              answerIndex = answerNum - 1;
            } else {
              answerIndex = answerString.toUpperCase().charCodeAt(0) - 65;
            }
            const options =
              q.options && Array.isArray(q.options) && q.options.length > 0
                ? q.options
                : [
                    q.option1,
                    q.option2,
                    q.option3,
                    q.option4,
                    q.option5,
                  ].filter((opt): opt is string => !!opt);

            const originalSubject = q.subject || "";
            const mappedSubject =
              customMap[originalSubject] ||
              subjectsMap[originalSubject] ||
              originalSubject;

            return {
              id: String(q.id),
              question: q.question || q.question_text || "",
              options: options,
              answer: answerIndex,
              explanation: q.explanation || "",
              type: q.type || null,
              question_image_url: q.question_image_url as string | undefined,
              explanation_image_url: q.explanation_image_url as
                | string
                | undefined,
              question_marks: q.question_marks,
              subject: mappedSubject,
              paper: q.paper,
              chapter: q.chapter,
              highlight: q.highlight,
            };
          });
        }
      }

      if (finalQuestions.length > 0) {
        setAllQuestions(finalQuestions);

        if (!examData.total_subjects) {
          if (examData.shuffle_questions) {
            const groups: { [key: string]: Question[] } = {};
            const subjectOrder: string[] = [];

            finalQuestions.forEach((q) => {
              const subj = q.subject || "General";
              if (!groups[subj]) {
                groups[subj] = [];
                subjectOrder.push(subj);
              }
              groups[subj].push(q);
            });

            let shuffledAndGrouped: Question[] = [];
            subjectOrder.forEach((subj) => {
              shuffledAndGrouped = [
                ...shuffledAndGrouped,
                ...shuffleArray(groups[subj]),
              ];
            });

            setQuestions(shuffledAndGrouped);
            setOrderedSubjects(subjectOrder);
          } else {
            setQuestions(finalQuestions);
          }
        }
      } else {
        toast({
          title: "প্রশ্ন লোড করতে সমস্যা হয়েছে",
          description: "অনুগ্রহ করে পরে আবার চেষ্টা করুন",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = useCallback(
    (questionId: string, optionIndex: number) => {
      // Lock the answer once it's selected.
      if (selectedAnswers[questionId] !== undefined) {
        return;
      }

      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: optionIndex,
      }));
      setMarkedForReview((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    },
    [selectedAnswers],
  );

  const toggleMarkForReview = useCallback((questionId: string) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const { attemptedCount } = useMemo(
    () => ({
      attemptedCount: Object.keys(selectedAnswers).length,
      unattemptedCount:
        filteredQuestions.length - Object.keys(selectedAnswers).length,
    }),
    [selectedAnswers, filteredQuestions.length],
  );

  const getAnswerStatus = (questionId: string) => {
    if (markedForReview.has(questionId)) return "marked";
    if (selectedAnswers[questionId] !== undefined) return "attempted";
    return "unattempted";
  };

  if (authLoading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CustomLoader message="অনুমতি যাচাই করা হচ্ছে..." />
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="container mx-auto p-1 md:p-4 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>অনুমতি নেই</CardTitle>
            <CardDescription>
              এই পরীক্ষায় অংশগ্রহণের জন্য আপনার অনুমতি নেই। দয়া করে নিশ্চিত
              করুন যে আপনি সঠিক batch এ নথিভুক্ত আছেন।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} className="mt-6">
              ফিরে যান
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CustomLoader />
      </div>
    );
  }

  const isCustomExam = !!exam?.total_subjects && exam.total_subjects > 0;

  if (!examStarted) {
    const parseDateField = (keys: string[]) => {
      const examRecord = exam as Record<string, unknown> | null;
      for (const k of keys) {
        const v = examRecord ? examRecord[k] : undefined;
        if (!v) continue;

        let d = dayjs(String(v));

        // If it's a space-separated datetime (MySQL format), parse it
        if (
          !d.isValid() ||
          (typeof v === "string" && v.includes(" ") && !v.includes("T"))
        ) {
          d = dayjs(String(v), "YYYY-MM-DD HH:mm:ss");
        }

        if (d.isValid()) return d.toDate();
      }
      return null;
    };

    const startDate = parseDateField([
      "start_at",
      "start_time",
      "starts_at",
      "start",
      "startDate",
    ]);
    const endDate = parseDateField([
      "end_at",
      "end_time",
      "ends_at",
      "end",
      "endDate",
    ]);

    const isPractice = exam?.is_practice;

    // Validate exam time window using device time
    const timeValidation = validateExamTime(startDate, endDate);
    const allowStart = isPractice || timeValidation.isAllowed;

    const handleStart = async () => {
      if (!allowStart) {
        if (timeValidation.reason === "exam_not_started") {
          toast({
            title: "পরীক্ষা এখনও শুরু হয়নি",
            description: `এই পরীক্ষা ${formatExamDateTime(startDate)} থেকে শুরু হবে। অনুগ্রহ করে তখন আসুন।`,
          });
        } else if (timeValidation.reason === "exam_ended") {
          toast({
            title: "লাইভ পরীক্ষার সময় শেষ",
            description:
              "লাইভ পরীক্ষার সময় শেষ! প্রাকটিসের জন্য লিংক উন্মুক্ত করার জন্য অপেক্ষা করো।",
            variant: "destructive",
          });
        } else {
          toast({
            title: "শুরু করা সম্ভব নয়",
            description: "সময়ের তথ্যে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
            variant: "destructive",
          });
        }
        return;
      }

      // Check number_of_attempts setting
      if (exam?.number_of_attempts === "one_time" && user?.uid) {
        try {
          // Check if user has already submitted this exam
          const { data: existingResult } = await supabase
            .from("student_exams")
            .select("id")
            .eq("exam_id", exam_id)
            .eq("student_id", user.uid)
            .single();

          if (existingResult) {
            // User has already attempted this exam
            toast({
              title: "একটি প্রচেষ্টা ইতিমধ্যে জমা হয়েছে",
              description:
                "আপনি ইতিমধ্যে এই পরীক্ষায় অংশগ্রহণ করেছেন এবং শুধুমাত্র একবার অংশগ্রহণের অনুমতি রয়েছে।",
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.error("Error checking previous attempts:", err);
          // Continue anyway on error - don't block user
        }
      }

      // Questions are already set and potentially shuffled in fetchExam
      // Only set them if the questions state is currently empty
      if (questions.length === 0) {
        setQuestions(allQuestions);
      }

      const now = dayjs().toISOString();
      setStartedAt(now);
      setExamStarted(true);

      if (user?.uid && exam_id) {
        supabase
          .from("student_exams")
          .upsert(
            {
              exam_id: exam_id.toString(),
              student_id: user.uid,
              started_at: now,
            },
            { onConflict: "student_id,exam_id" },
          )
          .then(({ error }) => {
            if (error) console.error("Error recording exam start:", error);
          });
      }
    };

    if (isCustomExam) {
      return (
        <SubjectSelectionScreen
          exam={exam!}
          onStart={handleStartCustomExam}
          questionCount={allQuestions.length}
        />
      );
    }

    return (
      <div className="container mx-auto p-1 md:p-4">
        {(startDate || endDate || isPractice) && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center text-center gap-2">
                <div>
                  {isPractice ? (
                    <div className="text-sm font-semibold">
                      এটি একটি প্রাকটিস পরীক্ষা — আনলিমিটেড প্রবেশাধিকার
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {startDate && (
                        <div>
                          <strong>শুরুর সময়:</strong>{" "}
                          {formatExamDateTime(startDate)}
                        </div>
                      )}
                      {endDate && (
                        <div>
                          <strong>সম্ভাব্য শেষ সময়:</strong>{" "}
                          {formatExamDateTime(endDate)}
                        </div>
                      )}
                      {!startDate && !endDate && (
                        <div>
                          এই পরীক্ষার কোনো নির্দিষ্ট সময়সীমা সেট করা হয়নি।
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!allowStart &&
                    timeValidation.reason === "exam_not_started" && (
                      <div className="text-xs text-muted-foreground px-3 py-2 rounded bg-blue-50 dark:bg-blue-950">
                        ⏰ পরীক্ষা শুরু হওয়ার সময় হলে আপনার এখানে ফিরে আসতে
                        হবে।
                      </div>
                    )}
                  {!allowStart && timeValidation.reason === "exam_ended" && (
                    <div className="text-xs text-destructive px-3 py-2 rounded bg-red-50 dark:bg-red-950">
                      ⛔ এই পরীক্ষার সময়সীমা শেষ হয়ে গেছে।
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <ExamInstructions
          exam={exam}
          onStartExam={handleStart}
          questionCount={questions.length}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 max-w-6xl">
        <div className="flex flex-col items-center">
          <div className="sticky top-0 z-10 py-4 bg-background/95 backdrop-blur w-full max-w-4xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <BookOpen className="h-5 w-5 flex-shrink-0" />
                <div className="text-center sm:text-left min-w-0 flex-1">
                  <h2 className="font-semibold truncate">{exam?.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    পৃষ্ঠা {currentPageIndex + 1} / {totalPages}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/exams/${exam_id}/leaderboard`)}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">লিডারবোর্ড</span>
                  <span className="sm:hidden">লিডারবোর্ড</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold min-w-0">
                  {attemptedCount}/{filteredQuestions.length}
                </span>
              </div>
            </div>
            <Progress
              value={(attemptedCount / filteredQuestions.length) * 100}
              className="mt-3 h-1"
            />

            {/* Subject Tabs */}
            {examStarted && uniqueSubjects.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                <Button
                  variant={selectedSubject === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedSubject("all");
                    setCurrentPageIndex(0);
                    window.scrollTo(0, 0);
                  }}
                  className="whitespace-nowrap text-xs"
                >
                  সব প্রশ্ন ({questions.length})
                </Button>
                {uniqueSubjects.map((subject) => {
                  const subjectQuestionCount = questions.filter(
                    (q) => q.subject === subject,
                  ).length;
                  return (
                    <Button
                      key={subject}
                      variant={
                        selectedSubject === subject ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedSubject(subject);
                        setCurrentPageIndex(0);
                        window.scrollTo(0, 0);
                      }}
                      className="whitespace-nowrap text-xs"
                    >
                      {subject} ({subjectQuestionCount})
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <Tabs defaultValue="questions" className="w-full max-w-4xl">
            <TabsList className="grid w-full grid-cols-1 mb-6">
              <TabsTrigger
                value="questions"
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>প্রশ্ন</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-6">
              {currentPageQuestions.map((question, pageIndex) => {
                const globalIndex = startIndex + pageIndex;
                const status = getAnswerStatus(question.id!);
                const isAnswered = selectedAnswers[question.id!] !== undefined;

                // Show subject heading if this is the first question of a new subject
                const prevQuestion =
                  pageIndex > 0 ? currentPageQuestions[pageIndex - 1] : null;
                const showSubjectHeading =
                  !prevQuestion || prevQuestion.subject !== question.subject;

                return (
                  <Fragment key={question.id}>
                    {showSubjectHeading && question.subject && (
                      <div className="flex items-center gap-4 my-6 mt-8 mb-4">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center w-full uppercase tracking-wider text-foreground/90">
                          {question.subject}
                        </h2>
                      </div>
                    )}
                    <Card
                      id={`question-${question.id}`}
                      className="overflow-hidden w-full max-w-4xl mx-auto"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="secondary">
                                প্রশ্ন {globalIndex + 1}
                              </Badge>
                              {isAnswered && (
                                <Badge variant="default" className="bg-success">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  উত্তরিত
                                </Badge>
                              )}
                              {status === "marked" && (
                                <Badge
                                  variant="outline"
                                  className="text-warning"
                                >
                                  <Flag className="h-3 w-3 mr-1" />
                                  পর্যালোচনা
                                </Badge>
                              )}
                              {(question.subject ||
                                question.paper ||
                                question.chapter ||
                                question.highlight) && (
                                <div className="flex flex-wrap gap-1">
                                  {question.subject && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-600 border-blue-200 font-normal"
                                    >
                                      {question.subject}
                                    </Badge>
                                  )}
                                  {question.paper && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1.5 bg-green-50 text-green-600 border-green-200 font-normal"
                                    >
                                      {question.paper}
                                    </Badge>
                                  )}
                                  {question.chapter && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1.5 bg-purple-50 text-purple-600 border-purple-200 font-normal"
                                    >
                                      {question.chapter}
                                    </Badge>
                                  )}
                                  {question.highlight && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1.5 bg-amber-50 text-amber-600 border-amber-200 font-normal"
                                    >
                                      {question.highlight}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-base sm:text-lg font-bold leading-relaxed break-words text-foreground/90 mt-2">
                              <LatexRenderer html={question.question} />
                            </div>
                            {question.question_image_url && (
                              <div className="mt-3 rounded-lg overflow-hidden border max-w-full bg-white">
                                <img
                                  src={question.question_image_url}
                                  alt="Question"
                                  className="w-full h-auto object-contain max-h-[300px]"
                                />
                              </div>
                            )}
                          </div>
                          <Button
                            variant={status === "marked" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleMarkForReview(question.id!)}
                            className={status === "marked" ? "bg-warning" : ""}
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 p-3 sm:p-4">
                        <div className="space-y-3">
                          <div className="space-y-3">
                            {(Array.isArray(question.options)
                              ? question.options
                              : Object.values(
                                  question.options ||
                                    ({} as Record<string, string>),
                                )
                            ).map((option: string, optionIndex: number) => {
                              const bengaliLetters = [
                                "ক",
                                "খ",
                                "গ",
                                "ঘ",
                                "ঙ",
                                "চ",
                                "ছ",
                                "জ",
                              ];
                              const letter =
                                bengaliLetters[optionIndex] ||
                                String.fromCharCode(65 + optionIndex);

                              const isSelected =
                                selectedAnswers[question.id!] === optionIndex;

                              return (
                                <label
                                  key={optionIndex}
                                  className={cn(
                                    "group flex items-center space-x-3 p-2.5 md:p-3.5 rounded-xl border-2 transition-all min-h-[56px] cursor-pointer",
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                                      : isAnswered
                                        ? "border-muted bg-muted/20 opacity-80 cursor-default"
                                        : "border-muted hover:border-primary/20 hover:bg-muted/30",
                                  )}
                                  onClick={() => {
                                    if (isAnswered) return;
                                    handleAnswerSelect(
                                      String(question.id) || "",
                                      optionIndex,
                                    );
                                  }}
                                >
                                  <div className="flex-shrink-0">
                                    <div
                                      className={cn(
                                        "w-9 h-9 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm md:text-base transition-all flex-shrink-0",
                                        isSelected
                                          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                          : "border-muted-foreground/20 bg-background text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                                      )}
                                    >
                                      {letter}
                                    </div>
                                  </div>

                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={optionIndex.toString()}
                                    checked={isSelected}
                                    readOnly
                                    className="hidden"
                                  />
                                  <span
                                    className={cn(
                                      "flex-1 min-w-0 text-sm md:text-base font-semibold leading-snug break-words",
                                      isSelected
                                        ? "text-primary"
                                        : "text-foreground/90",
                                    )}
                                  >
                                    <LatexRenderer html={option} />
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Fragment>
                );
              })}

              <footer
                id="exam-navigation"
                className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 pt-4 mt-6 w-full max-w-4xl mx-auto"
              >
                <Button
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={
                    (currentPageIndex === 0 &&
                      (selectedSubject === "all" ||
                        uniqueSubjects.indexOf(selectedSubject) === 0)) ||
                    isSubmitting
                  }
                  className="w-full sm:flex-1 h-12 sm:h-10 px-4 text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  পূর্ববর্তী
                </Button>

                <div className="text-sm font-bold text-muted-foreground whitespace-nowrap px-4 py-2 bg-muted/30 rounded-full">
                  {currentPageIndex + 1} / {totalPages}
                </div>

                {!isLastPageOfExam ? (
                  <Button
                    onClick={handleNextPage}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 h-12 sm:h-10 px-4 text-sm font-medium"
                  >
                    পরবর্তী
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 h-14 sm:h-12 px-6 text-lg sm:text-base font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    জমা দিন
                    <Send className="h-5 w-5 ml-2" />
                  </Button>
                )}
              </footer>
              <hr className="h-20 border-transparent" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {timeLeft !== null && (
        <div className="fixed bottom-8 left-4 z-50 flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all text-lg shadow-lg ${
              (timeLeft || 0) <= CRITICAL_TIME_THRESHOLD
                ? TIMER_CLASSES.critical
                : (timeLeft || 0) <= 300
                  ? TIMER_CLASSES.warning
                  : TIMER_CLASSES.normal
            }`}
          >
            <Clock className="h-5 w-5" />
            <span>{formatTime(timeLeft || 1)}</span>
          </div>
        </div>
      )}

      <Button
        onClick={() => setShowReviewDialog(true)}
        variant="default"
        className="fixed bottom-8 right-4 z-50 h-11 w-11 rounded-full shadow-lg"
        aria-label="পর্যালোচনা খুলুন"
      >
        <Eye className="h-6 w-6" />
      </Button>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              সমস্ত প্রশ্ন পর্যালোচলা
            </DialogTitle>
            <DialogDescriptionComponent>
              এক নজরে আপনার পরীক্ষার অবস্থা দেখুন।
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto p-1">
            {questions.map((question, index) => {
              const status = getAnswerStatus(question.id!);
              let statusClass = "bg-muted hover:bg-muted/80";
              if (status === "attempted") {
                statusClass = "bg-success/80 hover:bg-success text-white";
              } else if (status === "marked") {
                statusClass = "bg-warning/80 hover:bg-warning text-white";
              }
              return (
                <Button
                  key={question.id}
                  variant="outline"
                  className={`h-10 w-10 rounded-full ${statusClass}`}
                  onClick={() => {
                    const page = Math.floor(index / questionsPerPage);
                    setCurrentPageIndex(page);
                    setShowReviewDialog(false);
                    setTimeout(() => {
                      document
                        .getElementById(`question-${question.id}`)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs items-center">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success"></div>উত্তরিত
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted"></div>অনুত্তরিত
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning"></div>পর্যালোচনা
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি {questions.length} টির মধ্যে {attemptedCount} টি প্রশ্নের
              উত্তর দিয়েছেন। জমা দেওয়ার পর আপনি আর পরিবর্তন করতে পারবেন না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ফিরে যান</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitExam}>
              জমা দিন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

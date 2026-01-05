"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  fetchQuestions,
  normalizeQuestion,
  type RawQuestion,
} from "@/lib/fetchQuestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Exam, Question } from "@/lib/types";
import LatexRenderer from "@/components/LatexRenderer";
import CustomLoader from "@/components/CustomLoader";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Zap,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import dayjs, { formatDuration } from "@/lib/date-utils";

interface ResultInfo {
  started_at?: string;
  submitted_at?: string;
  score?: number | null;
}

export default function SolvePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const exam_id = params.exam_id as string;

  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">(
    "all",
  );

  // Fetch Exam and Questions
  const { data: examDataObj, isLoading: loadingExam } = useQuery({
    queryKey: ["exam-solve", exam_id],
    queryFn: async () => {
      const { data: examData, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", exam_id)
        .single();

      if (error || !examData) {
        throw new Error("পরীক্ষা লোড করতে সমস্যা হয়েছে");
      }

      let finalQuestions: Question[] = [];

      // Collect question IDs for custom exams
      const allSubjectQuestionIds: string[] = [];
      const mConfigs = (examData.mandatory_subjects as unknown[]) || [];
      const oConfigs = (examData.optional_subjects as unknown[]) || [];

      mConfigs.forEach((config) => {
        if (
          config &&
          typeof config === "object" &&
          "question_ids" in config &&
          Array.isArray((config as { question_ids: string[] }).question_ids)
        ) {
          (config as { question_ids: string[] }).question_ids.forEach((id) =>
            allSubjectQuestionIds.push(id),
          );
        }
      });
      oConfigs.forEach((config) => {
        if (
          config &&
          typeof config === "object" &&
          "question_ids" in config &&
          Array.isArray((config as { question_ids: string[] }).question_ids)
        ) {
          (config as { question_ids: string[] }).question_ids.forEach((id) =>
            allSubjectQuestionIds.push(id),
          );
        }
      });

      const embeddedQuestions = (examData as Record<string, unknown>).questions;
      if (Array.isArray(embeddedQuestions) && embeddedQuestions.length > 0) {
        finalQuestions = (embeddedQuestions as RawQuestion[]).map(
          (q: RawQuestion) => {
            const normalized = normalizeQuestion(q);
            return {
              ...normalized,
              answer: Number(normalized.answer),
              options: normalized.options || [],
            } as Question;
          },
        );
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
          finalQuestions = fetched.map((q: RawQuestion) => ({
            ...q,
            answer: Number(q.answer),
            options: q.options || [],
          })) as Question[];
        }
      }
      return { exam: examData as Exam, questions: finalQuestions };
    },
    enabled: !!exam_id,
  });

  const exam = examDataObj?.exam;
  const questions = examDataObj?.questions || [];

  // Get Answers from Supabase or localStorage
  const { data: userData } = useQuery<{
    answers: Record<string, number>;
    result: ResultInfo | null;
  }>({
    queryKey: ["exam-answers", exam_id, user?.uid],
    queryFn: async () => {
      // 1. Try fetching from Supabase first
      if (user?.uid && exam_id) {
        try {
          const { data: examData, error: examError } = await supabase
            .from("student_exams")
            .select("*, student_responses(*)")
            .eq("exam_id", exam_id)
            .eq("student_id", user.uid)
            .single();

          if (!examError && examData) {
            const answers: Record<string, number> = {};
            let hasResponses = false;

            const responses = examData.student_responses;
            if (responses && Array.isArray(responses) && responses.length > 0) {
              (
                responses as {
                  selected_option: string | null;
                  question_id: string;
                }[]
              ).forEach((resp) => {
                if (resp.selected_option !== null) {
                  answers[resp.question_id] = parseInt(
                    resp.selected_option,
                    10,
                  );
                  hasResponses = true;
                }
              });
            }

            if (hasResponses || examData.score !== undefined) {
              return {
                answers,
                result: {
                  started_at: examData.started_at,
                  submitted_at: examData.submitted_at,
                  score: examData.score,
                },
              };
            }
          }
        } catch (e) {
          console.error("Failed to fetch result from Supabase:", e);
        }
      }

      // 2. Fallback to localStorage
      const storageKey = user?.uid
        ? `exam_answers_${user.uid}_${exam_id}`
        : null;
      if (!storageKey) return { answers: {}, result: null };

      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return {
          answers: (parsed.answers || parsed) as Record<string, number>,
          result: parsed as ResultInfo,
        };
      }
      return { answers: {}, result: null };
    },
    enabled: !!exam_id,
  });

  const loadedUserAnswers = userData?.answers || null;
  const examResultData = userData?.result || null;

  // Fetch Live Rank
  const { data: rankData } = useQuery({
    queryKey: ["exam-rank", exam_id, user?.uid],
    queryFn: async () => {
      const { data: allResults, error } = await supabase
        .from("student_exams")
        .select("student_id, score")
        .eq("exam_id", exam_id)
        .order("score", { ascending: false });

      if (error || !allResults) return null;

      const myResultIndex = allResults.findIndex(
        (r) => r.student_id === user?.uid,
      );

      return {
        rank: myResultIndex !== -1 ? myResultIndex + 1 : null,
        total: allResults.length,
      };
    },
    enabled: !!exam_id && !!user,
    refetchInterval: 10000,
  });

  const {
    relevantQuestions,
    correctAnswers,
    wrongAnswers,
    unattempted,
    finalScore,
    negativeMarks,
    marksFromCorrect,
  } = useMemo(() => {
    if (!loadedUserAnswers || questions.length === 0 || !exam) {
      return {
        relevantQuestions: [],
        correctAnswers: 0,
        wrongAnswers: 0,
        unattempted: 0,
        finalScore: 0,
        negativeMarks: 0,
        marksFromCorrect: 0,
      };
    }

    const answeredIds = Object.keys(loadedUserAnswers);
    const attemptedSubjects = new Set<string>();

    // Identify subjects the user attempted
    questions.forEach((q) => {
      if (answeredIds.includes(String(q.id))) {
        if (q.subject) attemptedSubjects.add(q.subject);
      }
    });

    // Determine valid questions based on Mandatory + Selected Optional subjects
    const validQuestions = questions.filter((q) => {
      // 1. If it's a practice exam or simple exam (no subject structure), show all
      if (!exam.mandatory_subjects && !exam.optional_subjects) return true;

      // 2. Check if it belongs to a Mandatory subject
      const isMandatory = (
        exam.mandatory_subjects as unknown[]
      )?.some((s) => {
        if (typeof s === "string") return s === q.subject;
        return (s as { id: string; name?: string }).id === q.subject || (s as { id: string; name?: string }).name === q.subject;
      });
      if (isMandatory) return true;

      // 3. Check if it belongs to an Optional subject that was attempted
      const isOptional = (
        exam.optional_subjects as unknown[]
      )?.some((s) => {
        if (typeof s === "string") return s === q.subject;
        return (s as { id: string; name?: string }).id === q.subject || (s as { id: string; name?: string }).name === q.subject;
      });

      if (isOptional) {
        // Only include if user attempted this subject
        return q.subject && attemptedSubjects.has(q.subject);
      }

      // 4. Fallback: If question has no subject or doesn't match config, keep it (legacy behavior)
      return true;
    });

    let correct = 0;
    let wrong = 0;
    let totalMarksFromCorrect = 0;
    let totalNegative = 0;

    validQuestions.forEach((q) => {
      let qMarks = parseFloat(String(exam?.marks_per_question || 1.00));
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

      const qId = String(q.id);

      if (qId && answeredIds.includes(qId)) {
        // Use strict Number comparison for answer matching
        if (loadedUserAnswers[qId] === Number(q.answer)) {
          correct++;
          totalMarksFromCorrect += qMarks;
        } else {
          wrong++;
          totalNegative += qNeg;
        }
      }
    });

    return {
      relevantQuestions: validQuestions,
      correctAnswers: correct,
      wrongAnswers: wrong,
      unattempted: validQuestions.length - (correct + wrong),
      finalScore: totalMarksFromCorrect - totalNegative,
      negativeMarks: totalNegative,
      marksFromCorrect: totalMarksFromCorrect,
    };
  }, [loadedUserAnswers, questions, exam]);

  const filteredQuestions = useMemo(() => {
    if (filter === "all" || !loadedUserAnswers) return relevantQuestions;

    return relevantQuestions.filter((q) => {
      const qId = String(q.id);
      const userAnswer = loadedUserAnswers[qId];

      if (filter === "correct")
        return userAnswer !== undefined && userAnswer === q.answer;

      if (filter === "wrong")
        return userAnswer !== undefined && userAnswer !== q.answer;

      if (filter === "skipped") return userAnswer === undefined;

      return true;
    });
  }, [filter, relevantQuestions, loadedUserAnswers]);

  if (loadingExam) return <CustomLoader />;

  if (!exam || questions.length === 0)
    return <p className="p-8 text-center">কোনো সমাধান পাওয়া যায়নি।</p>;

  const displayScore =
    examResultData?.score !== undefined && examResultData?.score !== null
      ? examResultData.score
      : finalScore;

  const totalNegativeMarksFromWrong =
    wrongAnswers * parseFloat(String(exam?.negative_marks_per_wrong || 0));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 flex flex-col items-center justify-start p-1 sm:p-4 md:p-6">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-success/20 blur-2xl rounded-full"></div>

                <CheckCircle2 className="h-16 w-16 text-success relative" />
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-bold mb-2">পরীক্ষা সম্পন্ন!</h1>

              <p className="text-muted-foreground text-lg">
                আপনার ফলাফল নিচে দেখুন
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warning if this is a practice mode submission after exam time expired */}
        {exam.end_at &&
          (() => {
            const now = dayjs().utcOffset(6 * 60); // Bangladesh timezone
            const endAt = dayjs.utc(exam.end_at).utcOffset(6 * 60); // UTC from DB converted to Bangladesh
            const isPastExamTime = !exam.is_practice && now.isAfter(endAt);
            return isPastExamTime ? (
              <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500">
                <CardContent className="p-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      অনুশীলনী মোডে চলছে
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      পরীক্ষার সময় শেষ হওয়ার পর এই সমাধান দেখুন। এই ফলাফল
                      leaderboard এ অন্তর্ভুক্ত হবে না।
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              আপনার মোট স্কোর
            </p>

            <div className="space-y-2">
              <div className="text-4xl md:text-6xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {displayScore.toFixed(2)}
              </div>

              {examResultData?.started_at && examResultData?.submitted_at && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground mt-2">
                  <Clock className="h-4 w-4" />

                  <span className="font-medium">
                    সময়:{" "}
                    {formatDuration(
                      examResultData.started_at,

                      examResultData.submitted_at,
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Leaderboard Card */}

        {rankData && rankData.rank !== null && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    লাইভ পজিশন
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    অন্যান্য পরীক্ষার্থীদের সাথে আপনার অবস্থান
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-purple-600 dark:text-purple-400">
                  {rankData.rank}
                </span>

                <span className="text-lg text-muted-foreground font-medium">
                  / {rankData.total}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-muted/20 shadow-sm">
            <CardContent className="p-3 md:p-6 space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2 text-success">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />

                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">
                  সঠিক
                </span>
              </div>

              <p className="text-lg md:text-3xl font-black text-success">
                {correctAnswers}
              </p>

              <p className="text-[8px] md:text-xs text-muted-foreground font-medium truncate">
                মার্ক: +{marksFromCorrect.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted/20 shadow-sm">
            <CardContent className="p-3 md:p-6 space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />

                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">
                  ভুল
                </span>
              </div>

              <p className="text-lg md:text-3xl font-black text-destructive">
                {wrongAnswers}
              </p>

              <p className="text-[8px] md:text-xs text-muted-foreground font-medium truncate">
                পেনাল্টি: -{totalNegativeMarksFromWrong.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted/20 shadow-sm">
            <CardContent className="p-3 md:p-6 space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2 text-warning">
                <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />

                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">
                  স্কিপ
                </span>
              </div>

              <p className="text-lg md:text-3xl font-black text-warning">
                {unattempted}
              </p>

              <p className="text-[8px] md:text-xs text-muted-foreground font-medium truncate">
                মার্ক: 0.00
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted/20 shadow-sm">
            <CardContent className="p-3 md:p-6 space-y-1 md:space-y-2">
              <div className="flex items-center gap-1 md:gap-2 text-primary">
                <Zap className="h-4 w-4 md:h-5 md:w-5" />

                <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">
                  নেগেটিভ
                </span>
              </div>

              <p className="text-lg md:text-3xl font-black text-primary">
                {negativeMarks.toFixed(2)}
              </p>

              <p className="text-[8px] md:text-xs text-muted-foreground font-medium truncate">
                প্রতি ভুল {exam?.negative_marks_per_wrong || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Alert
          className={`mb-8 ${
            displayScore >= relevantQuestions.length * 0.75
              ? "bg-success/5"
              : displayScore >= relevantQuestions.length * 0.5
                ? "bg-warning/5"
                : "bg-destructive/5"
          }`}
        >
          <BookOpen className="h-4 w-4" />

          <AlertDescription className="text-sm">
            <strong>ফিডব্যাক:</strong>{" "}
            {displayScore >= relevantQuestions.length * 0.75
              ? " চমৎকার! আপনি খুব ভালো করেছেন। এই মানের পরীক্ষা চালিয়ে যান।"
              : displayScore >= relevantQuestions.length * 0.5
                ? " ভালো! আরও বেশি অনুশীলন করুন এবং পরবর্তী পরীক্ষায় আরও ভালো করতে পারবেন।"
                : " আরও বেশি মনোযোগ দিয়ে পড়ুন এবং পরবর্তী পরীক্ষায় আরও ভালো করুন।"}{" "}
            {rankData && rankData.rank !== null && (
              <span className="block mt-2 font-bold text-primary">
                আপনার বর্তমান পজিশন: {rankData.rank} / {rankData.total}
              </span>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-6 mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 p-2 md:p-6">
              <h2 className="text-xl font-bold">বিস্তারিত ফলাফল</h2>

              <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-full md:w-auto overflow-x-auto scrollbar-hide">
                <Button
                  size="sm"
                  variant={filter === "all" ? "default" : "ghost"}
                  onClick={() => setFilter("all")}
                  className="flex-1 md:flex-none rounded-lg text-[10px] md:text-xs h-8 px-3 font-bold"
                >
                  সবগুলো
                </Button>

                <Button
                  size="sm"
                  variant={filter === "correct" ? "default" : "ghost"}
                  onClick={() => setFilter("correct")}
                  className="flex-1 md:flex-none rounded-lg text-[10px] md:text-xs h-8 px-3 font-bold"
                >
                  সঠিক
                </Button>

                <Button
                  size="sm"
                  variant={filter === "wrong" ? "default" : "ghost"}
                  onClick={() => setFilter("wrong")}
                  className="flex-1 md:flex-none rounded-lg text-[10px] md:text-xs h-8 px-3 font-bold"
                >
                  ভুল
                </Button>

                <Button
                  size="sm"
                  variant={filter === "skipped" ? "default" : "ghost"}
                  onClick={() => setFilter("skipped")}
                  className="flex-1 md:flex-none rounded-lg text-[10px] md:text-xs h-8 px-3 font-bold"
                >
                  স্কিপ
                </Button>
              </div>
            </CardHeader>
          </Card>

          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((question) => {
              const qId = String(question.id);

              const userAnswer = loadedUserAnswers
                ? loadedUserAnswers[qId]
                : undefined;

              // Derived from question.answer directly in the loop for consistency with QuestionSelector
              // const correctAnswer = question.answer; 

              const isCorrect = userAnswer === Number(question.answer);

              const isSkipped = userAnswer === undefined;

              return (
                <Card
                  key={qId}
                  className={`mb-4 ${
                    isCorrect && !isSkipped
                      ? "bg-success/5"
                      : isSkipped
                        ? "bg-warning/5"
                        : "bg-destructive/5"
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2 md:gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <Badge
                          variant={
                            isCorrect && !isSkipped
                              ? "default"
                              : isSkipped
                                ? "outline"
                                : "destructive"
                          }
                          className={
                            isCorrect && !isSkipped
                              ? "bg-success"
                              : isSkipped
                                ? "text-warning border-warning"
                                : ""
                          }
                        >
                          {isCorrect && !isSkipped
                            ? "সঠিক"
                            : isSkipped
                              ? "উত্তর করা হয়নি"
                              : "ভুল"}
                        </Badge>

                        <div className="text-lg font-semibold break-words">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="mr-1">
                              প্রশ্ন {filteredQuestions.indexOf(question) + 1}.
                            </span>

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

                          <div className="font-bold mt-2">
                            <LatexRenderer html={question.question || ""} />
                          </div>
                        </div>

                        {question.question_image_url &&
                          typeof question.question_image_url === "string" && (
                            <div className="mt-3 rounded-lg overflow-hidden border max-w-full bg-white relative h-[300px]">
                              <Image
                                src={question.question_image_url}
                                alt="Question"
                                fill
                                className="object-contain"
                                priority={false}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      {(Array.isArray(question.options)
                        ? question.options
                        : (Object.values(question.options || {}) as string[])
                      ).map((option, optIdx) => {
                        if (!option) return null;
                        const isSelected = userAnswer === optIdx;
                        // Use Number() to ensure strict comparison, matching QuestionSelector logic
                        const isRightAnswer = Number(question.answer) === optIdx;
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

                        let optionClass =
                          "p-3 rounded-lg border flex items-start gap-3 max-w-full ";
                        if (isRightAnswer) {
                          optionClass +=
                            "bg-success/20 border-success text-success-foreground font-medium";
                        } else if (isSelected && !isRightAnswer) {
                          optionClass +=
                            "bg-destructive/20 border-destructive text-destructive-foreground font-medium";
                        } else {
                          optionClass += "bg-background border-muted";
                        }

                        return (
                          <div key={optIdx} className={optionClass}>
                            <div
                              className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                                isRightAnswer
                                  ? "border-success bg-success text-white"
                                  : isSelected
                                    ? "border-destructive bg-destructive text-white"
                                    : "border-muted"
                              }`}
                            >
                              {bengaliLetters[optIdx] ||
                                String.fromCharCode(65 + optIdx)}
                            </div>
                            <div className="flex-1 min-w-0 whitespace-normal pt-0.5">
                              <LatexRenderer html={option || ""} />
                            </div>
                            {isRightAnswer && (
                              <CheckCircle2 className="h-4 w-4 text-success ml-auto mt-1 flex-shrink-0" />
                            )}
                            {isSelected && !isRightAnswer && (
                              <AlertCircle className="h-4 w-4 text-destructive ml-auto mt-1 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm min-w-0 break-words">
                        <p className="font-semibold mb-1">ব্যাখ্যা:</p>

                        <div className="flex-1 min-w-0">
                          <LatexRenderer html={question.explanation || ""} />
                        </div>

                        {question.explanation_image_url &&
                          typeof question.explanation_image_url ===
                            "string" && (
                            <div className="mt-3 rounded-lg overflow-hidden border max-w-full bg-white relative h-[200px]">
                              <Image
                                src={question.explanation_image_url}
                                alt="Explanation"
                                fill
                                className="object-contain"
                                priority={false}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                style={{ userSelect: "none" }}
                              />
                            </div>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                এই ক্যাটাগরিতে কোনো প্রশ্ন পাওয়া যায়নি।
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-6 pb-4 md:pb-8">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full sm:flex-1 h-12"
            size="lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            পিছনে যান
          </Button>

          {exam?.number_of_attempts !== "one_time" && (
            <Button
              onClick={() => router.push(`/exams/${exam_id}`)}
              variant="outline"
              className="w-full sm:flex-1 h-12"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              আবার পরীক্ষা দিন
            </Button>
          )}

          <Button
            onClick={() => router.push(`/exams/${exam_id}/leaderboard`)}
            className="w-full sm:flex-1 h-12"
            size="lg"
          >
            <Zap className="h-4 w-4 mr-2" />
            লিডারবোর্ড দেখুন
          </Button>

          <Button
            onClick={() => router.push("/exams")}
            className="w-full sm:flex-1 h-12"
            size="lg"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            ড্যাশবোর্ডে যান
          </Button>
        </div>

        <hr className="h-16 border-transparent" />
      </div>
    </div>
  );
}

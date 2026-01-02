"use client";

import { useState, useMemo } from "react";

import { useAuth } from "@/context/AuthContext";

import { PageHeader, EmptyState, CustomLoader } from "@/components";

import { getBatches, getExams, getStudentResults } from "@/lib/data-supabase";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BarChart3,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
} from "lucide-react";

import type { Exam, StudentExam } from "@/lib/types";

import { Button } from "@/components/ui/button";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import dayjs, { formatDate, formatDuration } from "@/lib/date-utils";

interface ExamResult {
  id: string;

  exam_id: string;

  exam_name: string;

  score: number;

  correct_answers: number;

  wrong_answers: number;

  unattempted: number;

  submitted_at: string;

  started_at?: string;

  negative_marks_per_wrong: number;

  marks_per_question: number;

  batch_id: string | null;
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();

  const [sortBy, setSortBy] = useState<"recent" | "score">("recent");

  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");

  // Query for all batches (for filter dropdown)

  const { data: batches = [] } = useQuery({
    queryKey: ["batches", "all"],

    queryFn: async () => {
      return await getBatches();
    },

    enabled: !authLoading && !!user,

    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates

    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Query for all exams (for name lookup)

  const { data: exams = [] } = useQuery({
    queryKey: ["exams", "all"],

    queryFn: async () => {
      return await getExams();
    },

    enabled: !authLoading && !!user,

    refetchInterval: 30000, // Refresh every 30 seconds for exam time changes

    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Query for user results

  const {
    data: rawResults = [],
    isLoading: loadingResults,
    error: resultsError,
  } = useQuery({
    queryKey: ["results", "student", user?.uid],

    queryFn: async () => {
      if (!user?.uid) return [];
      const data = await getStudentResults(user.uid);
      return data.map((r: StudentExam) => ({
        id: r.id,
        exam_id: r.exam_id,
        correct_answers: r.correct_answers,
        wrong_answers: r.wrong_answers,
        unattempted: r.unattempted,
        submitted_at: r.submitted_at,
        started_at: r.started_at,
        score: r.score,
      }));
    },

    enabled: !!user?.uid && !authLoading,

    refetchInterval: 30000, // Refresh every 30 seconds to catch new submissions

    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const results = useMemo(() => {
    if (!rawResults.length || !exams.length) return [];

    const examLookup: Record<string, Partial<Exam>> = {};

    exams.forEach((exam) => {
      examLookup[exam.id] = exam;
    });

    return rawResults.map((result) => {
      const examDetails = examLookup[result.exam_id];

      const negativeMarks = examDetails?.negative_marks_per_wrong || 0;

      const finalScore =
        result.score !== undefined && result.score !== null
          ? parseFloat(String(result.score))
          : (result.correct_answers || 0) -
            (result.wrong_answers || 0) * negativeMarks;

      return {
        id: result.id,

        exam_id: result.exam_id,

        exam_name: examDetails?.name || "অজানা পরীক্ষা",

        score: finalScore,

        correct_answers: result.correct_answers || 0,

        wrong_answers: result.wrong_answers || 0,

        unattempted: result.unattempted || 0,

        submitted_at: result.submitted_at,

        started_at: result.started_at,

        negative_marks_per_wrong: negativeMarks,

        marks_per_question: examDetails?.marks_per_question || 1,

        batch_id: examDetails?.batch_id || null,
      } as ExamResult;
    });
  }, [rawResults, exams]);

  const getScoreBadgeColor = (score: number, totalMarks: number) => {
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    if (percentage >= 80) return "bg-green-100 text-green-800 border-green-300";

    if (percentage >= 60) return "bg-blue-100 text-blue-800 border-blue-300";

    if (percentage >= 40)
      return "bg-yellow-100 text-yellow-800 border-yellow-300";

    return "bg-red-100 text-red-800 border-red-300";
  };

  const getScoreFeedback = (score: number, totalMarks: number) => {
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    if (percentage >= 80) return "চমৎকার পারফরম্যান্স!";

    if (percentage >= 60) return "ভালো পারফরম্যান্স";

    if (percentage >= 40) return "সন্তোষজনক";

    return "আরও অনুশীলন প্রয়োজন";
  };

  const getScoreFeedbackIcon = (score: number, totalMarks: number) => {
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    if (percentage >= 80)
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;

    if (percentage >= 60)
      return <TrendingUp className="h-5 w-5 text-blue-600" />;

    if (percentage >= 40)
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;

    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const filteredResults = useMemo(
    () =>
      selectedBatchId === "all"
        ? results
        : results.filter((r) => r.batch_id === selectedBatchId),

    [results, selectedBatchId],
  );

  const sortedResults = useMemo(
    () =>
      [...filteredResults].sort((a, b) => {
        if (sortBy === "score") {
          return b.score - a.score;
        }

        return (
          dayjs(b.submitted_at).valueOf() - dayjs(a.submitted_at).valueOf()
        );
      }),

    [filteredResults, sortBy],
  );

  const { totalAttempts, averageScore, bestScore } = useMemo(
    () => ({
      totalAttempts: filteredResults.length,

      averageScore:
        filteredResults.length > 0
          ? filteredResults.reduce((sum, r) => sum + r.score, 0) /
            filteredResults.length
          : 0,

      bestScore:
        filteredResults.length > 0
          ? Math.max(...filteredResults.map((r) => r.score))
          : 0,
    }),
    [filteredResults],
  );

  if (authLoading) {
    return (
      <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl">
        <PageHeader title="ফলাফল" description="" />

        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <CustomLoader />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl space-y-6">
        <PageHeader title="ফলাফল" description="" />

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertDescription>অনুগ্রহ করে লগইন করুন</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingResults) {
    return (
      <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl">
        <PageHeader title="ফলাফল" description="" />

        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <CustomLoader />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultsError) {
    return (
      <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl space-y-6">
        <PageHeader title="ফলাফল" description="" />

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertDescription>{resultsError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl space-y-6">
        <PageHeader
          title="ফলাফল"
          description="আপনার পরীক্ষার ফলাফল এবং পরিসংখ্যান"
        />

        <EmptyState
          icon={<BarChart3 className="h-12 w-12 text-primary" />}
          title="কোনো ফলাফল পাওয়া যায়নি"
          description="এখনও কোনো পরীক্ষার ফলাফল নেই। পরীক্ষা দিন এবং আপনার ফলাফল দেখুন।"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl space-y-6">
      <PageHeader
        title="ফলাফল"
        description="আপনার পরীক্ষার ফলাফল এবং পরিসংখ্যান"
      />

      <div className="flex justify-between items-center">
        <Select onValueChange={setSelectedBatchId} defaultValue="all">
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="কোর্স অনুযায়ী ফিল্টার করুন" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">সকল ব্যাচ</SelectItem>

            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">মোট পরীক্ষা</p>

              <p className="text-3xl font-bold text-primary">{totalAttempts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">গড় স্কোর</p>

              <p className="text-3xl font-bold text-blue-600">
                {averageScore.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">সর্বোচ্চ স্কোর</p>

              <p className="text-3xl font-bold text-green-600">
                {bestScore.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>বিস্তারিত ফলাফল</CardTitle>

              <CardDescription>সব পরীক্ষার ফলাফল</CardDescription>
            </div>

            <Tabs
              value={sortBy}
              onValueChange={(v) => setSortBy(v as "recent" | "score")}
            >
              <TabsList>
                <TabsTrigger value="recent">সাম্প্রতিক</TabsTrigger>

                <TabsTrigger value="score">স্কোর</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {sortedResults.length > 0 ? (
              sortedResults.map((result) => {
                const totalQuestions =
                  result.correct_answers +
                  result.wrong_answers +
                  result.unattempted;

                const totalMarks = totalQuestions * result.marks_per_question;

                return (
                  <div
                    key={result.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {result.exam_name}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {formatDate(
                            result.submitted_at,
                            "DD MMM YYYY, hh:mm A",
                          )}
                        </p>
                      </div>

                      <Badge
                        className={`text-base px-3 py-1 ${getScoreBadgeColor(result.score, totalMarks)}`}
                      >
                        {result.score.toFixed(2)}
                      </Badge>
                    </div>

                    {/* Score Feedback */}

                    <div className="flex items-center gap-2">
                      {getScoreFeedbackIcon(result.score, totalMarks)}

                      <span className="text-sm font-medium">
                        {getScoreFeedback(result.score, totalMarks)}
                      </span>
                    </div>

                    {/* Score Bar */}

                    <Progress
                      value={
                        totalMarks > 0 ? (result.score / totalMarks) * 100 : 0
                      }
                      className="h-2"
                    />

                    {/* Statistics */}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">সঠিক</p>

                        <p className="text-lg font-bold text-green-600">
                          {result.correct_answers}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">ভুল</p>

                        <p className="text-lg font-bold text-red-600">
                          {result.wrong_answers}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">মোট মার্কস</p>

                        <p className="text-lg font-bold text-gray-600">
                          {totalMarks.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">ব্যয়িত সময়</p>

                        <div className="flex items-center gap-1 text-lg font-bold text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDuration(
                              result.started_at,
                              result.submitted_at,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Link href={`/exams/${result.exam_id}/leaderboard`}>
                        <Button variant="outline" size="sm">
                          <Trophy className="h-4 w-4 mr-2" />
                          লিডারবোর্ড
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                এই কোর্সের জন্য কোনো ফলাফল পাওয়া যায়নি।
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <hr className="h-20 border-transparent" />
    </div>
  );
}

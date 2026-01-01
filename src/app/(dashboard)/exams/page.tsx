"use client";

import { useMemo } from "react";
import {
  PageHeader,
  EmptyState,
  CustomLoader,
  UniversalDetailsCard,
} from "@/components";
import { getExams, getStudentResults } from "@/lib/data-supabase";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Exam, StudentExam } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CalendarClock,
  Zap,
  CheckCircle2,
  Trophy,
  RotateCw,
  FileText,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dayjs, { formatDate } from "@/lib/date-utils";
import { useCopyLink } from "@/hooks/use-copy-link";

export default function ExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const { copy } = useCopyLink();

  // Query for all accessible exams from Supabase
  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["exams", "accessible", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      // This logic should ideally be in data-supabase.ts
      // Fetch public exams and exams for user's batches
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .or(
          `batch_id.is.null,batch_id.in.(${user.enrolled_batches?.join(",") || ""})`,
        );

      if (error) throw error;
      return data as Exam[];
    },
    enabled: !authLoading && !!user,
  });

  // Query for student results from Supabase
  const { data: resultsMap = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ["results", "student", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return {};
      const results = await getStudentResults(user.uid);

      const lookup: Record<string, StudentExam> = {};
      results.forEach((r: any) => {
        lookup[r.exam_id] = r as StudentExam;
      });
      return lookup;
    },
    enabled: !!user?.uid && !authLoading,
  });

  const { liveExams, practiceExams, upcomingExams } = useMemo(() => {
    const now = dayjs();
    const live: Exam[] = [];
    const practice: Exam[] = [];
    const upcoming: Exam[] = [];

    allExams.forEach((exam) => {
      if (exam.is_practice) {
        practice.push(exam);
      } else {
        const startTime = exam.start_at ? dayjs(exam.start_at) : null;
        const endTime = exam.end_at ? dayjs(exam.end_at) : null;

        if (startTime && now.isBefore(startTime)) {
          upcoming.push(exam);
        } else if (endTime && now.isAfter(endTime)) {
          // Finished live exams can be treated as practice
          practice.push(exam);
        } else {
          live.push(exam);
        }
      }
    });

    return {
      liveExams: live,
      practiceExams: practice,
      upcomingExams: upcoming,
    };
  }, [allExams]);

  const loading = examsLoading || resultsLoading;

  if (loading || authLoading) {
    return <CustomLoader />;
  }

  // Helper to render exam card
  const renderExamCard = (exam: Exam) => {
    const result = resultsMap[exam.id];
    const now = dayjs();
    const startAt = exam.start_at ? dayjs(exam.start_at) : null;
    const endAt = exam.end_at ? dayjs(exam.end_at) : null;

    const timeExpired =
      !exam.is_practice && endAt !== null && now.isAfter(endAt);
    const notStarted =
      !exam.is_practice && startAt !== null && now.isBefore(startAt);
    const ended =
      !exam.is_practice && !timeExpired && endAt !== null && now.isAfter(endAt);

    const handleTakeExam = () => {
      if (notStarted || ended) return;
      window.location.href = `/exams/${exam.id}`;
    };

    const handleViewSolution = () => {
      window.location.href = `/exams/${exam.id}/solve`;
    };

    const handleCopyLink = () => {
      const baseUrl = window.location.origin;
      copy(`${baseUrl}/exams/${exam.id}`, "পরীক্ষার লিঙ্ক কপি করা হয়েছে।");
    };

    return (
      <UniversalDetailsCard
        key={exam.id}
        className="group hover:shadow-md"
        headerContent={
          <div
            className={`h-40 md:h-48 flex items-center justify-center transition-colors duration-300 ${
              result
                ? "bg-gradient-to-br from-green-500/20 to-green-500/5 dark:from-green-500/30 dark:to-green-500/10"
                : "bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10"
            }`}
          >
            <div className="text-center px-4">
              <p
                className={`text-sm font-medium mb-2 ${
                  result
                    ? "text-green-700 dark:text-green-600"
                    : "text-primary/70 dark:text-primary/60"
                }`}
              >
                {result ? "ফলাফল" : "পরীক্ষা ID"}
              </p>
              <p
                className={`text-3xl md:text-4xl font-light tracking-tight transition-colors truncate ${
                  result
                    ? "text-green-700 dark:text-green-500"
                    : "text-primary dark:text-primary"
                }`}
              >
                {result && result.score !== null && result.score !== undefined
                  ? `${parseFloat(String(result.score)).toFixed(0)}%`
                  : exam.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        }
        headerClassName="p-0 border-b-0"
        title={exam.name}
        subtitle={exam.course_name}
        badges={
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-sm ${
              result
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary dark:text-primary"
            }`}
          >
            {result ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            {result ? "সম্পন্ন" : "পরীক্ষা"}
          </div>
        }
        info={[
          {
            label: "তারিখ:",
            value: formatDate(exam.created_at, "DD/MM/YYYY"),
          },
        ]}
        actions={
          <div className="flex flex-col gap-2 w-full">
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={handleViewSolution}
                    variant="secondary"
                    size="sm"
                    className="w-full text-[10px] md:text-xs"
                  >
                    <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    উত্তরপত্র
                  </Button>
                  <Link
                    href={`/exams/${exam.id}/leaderboard`}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] md:text-xs"
                    >
                      <Trophy className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      লিডারবোর্ড
                    </Button>
                  </Link>
                </div>
                <div className="w-full">
                  <Button
                    onClick={handleTakeExam}
                    variant="default"
                    size="sm"
                    className="w-full text-[10px] md:text-xs"
                  >
                    <RotateCw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    আবার দিন
                  </Button>
                </div>
              </>
            ) : (
              <button
                onClick={handleTakeExam}
                disabled={notStarted || ended}
                className={`inline-flex items-center justify-center shadow-sm font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-all duration-200 w-full ${
                  notStarted || ended
                    ? "text-muted-foreground bg-gray-100 border border-gray-200 cursor-not-allowed"
                    : "text-neutral-50 dark:text-neutral-950 bg-neutral-900 dark:bg-neutral-50 border border-neutral-900 dark:border-neutral-50 hover:bg-neutral-800 dark:hover:bg-neutral-100 focus:ring-4 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                }`}
              >
                {notStarted
                  ? "শুরু হয়নি"
                  : ended
                    ? "সময় শেষ"
                    : timeExpired
                      ? "অনুশীলনী মোড"
                      : "পরীক্ষা দিন"}
                {!notStarted && !ended && (
                  <svg
                    className="w-4 h-4 ms-2 rtl:rotate-180"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 12H5m14 0-4 4m4-4-4-4"
                    />
                  </svg>
                )}
              </button>
            )}

            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="w-full text-[10px] md:text-xs"
            >
              <Link2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              লিঙ্ক কপি করুন
            </Button>

            {/* Scheduling Info */}
            {(notStarted || (ended && !timeExpired)) && startAt && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {notStarted && (
                  <>শুরুর সময়: {formatDate(startAt, "DD/MM/YYYY hh:mm A")}</>
                )}
                {ended && (
                  <>সমাপ্ত: {formatDate(endAt, "DD/MM/YYYY hh:mm A")}</>
                )}
                {startAt && endAt && <> • </>}
              </p>
            )}
          </div>
        }
      />
    );
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 max-w-6xl space-y-6">
      <PageHeader
        title="পরীক্ষাসমূহ"
        description="আপনার ব্যাচের এবং পাবলিক পরীক্ষাগুলোর তালিকা।"
      />

      <Tabs defaultValue="live" className="w-full mb-8">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="live">
            <Zap className="h-4 w-4 mr-2" />
            লাইভ
          </TabsTrigger>
          <TabsTrigger value="practice">
            <BookOpen className="h-4 w-4 mr-2" />
            প্রাকটিস
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <CalendarClock className="h-4 w-4 mr-2" />
            আপকামিং
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          {liveExams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {liveExams.map(renderExamCard)}
            </div>
          ) : (
            <EmptyState
              icon={<Zap className="h-12 w-12 text-primary" />}
              title="কোনো লাইভ পরীক্ষা নেই"
              description="বর্তমানে কোনো পরীক্ষা লাইভ নেই। অনুগ্রহ করে পরে আবার দেখুন।"
            />
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          {practiceExams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {practiceExams.map(renderExamCard)}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-primary" />}
              title="কোনো প্রাকটিস পরীক্ষা নেই"
              description="অনুশীলনের জন্য কোনো পরীক্ষা এখনো যুক্ত করা হয়নি।"
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingExams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {upcomingExams.map(renderExamCard)}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarClock className="h-12 w-12 text-primary" />}
              title="কোনো আপকামিং পরীক্ষা নেই"
              description="শীঘ্রই নতুন পরীক্ষার সময়সূচী যুক্ত করা হবে।"
            />
          )}
        </TabsContent>
      </Tabs>
      <hr className="h-20 border-transparent" />
    </div>
  );
}

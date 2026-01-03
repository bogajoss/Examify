"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getStudentResults } from "@/lib/data-supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UniversalDetailsCard } from "@/components/UniversalDetailsCard";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Batch, Exam, StudentExam } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, CustomLoader } from "@/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CalendarClock,
  Zap,
  CheckCircle2,
  Trophy,
  RotateCw,
  FileText,
} from "lucide-react";
import Link from "next/link";
import dayjs, { formatDate } from "@/lib/date-utils";

export default function StudentBatchExamsPage() {
  const params = useParams();
  const router = useRouter();
  const batch_id = params.batch_id as string;
  const { user, loading: authLoading } = useAuth();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<Record<string, StudentExam>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !batch_id) return;

    const authorizeAndFetch = async () => {
      setLoading(true);
      try {
        const { data: batchData, error: batchError } = await supabase
          .from("batches")
          .select("*")
          .eq("id", batch_id)
          .single();

        if (batchError || !batchData) {
          setIsAuthorized(false);
          return;
        }

        setBatch(batchData as Batch);

        let isAuth = false;
        if (batchData.is_public) {
          isAuth = true;
        } else if (user?.uid) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("enrolled_batches")
            .eq("uid", user.uid)
            .single();

          if (!userError && userData?.enrolled_batches?.includes(batch_id)) {
            isAuth = true;
          }
        }

        if (!isAuth && !batchData.is_public) {
          router.push("/login");
          return;
        }

        setIsAuthorized(true);

        const { data: examsData, error: examsError } = await supabase
          .from("exams")
          .select("*")
          .eq("batch_id", batch_id)
          .eq("status", "live")
          .order("created_at", { ascending: false });

        if (examsError) throw examsError;
        setExams((examsData as Exam[]) || []);

        if (user?.uid && examsData && examsData.length > 0) {
          const results = await getStudentResults(user.uid);

          const resultsMap: Record<string, StudentExam> = {};
          results.forEach((r: StudentExam) => {
            resultsMap[r.exam_id] = r;
          });
          setExamResults(resultsMap);
        }
      } catch (error) {
        console.error("Error loading batch page:", error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    authorizeAndFetch();
  }, [batch_id, user, authLoading, router]);

  const { liveExams, practiceExams, upcomingExams } = useMemo(() => {
    const now = dayjs.utc();
    const live: Exam[] = [];
    const practice: Exam[] = [];
    const upcoming: Exam[] = [];

    exams.forEach((exam) => {
      if (exam.is_practice) {
        practice.push(exam);
      } else {
        const startTime = exam.start_at ? dayjs.utc(exam.start_at) : null;
        const endTime = exam.end_at ? dayjs.utc(exam.end_at) : null;

        if (startTime && now.isBefore(startTime)) {
          upcoming.push(exam);
        } else if (endTime && now.isAfter(endTime)) {
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
  }, [exams]);

  useEffect(() => {
    if (loading || exams.length === 0) return;

    if (!user?.uid) {
      const anonymousResults: Record<string, StudentExam> = {};
      exams.forEach((exam) => {
        const storageKey = `exam_answers_anonymous_${exam.id}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            anonymousResults[exam.id] = {
              exam_id: exam.id,
              student_id: "anonymous",
              score: parsedData.score,
              correct_answers: parsedData.correct_answers,
              wrong_answers: parsedData.wrong_answers,
              unattempted: parsedData.unattempted,
              submitted_at: parsedData.submitted_at,
            };
          } catch (e) {
            console.error("Failed to parse saved anonymous answers", e);
          }
        }
      });
      setExamResults((prev) => ({ ...prev, ...anonymousResults }));
    }
  }, [exams, user, loading]);

  if (isAuthorized === false) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>অনুমতি নেই</CardTitle>
            <CardDescription>এই ব্যাচে আপনার অ্যাক্সেস নেই।</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/batches")}>
              আমার ব্যাচসমূহে ফিরুন
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loader while authorization is being determined
  if (isAuthorized === null || loading) {
    return <CustomLoader />;
  }

  // Helper to render exam card
  const renderExamCard = (exam: Exam) => {
    const result = examResults[exam.id];
    const now = dayjs.utc();
    const startAt = exam.start_at ? dayjs.utc(exam.start_at) : null;
    const endAt = exam.end_at ? dayjs.utc(exam.end_at) : null;

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
        title={`পরীক্ষাসমূহ - ${batch?.name}`}
        description="এই ব্যাচের অন্তর্ভুক্ত পরীক্ষাসমূহ।"
      />
      {exams.length > 0 ? (
        <Tabs defaultValue="live" className="w-full">
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
                description="এই ব্যাচে বর্তমানে কোনো পরীক্ষা লাইভ নেই।"
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
                description="এই ব্যাচে অনুশীলনের জন্য কোনো পরীক্ষা নেই।"
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
                description="এই ব্যাচে কোনো নতুন পরীক্ষার সময়সূচী নেই।"
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p>এই ব্যাচে এখনও কোনো পরীক্ষা যোগ করা হয়নি।</p>
          </CardContent>
        </Card>
      )}
      <hr className="h-20 border-transparent" />
    </div>
  );
}

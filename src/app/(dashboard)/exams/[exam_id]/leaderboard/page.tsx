"use client";

import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, CustomLoader } from "@/components";
import { maskMobileNumber, formatExamDateTime } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Exam } from "@/lib/types";
import { Clock, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface StudentResult {
  id: string;
  student: {
    name: string;
    roll: string;
  };
  score: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  submitted_at: string;
  started_at?: string | null;
}

function formatDuration(start?: string | null, end?: string): string {
  if (!start || !end) return "N/A";

  const startTime = dayjs(start);
  const endTime = dayjs(end);

  const diffInMs = endTime.diff(startTime);
  if (diffInMs < 0) return "N/A";

  const totalSeconds = Math.floor(diffInMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export default function ExamLeaderboardPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const exam_id = params.exam_id as string;

  // Query for Exam Details from Supabase
  const { data: exam, isLoading: loadingExam } = useQuery({
    queryKey: ["exam", exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", exam_id)
        .single();

      if (error) throw error;
      return data as Exam;
    },
    enabled: !!exam_id,
  });

  // Query for Results from Supabase
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ["leaderboard", exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_exams")
        .select("*, users!inner(name, roll)")
        .eq("exam_id", exam_id)
        .order("score", { ascending: false });

      if (error) throw error;

      return (
        data as {
          id: string;
          users: { name: string; roll: string };
          score: number;
          correct_answers: number;
          wrong_answers: number;
          unattempted: number;
          submitted_at: string;
          started_at: string | null;
        }[]
      ).map((r) => ({
        id: r.id,
        student: { name: r.users.name, roll: r.users.roll },
        score: r.score,
        correct_answers: r.correct_answers,
        wrong_answers: r.wrong_answers,
        unattempted: r.unattempted,
        submitted_at: r.submitted_at,
        started_at: r.started_at,
        // Rank will be recalculated based on filtering
      })) as StudentResult[];
    },
    enabled: !!exam_id,
  });

  // Filter results to only show submissions within exam time window
  const officialResults = results.filter((result) => {
    if (!exam?.end_at) return true; // If no end time, show all

    const submittedTime = dayjs(result.submitted_at);
    const examEndTime = dayjs(exam.end_at);

    // Only include submissions that were made before or at exam end time
    // (within the actual exam time window, not practice mode submissions)
    return (
      submittedTime.isBefore(examEndTime) || submittedTime.isSame(examEndTime)
    );
  }).map((r, i) => ({ ...r, rank: i + 1 }));

  const allResults = results.map((r, i) => ({ ...r, rank: i + 1 }));

  const loading = loadingExam || loadingResults;

  if (loading) {
    return <CustomLoader />;
  }

  const renderLeaderboardTable = (data: (StudentResult & { rank: number })[]) => {
    // Calculate summary statistics
    const avgScore =
      data.length > 0
        ? data.reduce((sum, r) => sum + r.score, 0) / data.length
        : 0;
    const maxScore =
      data.length > 0 ? Math.max(...data.map((r) => r.score)) : 0;
    const minScore =
      data.length > 0 ? Math.min(...data.map((r) => r.score)) : 0;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                মোট অংশগ্রহণকারী
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">গড় স্কোর</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(String(avgScore)).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                সর্বোচ্চ স্কোর
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(String(maxScore)).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                সর্বনিম্ন স্কোর
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(String(minScore)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>ফলাফল তালিকা</CardTitle>
            <CardDescription>
              সর্বোচ্চ স্কোর থেকে সর্বনিম্ন স্কোরের ক্রমানুসারে সাজানো
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead>র‌্যাঙ্ক</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>রোল</TableHead>
                  <TableHead className="text-right">স্কোর</TableHead>
                  <TableHead className="text-center">সঠিক</TableHead>
                  <TableHead className="text-center">ভুল</TableHead>
                  <TableHead className="text-center">উত্তর না দেওয়া</TableHead>
                  <TableHead>ব্যয়িত সময়</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      এখনো কোনো ফলাফল পাওয়া যায়নি।
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((result) => (
                    <TableRow
                      key={result.id}
                      className={
                        result.student.roll === user?.roll
                          ? "bg-primary/10 md:table-row"
                          : "md:table-row"
                      }
                    >
                      {/* Mobile view - collapsed card style */}
                      <TableCell className="md:hidden p-0">
                        <div className="border rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">র‌্যাঙ্ক: </span>
                              <span>{result.rank}</span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div>
                              <span className="font-medium">নাম: </span>
                              {result.student.name}
                            </div>
                            <div>
                              <span className="font-medium">রোল: </span>
                              {maskMobileNumber(result.student.roll)}
                            </div>
                            <div>
                              <span className="font-medium">স্কোর: </span>
                              <span className="font-bold">
                                {result.score
                                  ? parseFloat(String(result.score)).toFixed(2)
                                  : 0}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-green-600">
                                <span className="font-medium">সঠিক: </span>
                                {result.correct_answers || 0}
                              </span>
                              <span className="text-destructive">
                                <span className="font-medium">ভুল: </span>
                                {result.wrong_answers || 0}
                              </span>
                              <span className="text-muted-foreground">
                                <span className="font-medium">
                                  উত্তর না দেওয়া:{" "}
                                </span>
                                {result.unattempted || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">ব্যয়িত সময়: </span>
                              {formatDuration(
                                result.started_at,
                                result.submitted_at,
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {/* Desktop view - normal table cells */}
                      <TableCell className="hidden md:table-cell">
                        {result.rank}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {result.student.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {maskMobileNumber(result.student.roll)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right font-bold">
                        {result.score
                          ? parseFloat(String(result.score)).toFixed(2)
                          : 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-green-600">
                        {result.correct_answers || 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-destructive">
                        {result.wrong_answers || 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-muted-foreground">
                        {result.unattempted || 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDuration(result.started_at, result.submitted_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={`${exam?.name || "লিডারবোর্ড"}`}
          description="এই পরীক্ষায় অংশগ্রহণকারীদের র‌্যাঙ্কিং"
        />
        {exam?.number_of_attempts !== "one_time" && (
          <Button
            onClick={() => router.push(`/exams/${exam_id}`)}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            আবার পরীক্ষা দিন
          </Button>
        )}
      </div>

      {/* Exam Time Information */}
      {(exam?.start_at || exam?.end_at) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">পরীক্ষার সময়কাল</CardTitle>
            <CardDescription>পরীক্ষার শুরু ও শেষের সময়</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {exam.start_at && (
              <div className="flex-1 min-w-[200px]">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  শুরুর সময়
                </h4>
                <p className="font-medium">
                  {formatExamDateTime(exam.start_at)}
                </p>
              </div>
            )}
            {exam.end_at && (
              <div className="flex-1 min-w-[200px]">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  শেষ সময়
                </h4>
                <p className="font-medium">{formatExamDateTime(exam.end_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="official" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="official">অফিসিয়াল ফলাফল</TabsTrigger>
          <TabsTrigger value="all">সকল ফলাফল</TabsTrigger>
        </TabsList>
        <TabsContent value="official" className="mt-6">
          <div className="mb-4 text-sm text-muted-foreground">
            * শুধুমাত্র নির্ধারিত সময়ের মধ্যে জমা দেওয়া ফলাফল এখানে দেখানো হয়েছে।
          </div>
          {renderLeaderboardTable(officialResults)}
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          <div className="mb-4 text-sm text-muted-foreground">
             * নির্ধারিত সময় এবং প্রাকটিস মোড সহ সকল ফলাফল এখানে দেখানো হয়েছে।
          </div>
          {renderLeaderboardTable(allResults)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

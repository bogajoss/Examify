"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, CustomLoader } from "@/components";
import { maskRollNumber } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import type { Batch } from "@/lib/types";

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  student_roll: string;
  total_score: number;
}

export default function BatchLeaderboardPage() {
  const { user } = useAuth();
  const params = useParams();
  const { toast } = useToast();

  const batch_id = params.batch_id as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batch_id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch batch details
        const { data: batchData, error: batchError } = await supabase
          .from("batches")
          .select("*")
          .eq("id", batch_id)
          .single();

        if (batchError) throw batchError;
        setBatch(batchData as Batch);

        // Fetch exams for the batch
        const { data: exams, error: examsError } = await supabase
          .from("exams")
          .select("*")
          .eq("batch_id", batch_id);

        if (examsError) throw examsError;

        if (!exams || exams.length === 0) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        const examIds = exams.map((exam) => exam.id);

        // Fetch all results for these exams
        const { data: results, error: resultsError } = await supabase
          .from("student_exams")
          .select("*, users!inner(name, roll)")
          .in("exam_id", examIds);

        if (resultsError) throw resultsError;

        // Process results
        const studentScores: {
          [key: string]: { name: string; roll: string; total_score: number };
        } = {};

        (
          results as {
            student_id: string;
            score: number;
            users: { name: string; roll: string };
          }[]
        )?.forEach((result) => {
          const studentUid = result.student_id;
          if (!studentUid) return;

          // Score is already calculated in student_exams table in Supabase
          const score = result.score || 0;

          if (!studentScores[studentUid]) {
            studentScores[studentUid] = {
              name: result.users.name,
              roll: result.users.roll,
              total_score: 0,
            };
          }
          studentScores[studentUid].total_score += score;
        });

        const finalLeaderboard = Object.entries(studentScores).map(
          ([uid, data]) => ({
            student_id: uid,
            student_name: data.name,
            student_roll: data.roll,
            total_score: data.total_score,
          }),
        );

        finalLeaderboard.sort((a, b) => b.total_score - a.total_score);

        setLeaderboard(finalLeaderboard);
      } catch (err) {
        console.error(err);
        toast({
          title: "লিডারবোর্ড লোড করতে ব্যর্থ",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [batch_id, toast]);

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="container mx-auto p-1 md:p-4 space-y-6">
      <PageHeader
        title={`${batch?.name || "ব্যাচ"} - লিডারবোর্ড`}
        description="এই ব্যাচের সকল পরীক্ষার সম্মিলিত ফলাফল"
      />
      <Card>
        <CardHeader>
          <CardTitle>সার্বিক ফলাফল তালিকা</CardTitle>
          <CardDescription>
            সর্বোচ্চ মোট স্কোর থেকে সর্বনিম্ন স্কোরের ক্রমানুসারে সাজানো
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="whitespace-nowrap">র‌্যাঙ্ক</TableHead>
                  <TableHead className="whitespace-nowrap">নাম</TableHead>
                  <TableHead className="whitespace-nowrap">রোল</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    মোট স্কোর
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, idx) => (
                    <TableRow key={entry.student_id} className="md:table-row">
                      {/* Mobile view - collapsed card style */}
                      <TableCell className="md:hidden p-0">
                        <div className="border rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">র‌্যাঙ্ক: </span>
                              <span className="font-medium">{idx + 1}</span>
                            </div>
                            {entry.student_id === user?.uid && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                আপনি
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <div>
                              <span className="font-medium">নাম: </span>
                              {entry.student_name}
                            </div>
                            <div>
                              <span className="font-medium">রোল: </span>
                              {maskRollNumber(entry.student_roll)}
                            </div>
                            <div>
                              <span className="font-medium">মোট স্কোর: </span>
                              <span className="font-bold">
                                {parseFloat(String(entry.total_score)).toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {/* Desktop view - normal table cells */}
                      <TableCell className="hidden md:table-cell font-medium whitespace-nowrap">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="hidden md:table-cell min-w-[120px]">
                        {entry.student_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {maskRollNumber(entry.student_roll)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right font-bold whitespace-nowrap">
                        {parseFloat(String(entry.total_score)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      এখনো কোনো ফলাফল পাওয়া যায়নি।
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getExamResults } from "@/lib/data-supabase";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { PageHeader } from "@/components";
import { maskRollNumber, formatExamDateTime } from "@/lib/utils";
import CustomLoader from "@/components/CustomLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Exam } from "@/lib/types";
import {
  Download,
  FileDown,
  ArrowLeft,
  Trash2,
  Edit,
  Plus,
  Clock,
} from "lucide-react";
import Link from "next/link";
import ConfirmPasswordDialog from "@/components/ConfirmPasswordDialog";
import {
  deleteStudentExamResult,
  updateStudentResultScore,
  bulkUpdateExamScores,
} from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/lib/date-utils";

interface StudentResult {
  id: string;
  exam_id: string;
  student_id_obj: {
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

export default function AdminExamResultsPage() {
  const { admin } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const exam_id = params.exam_id as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.wrong_answers !== b.wrong_answers)
        return a.wrong_answers - b.wrong_answers;
      return (
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );
    });
  }, [results]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [pendingResultToDelete, setPendingResultToDelete] =
    useState<StudentResult | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  // Edit Score State
  const [editingResult, setEditingResult] = useState<StudentResult | null>(
    null,
  );
  const [isEditScoreOpen, setIsEditScoreOpen] = useState(false);
  const [newScore, setNewScore] = useState("");
  const [newCorrect, setNewCorrect] = useState("");
  const [newWrong, setNewWrong] = useState("");
  const [newUnattempted, setNewUnattempted] = useState("");

  // Bulk Update State
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkScoreChange, setBulkScoreChange] = useState("");

  useEffect(() => {
    if (!admin) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch exam from Supabase
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .select("*")
          .eq("id", exam_id)
          .single();

        if (examError || !examData) {
          toast({
            title: "পরীক্ষা পাওয়া যায়নি",
            variant: "destructive",
          });
          router.push("/admin/exams");
          return;
        }

        setExam(examData as Exam);

        // Fetch results with student details from Supabase
        const resultsData = await getExamResults(exam_id);

        setResults(
          (
            resultsData as {
              id: string;
              exam_id: string;
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
            exam_id: r.exam_id,
            student_id_obj: { name: r.users.name, roll: r.users.roll },
            score: r.score || 0,
            correct_answers: r.correct_answers,
            wrong_answers: r.wrong_answers,
            unattempted: r.unattempted,
            submitted_at: r.submitted_at,
            started_at: r.started_at,
          })) || [],
        );
      } catch (err) {
        console.error(err);
        toast({
          title: "ডেটা লোড করতে ব্যর্থ",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [admin, exam_id, router, toast]);

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await fetch("/api/generate-results-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam_id }),
      });

      if (!response.ok) throw new Error("Failed to generate results");

      const html = await response.text();
      const newWin = window.open("", "_blank");
      if (newWin) {
        newWin.document.write(html);
        newWin.document.close();
        newWin.focus();
        setTimeout(() => {
          try {
            newWin.print();
          } catch (err) {
            console.error("Print failed:", err);
            newWin.close();
          }
        }, 1000);
      } else {
        toast({
          title: "পপ-আপ ব্লক করা হয়েছে",
          description: "রিপোর্ট দেখতে পপ-আপ চালু করুন।",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "রিপোর্ট তৈরিতে ব্যর্থ", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const response = await fetch("/api/export-results-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam_id }),
      });

      if (!response.ok) throw new Error("Failed to export CSV");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exam?.name?.replace(/\s+/g, "_")}_results.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "CSV ডাউনলোড হয়েছে",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "CSV এক্সপোর্ট করতে ব্যর্থ",
        variant: "destructive",
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const requestDeleteResult = (result: StudentResult) => {
    setPendingResultToDelete(result);
    setIsPasswordOpen(true);
  };

  const handleDeleteConfirmed = async (password: string) => {
    if (!pendingResultToDelete) return;

    if (!admin) {
      toast({ variant: "destructive", title: "অনুমতি নেই" });
      setIsPasswordOpen(false);
      setPendingResultToDelete(null);
      return;
    }

    const formData = new FormData();
    formData.append("id", pendingResultToDelete.id);
    formData.append("password", password);
    formData.append("admin_uid", admin.uid);
    formData.append("exam_id", exam_id);

    const result = await deleteStudentExamResult(formData);

    if (!result.success) {
      toast({
        title: "ফলাফল মুছতে ব্যর্থ",
        description: result.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "ফলাফল মুছে গেছে" });
      setResults(results.filter((r) => r.id !== pendingResultToDelete.id));
    }

    setIsPasswordOpen(false);
    setPendingResultToDelete(null);
  };

  const handleEditClick = (result: StudentResult) => {
    setEditingResult(result);
    setNewScore(String(result.score));
    setNewCorrect(String(result.correct_answers));
    setNewWrong(String(result.wrong_answers));
    setNewUnattempted(String(result.unattempted));
    setIsEditScoreOpen(true);
  };

  const handleEditConfirmed = async (password: string) => {
    if (!editingResult || !admin) return;

    const formData = new FormData();
    formData.append("id", editingResult.id);
    formData.append("score", newScore);
    formData.append("correct_answers", newCorrect);
    formData.append("wrong_answers", newWrong);
    formData.append("unattempted", newUnattempted);
    formData.append("admin_uid", admin.uid);
    formData.append("password", password);
    formData.append("exam_id", exam_id);

    const result = await updateStudentResultScore(formData);

    if (result.success) {
      toast({ title: "স্কোর আপডেট করা হয়েছে" });
      setResults((prev) =>
        prev.map((r) =>
          r.id === editingResult.id
            ? {
                ...r,
                score: parseFloat(newScore),
                correct_answers: parseInt(newCorrect) || 0,
                wrong_answers: parseInt(newWrong) || 0,
                unattempted: parseInt(newUnattempted) || 0,
              }
            : r,
        ),
      );
    } else {
      toast({
        title: "ব্যর্থ হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsEditScoreOpen(false);
    setEditingResult(null);
  };

  const handleBulkUpdateConfirmed = async (password: string) => {
    if (!admin || !bulkScoreChange) return;

    const change = parseFloat(bulkScoreChange);
    if (isNaN(change)) {
      toast({ title: "সংখ্যা দিন", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("exam_id", exam_id);
    formData.append("score_change", bulkScoreChange);
    formData.append("admin_uid", admin.uid);
    formData.append("password", password);

    const result = await bulkUpdateExamScores(formData);

    if (result.success) {
      toast({ title: "সকলের স্কোর আপডেট করা হয়েছে" });
      // Refresh local state roughly or reload
      setResults((prev) =>
        prev.map((r) => ({ ...r, score: r.score + change })),
      );
    } else {
      toast({
        title: "ব্যর্থ হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsBulkUpdateOpen(false);
    setBulkScoreChange("");
  };

  if (!admin) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <CustomLoader />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <CustomLoader />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">পরীক্ষা পাওয়া যায়নি</p>
      </div>
    );
  }

  const avgScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + parseFloat(String(r.score || 0)), 0) /
        results.length
      : 0;
  const maxScore = Math.max(
    ...results.map((r) => parseFloat(String(r.score || 0))),
    0,
  );
  const minScore =
    results.length > 0
      ? Math.min(...results.map((r) => parseFloat(String(r.score || 0))))
      : 0;

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/exams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title={`${exam.name} - ফলাফল`}
          description="সমস্ত শিক্ষার্থীর পরীক্ষার ফলাফল"
        />
      </div>

      {/* Exam Time Information */}
      {(exam.start_at || exam.end_at) && (
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              মোট শিক্ষার্থী
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-4">
          <div>
            <CardTitle>শিক্ষার্থীর ফলাফল</CardTitle>
            <CardDescription>
              স্কোর অনুযায়ী সাজানো (সর্বোচ্চ থেকে সর্বনিম্ন)
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {generatingPDF ? (
                <CustomLoader minimal />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  রিপোর্ট ডাউনলোড
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsBulkUpdateOpen(true)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              বাল্ক আপডেট
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={exportingCSV}
              className="w-full sm:w-auto"
            >
              {exportingCSV ? (
                <CustomLoader minimal />
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV ডাউনলোড
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="hidden md:table-header-group">
              <TableRow>
                <TableHead>ক্র.স.</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>রোল</TableHead>
                <TableHead className="text-right">স্কোর</TableHead>
                <TableHead className="text-center">সঠিক</TableHead>
                <TableHead className="text-center">ভুল</TableHead>
                <TableHead className="text-center">উত্তর না দেওয়া</TableHead>
                <TableHead>ব্যয়িত সময়</TableHead>
                <TableHead className="text-right">কার্যক্রম</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    কোনো ফলাফল নেই
                  </TableCell>
                </TableRow>
              ) : (
                sortedResults.map((result, idx) => (
                  <TableRow key={result.id} className="md:table-row">
                    {/* Mobile view - collapsed card style */}
                    <TableCell className="md:hidden p-0">
                      <div className="border rounded-lg p-3 mb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">ক্র.স.: </span>
                            <span>{idx + 1}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => handleEditClick(result)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => requestDeleteResult(result)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <div>
                            <span className="font-medium">নাম: </span>
                            {result.student_id_obj?.name || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">রোল: </span>
                            {maskRollNumber(
                              result.student_id_obj?.roll || "N/A",
                            )}
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
                            <span className="font-medium">ব্যয়িত সময়: </span>
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
                      {idx + 1}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {result.student_id_obj?.name || "N/A"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {maskRollNumber(result.student_id_obj?.roll || "N/A")}
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
                    <TableCell className="hidden md:table-cell text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        className="mr-2"
                        onClick={() => handleEditClick(result)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => requestDeleteResult(result)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmPasswordDialog
        open={isPasswordOpen}
        onOpenChange={(open) => {
          setIsPasswordOpen(open);
          if (!open) setPendingResultToDelete(null);
        }}
        title="ফলাফল মুছুন"
        description={`আপনি কি নিশ্চিতভাবে ${pendingResultToDelete?.student_id_obj.name || ""} এর ফলাফল মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে।`}
        confirmLabel="মুছে ফেলুন"
        onConfirm={handleDeleteConfirmed}
      />

      {/* Edit Score Dialog */}
      <Dialog open={isEditScoreOpen} onOpenChange={setIsEditScoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>স্কোর পরিবর্তন করুন</DialogTitle>
            <DialogDescription>
              {editingResult?.student_id_obj.name}-এর নতুন স্কোর নির্ধারণ করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>নতুন স্কোর</Label>
                <Input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>সঠিক উত্তর</Label>
                <Input
                  type="number"
                  value={newCorrect}
                  onChange={(e) => setNewCorrect(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ভুল উত্তর</Label>
                <Input
                  type="number"
                  value={newWrong}
                  onChange={(e) => setNewWrong(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>উত্তর না দেওয়া</Label>
                <Input
                  type="number"
                  value={newUnattempted}
                  onChange={(e) => setNewUnattempted(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditScoreOpen(false)}>
              বাতিল
            </Button>
            <Button
              onClick={() => {
                handleEditConfirmed("");
              }}
            >
              আপডেট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>বাল্ক স্কোর আপডেট</DialogTitle>
            <DialogDescription>
              সকল শিক্ষার্থীর স্কোরের সাথে এই মান যোগ বা বিয়োগ করা হবে। (বিয়োগ
              করতে - ব্যবহার করুন)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>স্কোর পরিবর্তন (যেমন: 1 বা -1)</Label>
              <Input
                type="number"
                value={bulkScoreChange}
                onChange={(e) => setBulkScoreChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkUpdateOpen(false)}
            >
              বাতিল
            </Button>
            <Button
              onClick={() => {
                handleBulkUpdateConfirmed("");
              }}
            >
              আপডেট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

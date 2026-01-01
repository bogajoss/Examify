"use client";

import { useState, useMemo } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UniversalDetailsCard } from "@/components/UniversalDetailsCard";
import CustomLoader from "@/components/CustomLoader";
import type { Exam, Batch } from "@/lib/types";
import {
  ChevronDown,
  BarChart3,
  Trash2,
  Pencil,
  FileText,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import ConfirmPasswordDialog from "@/components/ConfirmPasswordDialog";
import { EditExamModal } from "@/components/EditExamModal";
import { deleteExam } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useCopyLink } from "@/hooks/use-copy-link";

export function ExamsClient({
  initialExams,
  initialBatches,
}: {
  initialExams: Exam[];
  initialBatches: Batch[];
}) {
  const { admin } = useAdminAuth();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const { toast } = useToast();
  const { copy } = useCopyLink();

  // State for actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // For admin, show all exams, not just running ones
  const allExams = useMemo(() => {
    return exams;
  }, [exams]);

  const publicExams = useMemo(
    () => allExams.filter((exam) => !exam.batch_id),
    [allExams],
  );

  const batchedExams = useMemo(
    () =>
      initialBatches
        .map((batch) => ({
          ...batch,
          exams: allExams.filter((exam) => exam.batch_id === batch.id),
        }))
        .filter((batch) => batch.exams.length > 0),
    [allExams, initialBatches],
  );

  if (!admin) {
    return (
      <div className="container mx-auto p-1 md:p-2 lg:p-4 flex items-center justify-center min-h-[50vh]">
        <CustomLoader />
      </div>
    );
  }

  // --- Handlers ---

  const handleCopyLink = (examId: string) => {
    const examUrl = `${window.location.origin}/exams/${examId}`;
    copy(examUrl, "পরীক্ষার লিঙ্ক কপি করা হয়েছে।");
  };

  const initiateDelete = (examId: string) => {
    setDeletingId(examId);
    setShowPasswordDialog(true);
  };

  const confirmDelete = async (password: string) => {
    if (!deletingId || !admin) return;

    // Find exam to get batch_id if needed
    const exam = exams.find((e) => e.id === deletingId);
    if (!exam) return;

    const formData = new FormData();
    formData.append("id", deletingId);
    formData.append("password", password);
    formData.append("admin_uid", admin.uid);
    if (exam.batch_id) formData.append("batch_id", exam.batch_id);

    const result = await deleteExam(formData);

    setShowPasswordDialog(false);
    setDeletingId(null);

    if (result.success) {
      toast({ title: "Exam Deleted Successfully" });
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } else {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (exam: Exam) => {
    if (!admin) return;
    setTogglingId(exam.id);

    try {
      const formData = new FormData();
      formData.append("id", exam.id);
      // Toggle logic: if live -> disable (0), else -> enable (1)
      formData.append("is_enabled", exam.status === "live" ? "0" : "1");
      if (exam.batch_id) formData.append("batch_id", exam.batch_id);

      const { updateExam } = await import("@/lib/actions");
      const result = await updateExam(formData);

      if (result.success) {
        const updatedExam = result.data as Exam;
        toast({
          title:
            updatedExam.status === "live"
              ? "পরীক্ষা সক্রিয় করা হয়েছে"
              : "পরীক্ষা বন্ধ করা হয়েছে",
        });
        setExams((prev) =>
          prev.map((e) => (e.id === updatedExam.id ? updatedExam : e)),
        );
      } else {
        toast({ title: "স্টাটাস আপডেট ব্যর্থ", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "ত্রুটি",
        description: "স্টাটাস পরিবর্তন করতে ব্যর্থ",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const renderExamGrid = (examsToRender: Exam[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
      {examsToRender.map((exam) => {
        const isToggling = togglingId === exam.id;
        const isDeleting = deletingId === exam.id; // strictly speaking only true during confirmation, but safe enough

        return (
          <UniversalDetailsCard
            key={exam.id}
            headerContent={
              <>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                    {exam.name}
                  </h3>
                  {exam.status !== "live" && (
                    <Badge
                      variant="destructive"
                      className="whitespace-nowrap text-xs"
                    >
                      বন্ধ
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  ID: {exam.id.slice(0, 12)}...
                </p>
              </>
            }
            headerClassName="p-4 bg-gradient-to-r from-primary/5 to-primary/10"
            info={[
              {
                label: "Duration:",
                value: `${exam.duration_minutes} Min`,
              },
              {
                label: "Negative Mark:",
                value: exam.negative_marks_per_wrong,
              },
              {
                label: "Created:",
                value: formatDate(exam.created_at, "DD/MM/YYYY"),
              },
            ]}
            actions={
              <div className="grid grid-cols-2 gap-2 w-full">
                <Link
                  href={`/admin/exams/${exam.id}/questions`}
                  className="col-span-2 sm:col-span-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Questions
                  </Button>
                </Link>
                <Link
                  href={`/admin/exams/${exam.id}/results`}
                  className="col-span-2 sm:col-span-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Results
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleCopyLink(exam.id)}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Link
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setEditingExam(exam)}
                  disabled={isDeleting || isToggling}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant={exam.status !== "live" ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleToggleStatus(exam)}
                  disabled={isDeleting || isToggling}
                >
                  {isToggling ? (
                    <CustomLoader minimal />
                  ) : exam.status !== "live" ? (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      সক্রিয় করুন
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                      বন্ধ করুন
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => initiateDelete(exam.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Exam
                </Button>
              </div>
            }
            actionsClassName="p-4 border-t border-neutral-200 dark:border-neutral-800"
            className="hover:shadow-md"
          />
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>সকল পরীক্ষা (অ্যাডমিন)</CardTitle>
          <CardDescription>
            সকল পাবলিক ও ব্যাচ-ভিত্তিক পরীক্ষাগুলি এখানে দেখুন এবং পরিচালনা করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="space-y-4">
            <Collapsible className="rounded-lg border" defaultOpen={true}>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-2 md:p-4 font-semibold">
                <span>পাবলিক পরীক্ষা ({publicExams.length})</span>
                <ChevronDown className="h-5 w-5 transition-transform duration-300 [&[data-state=open]]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="p-2 md:p-4 pt-0">
                {publicExams.length > 0 ? (
                  renderExamGrid(publicExams)
                ) : (
                  <p className="text-muted-foreground text-sm">
                    কোনো পাবলিক পরীক্ষা নেই।
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {batchedExams.map((batch) => (
              <Collapsible
                key={batch.id}
                className="rounded-lg border"
                defaultOpen={true}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between p-2 md:p-4 font-semibold">
                  <span>
                    {batch.name} ({batch.exams.length})
                  </span>
                  <ChevronDown className="h-5 w-5 transition-transform duration-300 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-2 md:p-4 pt-0">
                  {renderExamGrid(batch.exams)}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
      <hr className="h-16 border-transparent" />

      {/* Global Modals */}
      <ConfirmPasswordDialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) setDeletingId(null);
        }}
        title="Delete Exam"
        description="আপনি এই পরীক্ষাটি ডিলিট করতে যাচ্ছেন — এটি পার্মানেন্ট। আপনি কি নিশ্চিত?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
      <EditExamModal
        exam={editingExam!} // safe because isOpen checks
        isOpen={!!editingExam}
        onClose={() => setEditingExam(null)}
        onSuccess={(updatedExam) => {
          setExams((prev) =>
            prev.map((e) => (e.id === updatedExam.id ? updatedExam : e)),
          );
          setEditingExam(null);
        }}
      />
    </div>
  );
}

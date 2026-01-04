"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import BulkQuestionList from "@/components/BulkQuestionList";
import { fetchQuestions, type RawQuestion } from "@/lib/fetchQuestions";
import { Question, SubjectConfig } from "@/lib/types";
import { deleteQuestionAction } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import { CustomLoader, PageHeader, QuestionEditor } from "@/components";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ExamQuestionsPage() {
  const params = useParams();
  const exam_id = params.exam_id as string;

  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [examName, setExamName] = useState<string | undefined>(undefined);
  const [fileId, setFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<RawQuestion | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!exam_id) return;
    try {
      setLoading(true);
      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .eq("id", exam_id)
        .single();

      if (examData) {
        setExamName(examData.name || undefined);

        // Collect all question IDs from all sources (top-level, mandatory, optional)
        const allIds = new Set<string>();

        if (examData.question_ids && Array.isArray(examData.question_ids)) {
          examData.question_ids.forEach((id: string) => allIds.add(id));
        }

        const mSubs = (examData.mandatory_subjects as SubjectConfig[]) || [];
        const oSubs = (examData.optional_subjects as SubjectConfig[]) || [];

        mSubs.forEach((sub) => {
          if (sub?.question_ids && Array.isArray(sub.question_ids)) {
            sub.question_ids.forEach((id: string) => allIds.add(id));
          }
        });

        oSubs.forEach((sub) => {
          if (sub?.question_ids && Array.isArray(sub.question_ids)) {
            sub.question_ids.forEach((id: string) => allIds.add(id));
          }
        });

        // Prioritize specific question IDs if they exist
        if (allIds.size > 0) {
          // Pass undefined for file_id to avoid client-side filtering
          const fetched = await fetchQuestions(
            undefined,
            exam_id,
            undefined,
            undefined,
            undefined,
            Array.from(allIds),
          );
          setQuestions(fetched || []);
          // Use the file_id from the first question if we need a default for editing, or the exam's file_id
          if (fetched && fetched.length > 0 && fetched[0].file_id) {
            setFileId(String(fetched[0].file_id));
          } else if (examData.file_id) {
            setFileId(examData.file_id);
          }
        } else if (examData.file_id) {
          setFileId(examData.file_id);
          const fetched = await fetchQuestions(examData.file_id);
          setQuestions(fetched || []);
        } else {
          // If no file_id on exam, fetch questions by exam_id from Supabase via fetchQuestions
          const fetched = await fetchQuestions(undefined, exam_id);
          setQuestions(fetched || []);
          if (fetched && fetched.length > 0 && fetched[0].file_id) {
            setFileId(String(fetched[0].file_id));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [exam_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (question: RawQuestion) => {
    setEditingQuestion(question);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const result = await deleteQuestionAction(questionId);
      if (result.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        alert(
          "Failed to delete question: " + (result.message || "Unknown error"),
        );
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the question.");
    }
  };

  const handleSave = () => {
    setEditingQuestion(null);
    load();
  };

  if (loading) {
    return <CustomLoader />;
  }

  if (editingQuestion) {
    const isNew = !editingQuestion.id;
    return (
      <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
        <PageHeader
          title={isNew ? "নতুন প্রশ্ন যোগ করুন" : "প্রশ্ন এডিট করুন"}
          description={
            isNew
              ? `${examName || "পরীক্ষা"} এ নতুন প্রশ্ন যোগ করুন`
              : `${examName || "পরীক্ষা"} এর প্রশ্ন আপডেট করুন`
          }
        />
        <QuestionEditor
          file_id={fileId || "default"}
          exam_id={exam_id}
          initialQuestion={
            isNew
              ? undefined
              : ({
                  ...editingQuestion,
                  id: editingQuestion.id,
                  file_id: String(
                    editingQuestion.file_id || fileId || "default",
                  ),
                  question:
                    editingQuestion.question ||
                    editingQuestion.question_text ||
                    "",
                  question_text:
                    editingQuestion.question ||
                    editingQuestion.question_text ||
                    "",
                  options: editingQuestion.options || [],
                  answer: String(editingQuestion.answer || ""),
                  question_image:
                    (editingQuestion.question_image as string) ||
                    (editingQuestion.question_image_url as string) ||
                    undefined,
                  explanation_image:
                    (editingQuestion.explanation_image as string) ||
                    (editingQuestion.explanation_image_url as string) ||
                    undefined,
                } as Question)
          }
          onSave={handleSave}
          onCancel={() => setEditingQuestion(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <PageHeader
          title={examName || "পরীক্ষার প্রশ্নসমূহ"}
          description="এই পরীক্ষার সকল প্রশ্ন এখানে দেখা ও ম্যানেজ করা যাবে।"
        />
        <Button
          onClick={() => setEditingQuestion({} as RawQuestion)}
          className="w-full md:w-auto rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          নতুন প্রশ্ন যোগ করুন
        </Button>
      </div>
      <BulkQuestionList
        questions={questions}
        examName={examName}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

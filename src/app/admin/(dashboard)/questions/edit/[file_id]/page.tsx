"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  PageHeader,
  CustomLoader,
  EmptyState,
  QuestionEditor,
} from "@/components";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Trash2,
  Edit,
  Plus,
  Search,
  FileText,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useParams, useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import type { Question } from "@/lib/types";

// Lazy load LatexRenderer - only used in this page
const LatexRenderer = dynamic(() => import("@/components/LatexRenderer"), {
  loading: () => <span className="text-muted-foreground">Loading...</span>,
  ssr: false,
});

interface FileRecord {
  id: string;
  original_filename: string;
  display_name: string;
  uploaded_at: string;
  total_questions: number;
}

export default function EditFileQuestionsPage() {
  const { admin } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const file_id = params.file_id as string;

  const [file, setFile] = useState<FileRecord | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file_id) {
      fetchData();
    }
  }, [file_id, debouncedSearchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch File Details (only on first load or if needed)
      if (!file) {
        const filesResult = await apiRequest<FileRecord[]>("files", "GET");
        if (filesResult.success && Array.isArray(filesResult.data)) {
          const foundFile = filesResult.data.find((f) => f.id === file_id);
          setFile(foundFile || null);
        }
      }

      // Fetch Questions with search
      const params: Record<string, string> = { file_id };
      if (debouncedSearchTerm) {
        params.search = debouncedSearchTerm;
      }
      const questionsResult = await apiRequest<Question[]>(
        "questions",
        "GET",
        null,
        params,
      );
      if (questionsResult.success && Array.isArray(questionsResult.data)) {
        setQuestions(questionsResult.data);
      }
    } catch {
      setError("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const result = await apiRequest("delete-question", "DELETE", {
        id: questionId,
      });
      if (result.success) {
        fetchData();
      } else {
        alert(result.message || "Failed to delete question");
      }
    } catch {
      alert("Error deleting question");
    }
  };

  const handleSaveQuestion = async () => {
    await fetchData();
    setShowEditor(false);
    setEditingQuestion(null);
  };

  const filteredQuestions = questions; // Server-side filtered now

  if (!admin) {
    return <div className="p-8 text-center">Please log in as admin.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 md:gap-4">
        <CustomLoader />
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="container mx-auto p-2 md:p-4">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowEditor(false);
              setEditingQuestion(null);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> ফিরে যান
          </Button>
        </div>
        <PageHeader
          title={editingQuestion?.id ? "Edit Question" : "Add New Question"}
          description="Manage question details"
        />
        <div className="max-w-4xl mx-auto">
          <QuestionEditor
            file_id={file_id}
            initialQuestion={editingQuestion || undefined}
            onSave={handleSaveQuestion}
            onCancel={() => {
              setShowEditor(false);
              setEditingQuestion(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => router.push("/admin/questions")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight break-all">
              {file?.display_name ||
                file?.original_filename ||
                "ফাইল লোড হচ্ছে"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 font-bold">
                {questions.length} টি প্রশ্ন
              </Badge>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ID: {file_id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial rounded-xl gap-2"
            onClick={() => {
              const link = document.createElement("a");
              link.href = `/api/proxy?route=file&id=${file_id}`;
              link.download = file?.original_filename || "questions.csv";
              link.click();
            }}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-initial rounded-xl gap-2 shadow-lg shadow-primary/10"
            onClick={() => {
              setEditingQuestion({ id: "", file_id, question: "" } as Question);
              setShowEditor(true);
            }}
          >
            <Plus className="h-4 w-4" />
            নতুন প্রশ্ন
          </Button>
        </div>
      </div>

      {/* Search Area */}
      <Card className="border-none bg-muted/20">
        <CardContent className="p-2 md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              placeholder="এই ফাইল থেকে প্রশ্ন খুঁজুন..."
              className="w-full pl-10 pr-4 py-3 border-none rounded-2xl bg-background shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4 max-w-5xl mx-auto pb-20">
        {filteredQuestions.length === 0 ? (
          <EmptyState
            title="কোনো প্রশ্ন পাওয়া যায়নি"
            description={
              searchTerm
                ? "অন্য কোনো শব্দ দিয়ে খুঁজুন"
                : "এই ফাইলে এখনও কোনো প্রশ্ন যোগ করা হয়নি"
            }
            icon={<FileText className="h-16 w-16 text-muted-foreground/20" />}
          />
        ) : (
          filteredQuestions.map((q, idx) => (
            <Card
              key={q.id}
              className="overflow-hidden group hover:shadow-lg hover:border-primary/30 transition-all duration-300 border-muted-foreground/10 rounded-2xl"
            >
              <CardHeader className="p-2 md:p-5 pb-2 md:pb-3 flex flex-col sm:flex-row items-start justify-between gap-2 md:gap-4 bg-muted/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold h-5"
                    >
                      প্রশ্ন {idx + 1}
                    </Badge>
                    {(q.subject || q.paper || q.chapter || q.highlight) && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.subject && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200 font-normal"
                          >
                            {q.subject}
                          </Badge>
                        )}
                        {q.paper && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-green-50 text-green-600 border-green-200 font-normal"
                          >
                            {q.paper}
                          </Badge>
                        )}
                        {q.chapter && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-purple-50 text-purple-600 border-purple-200 font-normal"
                          >
                            {q.chapter}
                          </Badge>
                        )}
                        {q.highlight && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-200 font-normal"
                          >
                            {q.highlight}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-base md:text-lg font-medium leading-relaxed text-foreground">
                    <LatexRenderer html={q.question_text || q.question || ""} />
                  </div>
                  {q.question_image_url && (
                    <div className="mt-3 rounded-xl overflow-hidden border max-w-md bg-white">
                      <img
                        src={q.question_image_url}
                        alt="Question"
                        className="w-full h-auto object-contain max-h-[300px]"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 transition-all duration-300">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-sm"
                    onClick={() => {
                      setEditingQuestion(q);
                      setShowEditor(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-sm"
                    onClick={() => q.id && handleDeleteQuestion(q.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-5 pt-1 md:pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mt-2 md:mt-3">
                  {[q.option1, q.option2, q.option3, q.option4, q.option5]
                    .filter(Boolean)
                    .map((opt, i) => {
                      const isCorrect =
                        String(q.answer) === String(i + 1) ||
                        q.answer === String.fromCharCode(65 + i);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "text-sm p-3 rounded-xl border flex items-center gap-3 transition-all",
                            isCorrect
                              ? "bg-success/5 border-success/40 text-success font-medium ring-1 ring-success/20 shadow-sm"
                              : "bg-background border-border",
                          )}
                        >
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                              isCorrect
                                ? "bg-success text-white"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                          <div className="flex-1">
                            <LatexRenderer html={opt as string} />
                          </div>
                          {isCorrect && (
                            <Badge className="bg-success text-[8px] h-4 px-1.5 border-none">
                              সঠিক উত্তর
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
                {q.explanation && (
                  <div className="mt-5 p-4 bg-muted/30 rounded-2xl text-sm border border-dashed border-muted-foreground/20">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                      <FileText className="h-3.5 w-3.5" />
                      ব্যাখ্যা
                    </div>
                    <div className="text-muted-foreground leading-relaxed">
                      <LatexRenderer html={q.explanation} />
                    </div>
                    {q.explanation_image_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border max-w-sm bg-white relative h-[200px]">
                        <Image
                          src={q.explanation_image_url}
                          alt="Explanation"
                          fill
                          className="object-contain"
                          priority={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

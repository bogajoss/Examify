"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { fetchQuestions, type RawQuestion } from "@/lib/fetchQuestions";
import { apiRequest } from "@/lib/api";
import LatexRenderer from "@/components/LatexRenderer";
import { CustomLoader } from "@/components";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileRecord {
  id: string;
  original_filename: string;
  display_name: string;
  uploaded_at: string;
  total_questions: number;
}

interface QuestionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  minimal?: boolean;
}

export default function QuestionSelector({
  selectedIds,
  onChange,
  minimal = false,
}: QuestionSelectorProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    subject: "all",
    paper: "all",
    chapter: "all",
    highlight: "all",
  });

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoadingFiles(true);
        const result = await apiRequest<Record<string, unknown>>(
          "files",
          "GET",
        );
        if (result.success && result.data) {
          setFiles(
            (Array.isArray(result.data) ? result.data : []) as FileRecord[],
          );
        } else if (Array.isArray(result)) {
          setFiles(result as FileRecord[]);
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setLoadingFiles(false);
      }
    }
    loadFiles();
  }, []);

  useEffect(() => {
    async function loadQuestions() {
      if (!selectedFileId) {
        setQuestions([]);
        return;
      }

      try {
        setLoadingQuestions(true);
        const data = await fetchQuestions(selectedFileId);
        setQuestions(data);
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQuestions();
  }, [selectedFileId]);

  const filteredFiles = files.filter((f) =>
    (f.display_name || f.original_filename)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = (q.question_text || q.question || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSubject =
      filters.subject === "all" || q.subject === filters.subject;
    const matchesPaper = filters.paper === "all" || q.paper === filters.paper;
    const matchesChapter =
      filters.chapter === "all" || q.chapter === filters.chapter;
    const matchesHighlight =
      filters.highlight === "all" || q.highlight === filters.highlight;

    return (
      matchesSearch &&
      matchesSubject &&
      matchesPaper &&
      matchesChapter &&
      matchesHighlight
    );
  });

  const toggleQuestion = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const uniqueSubjects = Array.from(
    new Set(questions.map((q) => q.subject).filter(Boolean)),
  );
  const uniquePapers = Array.from(
    new Set(questions.map((q) => q.paper).filter(Boolean)),
  );
  const uniqueChapters = Array.from(
    new Set(questions.map((q) => q.chapter).filter(Boolean)),
  );
  const uniqueHighlights = Array.from(
    new Set(questions.map((q) => q.highlight).filter(Boolean)),
  );

  const selectedFile = files.find((f) => f.id === selectedFileId);

  return (
    <div
      className={cn(
        minimal ? "space-y-2" : "space-y-3",
        !minimal && "border rounded-2xl p-3 md:p-4 bg-muted/10",
      )}
    >
      {/* Header & Search */}
      <div className={cn("flex flex-col", minimal ? "gap-2" : "gap-3")}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs md:text-sm font-bold flex items-center gap-2">
            {selectedFileId ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -ml-2 rounded-lg hover:bg-primary/10 text-primary"
                onClick={() => {
                  setSelectedFileId(null);
                  setSearchTerm("");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
              </Button>
            ) : (
              <>
                <FileText className="h-4 w-4 text-primary" />
                প্রশ্নপত্রের সেট বাছুন
              </>
            )}
          </h3>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 rounded-full"
          >
            {selectedIds.length} নির্বাচিত
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={selectedFileId ? "প্রশ্ন খুঁজুন..." : "ফাইল খুঁজুন..."}
            className="pl-9 bg-background rounded-xl h-10 text-sm border-muted-foreground/20 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedFileId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            <Select
              value={filters.subject}
              onValueChange={(v) => setFilters((f) => ({ ...f, subject: v }))}
            >
              <SelectTrigger className="h-8 text-[10px] rounded-lg">
                <SelectValue placeholder="বিষয়" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব বিষয়</SelectItem>
                {uniqueSubjects.map((s) => (
                  <SelectItem key={s} value={s as string}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.paper}
              onValueChange={(v) => setFilters((f) => ({ ...f, paper: v }))}
            >
              <SelectTrigger className="h-8 text-[10px] rounded-lg">
                <SelectValue placeholder="পত্র" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব পত্র</SelectItem>
                {uniquePapers.map((p) => (
                  <SelectItem key={p} value={p as string}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.chapter}
              onValueChange={(v) => setFilters((f) => ({ ...f, chapter: v }))}
            >
              <SelectTrigger className="h-8 text-[10px] rounded-lg">
                <SelectValue placeholder="অধ্যায়" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব অধ্যায়</SelectItem>
                {uniqueChapters.map((c) => (
                  <SelectItem key={c} value={c as string}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.highlight}
              onValueChange={(v) => setFilters((f) => ({ ...f, highlight: v }))}
            >
              <SelectTrigger className="h-8 text-[10px] rounded-lg">
                <SelectValue placeholder="হাইলাইট" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব হাইলাইট</SelectItem>
                {uniqueHighlights.map((h) => (
                  <SelectItem key={h} value={h as string}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content Area */}
      <ScrollArea className="h-[300px] md:h-[350px] -mr-2 pr-2">
        {loadingFiles || loadingQuestions ? (
          <div className="flex flex-col items-center justify-center p-12">
            <CustomLoader />
          </div>
        ) : !selectedFileId ? (
          /* File List View */
          <div className="space-y-1">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    setSelectedFileId(file.id);
                    setSearchTerm("");
                  }}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="truncate max-w-[180px] md:max-w-[220px]">
                      <p className="text-sm font-semibold truncate">
                        {file.display_name || file.original_filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {file.total_questions} টি প্রশ্ন
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">
                কোনো ফাইল পাওয়া যায়নি
              </p>
            )}
          </div>
        ) : (
          /* Question Selection View */
          <div className="space-y-2">
            <div className="bg-primary/5 p-2 rounded-xl mb-3 flex items-center justify-between border border-primary/10 sticky top-0 z-10 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-primary px-2 truncate max-w-[150px]">
                {selectedFile?.display_name || selectedFile?.original_filename}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] rounded-lg font-bold hover:bg-primary/10 text-primary"
                onClick={() => {
                  const allQIds = filteredQuestions.map((q) => q.id || "");
                  const allSelected = allQIds.every((id) =>
                    selectedIds.includes(id),
                  );
                  if (allSelected) {
                    onChange(selectedIds.filter((id) => !allQIds.includes(id)));
                  } else {
                    const newIds = [...new Set([...selectedIds, ...allQIds])];
                    onChange(newIds);
                  }
                }}
              >
                সবগুলো
              </Button>
            </div>

            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => {
                const isSelected = selectedIds.includes(q.id || "");
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.99]",
                      isSelected
                        ? "bg-primary/5 border-primary/30 ring-1 ring-primary/5"
                        : "bg-background border-border hover:border-primary/20",
                    )}
                    onClick={() => toggleQuestion(q.id || "")}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn(
                          "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-primary border-primary text-white scale-110 shadow-sm"
                            : "border-muted-foreground/20 bg-background",
                        )}
                      >
                        {isSelected && (
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="text-xs md:text-sm leading-relaxed font-semibold break-words">
                        <LatexRenderer
                          html={q.question_text || q.question || ""}
                        />
                        {q.question_image_url && (
                          <div className="mt-2">
                            <img
                              src={q.question_image_url}
                              alt="Question"
                              className="max-h-40 rounded-lg border object-contain bg-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {(Array.isArray(q.options) ? q.options : []).map(
                          (opt, idx) => {
                            const isCorrect = idx === Number(q.answer);
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "text-[11px] md:text-xs p-2 rounded-lg border flex items-start gap-2",
                                  isCorrect
                                    ? "bg-green-50 border-green-200 text-green-900"
                                    : "bg-muted/30 border-transparent text-muted-foreground",
                                )}
                              >
                                <span
                                  className={cn(
                                    "font-bold shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px]",
                                    isCorrect
                                      ? "bg-green-200 text-green-800"
                                      : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <div className="min-w-0 break-words">
                                  <LatexRenderer html={opt} />
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>

                      {(q.explanation || q.explanation_image_url) && (
                        <div className="text-[11px] md:text-xs bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50 text-muted-foreground">
                          <span className="font-bold text-blue-600 block mb-1 text-[10px] uppercase tracking-wider">
                            ব্যাখ্যা
                          </span>
                          <div className="break-words">
                            <LatexRenderer html={q.explanation || ""} />
                          </div>
                          {q.explanation_image_url && (
                            <div className="mt-2">
                              <img
                                src={q.explanation_image_url}
                                alt="Explanation"
                                className="max-h-32 rounded border object-contain bg-white"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-[9px] text-muted-foreground flex items-center gap-2 flex-wrap pt-1 border-t border-dashed">
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          ID: {q.id?.substring(0, 6)}
                        </span>
                        {q.subject && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-blue-50 text-blue-600 border-blue-200 font-normal"
                          >
                            {q.subject}
                          </Badge>
                        )}
                        {q.paper && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-green-50 text-green-600 border-green-200 font-normal"
                          >
                            {q.paper}
                          </Badge>
                        )}
                        {q.chapter && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-purple-50 text-purple-600 border-purple-200 font-normal"
                          >
                            {q.chapter}
                          </Badge>
                        )}
                        {q.highlight && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 bg-amber-50 text-amber-600 border-amber-200 font-normal"
                          >
                            {q.highlight}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">
                এই ফাইলে কোনো প্রশ্ন পাওয়া যায়নি
              </p>
            )}
          </div>
        )}
      </ScrollArea>

      {selectedFileId && (
        <div className="pt-2 border-t flex justify-between items-center gap-2">
          <p className="text-[9px] text-muted-foreground italic leading-none">
            টিপস: প্রশ্নের ওপর ট্যাপ করে সিলেক্ট করুন
          </p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-[10px] font-bold text-primary"
            onClick={() => setSelectedFileId(null)}
          >
            ফাইল পরিবর্তন
          </Button>
        </div>
      )}
    </div>
  );
}

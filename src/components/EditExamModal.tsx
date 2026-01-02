"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Exam, SubjectConfig, Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { updateExam } from "@/lib/actions";
import { CSVUploadComponent, CustomLoader } from "@/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import QuestionSelector from "./QuestionSelector";
import { ListChecks, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { combineLocalDateTime, parseLocalDateTime } from "@/lib/utils";
import { fetchQuestions } from "@/lib/fetchQuestions";

const subjects = [
  { id: "p", name: "পদার্থবিজ্ঞান" },
  { id: "c", name: "রসায়ন" },
  { id: "m", name: "উচ্চতর গণিত" },
  { id: "b", name: "জীববিজ্ঞান" },
  { id: "bm", name: "জীববিজ্ঞান + উচ্চতর গণিত" },
  { id: "bn", name: "বাংলা" },
  { id: "e", name: "ইংরেজী" },
  { id: "i", name: "আইসিটি" },
  { id: "gk", name: "জিকে" },
  { id: "iq", name: "আইকিউ" },
];

const bengaliToEnglishNumber = (str: string) => {
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let newStr = str;
  for (let i = 0; i < 10; i++) {
    newStr = newStr.replace(new RegExp(bengaliNumerals[i], "g"), i.toString());
  }
  return newStr;
};

interface EditExamModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedExam: Exam) => void;
}

const hours12 = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

const normalizeSubjects = (
  subs: string[] | SubjectConfig[] | null | undefined,
  type: "mandatory" | "optional",
): SubjectConfig[] => {
  if (!subs) return [];
  if (subs.length === 0) return [];
  if (typeof subs[0] === "string") {
    return (subs as string[]).map((id) => {
      const found = subjects.find((s) => s.id === id);
      return {
        id,
        name: found ? found.name : `Subject ${id}`,
        count: 0,
        question_ids: [],
        type,
      };
    });
  }
  return (subs as SubjectConfig[]).map((s) => ({
    ...s,
    type,
    name:
      s.name ||
      subjects.find((sub) => sub.id === s.id)?.name ||
      `Subject ${s.id}`,
  }));
};

export function EditExamModal({
  exam,
  isOpen,
  onClose,
  onSuccess,
}: EditExamModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [mode, setMode] = useState<"live" | "practice">("live");
  const formRef = useRef<HTMLFormElement>(null);
  const [shuffle, setShuffle] = useState(false);
  const [isCustomExam, setIsCustomExam] = useState(false);
  const [useQuestionBank, setUseQuestionBank] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState(subjects);
  const [numberOfAttempts, setNumberOfAttempts] = useState<
    "one_time" | "multiple"
  >("one_time");

  // New state for Subject Configs
  const [mandatorySubjects, setMandatorySubjects] = useState<SubjectConfig[]>(
    [],
  );
  const [optionalSubjects, setOptionalSubjects] = useState<SubjectConfig[]>([]);

  // Legacy global selection (still used if not custom exam or as fallback)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<string>("");
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");

  const [endDate, setEndDate] = useState<string>("");
  const [endHour, setEndHour] = useState("12");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("AM");

  const [isEnabled, setIsEnabled] = useState(true);

  const [activeSubjectSelection, setActiveSubjectSelection] = useState<{
    id: string;
    type: "mandatory" | "optional";
  } | null>(null);

  useEffect(() => {
    const initModal = async () => {
      if (!exam || !isOpen) return;

      setIsLoadingData(true);
      try {
        formRef.current?.reset();
        setMode(
          (exam?.is_practice ? "practice" : "live") as "live" | "practice",
        );
        setShuffle(exam?.shuffle_questions || false);
        setNumberOfAttempts(exam?.number_of_attempts || "one_time");
        setIsEnabled(exam?.status === "live");

        // Fetch full exam details to get ALL questions if not present
        let currentQuestions = exam.questions || [];
        
        // Collect all question IDs from all sources
        const allIds = new Set<string>();
        if (exam.question_ids) {
            exam.question_ids.forEach(id => allIds.add(id));
        }
        
        const mSubsRaw = normalizeSubjects(exam.mandatory_subjects, "mandatory");
        const oSubsRaw = normalizeSubjects(exam.optional_subjects, "optional");
        
        mSubsRaw.forEach(s => s.question_ids?.forEach(id => allIds.add(id)));
        oSubsRaw.forEach(s => s.question_ids?.forEach(id => allIds.add(id)));
        
        if (currentQuestions.length === 0) {
          if (allIds.size > 0) {
             const fetched = await fetchQuestions(
                undefined, 
                undefined, 
                undefined, 
                undefined, 
                undefined, 
                Array.from(allIds)
             );
             if (Array.isArray(fetched)) {
                currentQuestions = fetched.map((q) => ({
                  ...q,
                  id: String(q.id),
                  question: q.question || q.question_text || "",
                  options: q.options || [],
                  answer: q.answer || 0,
                })) as Question[];
             }
          } else if (exam.file_id) {
            const fetched = await fetchQuestions(exam.file_id, exam.id);
            if (Array.isArray(fetched)) {
              // Map RawQuestion to Question
              currentQuestions = fetched.map((q) => ({
                ...q,
                id: String(q.id),
                question: q.question || q.question_text || "",
                options: q.options || [],
                answer: q.answer || 0,
              })) as Question[];
            }
          }
        }

        const mSubs = mSubsRaw;
        const oSubs = oSubsRaw;

        // Sync counts from actual questions if they are 0
        const syncCounts = (configs: SubjectConfig[]) => {
          return configs.map((config) => {
            if (config.count && config.count > 0) return config;

            // Try to find questions for this section
            const sectionQuestions = currentQuestions.filter(
              (q) =>
                q.subject === config.id ||
                q.subject === config.name ||
                (config.question_ids &&
                  config.question_ids.includes(String(q.id))),
            );

            if (sectionQuestions.length > 0) {
              return {
                ...config,
                count: sectionQuestions.length,
                question_ids: config.question_ids?.length
                  ? config.question_ids
                  : sectionQuestions.map((q) => String(q.id)),
              };
            }
            return config;
          });
        };

        const syncedM = syncCounts(mSubs);
        const syncedO = syncCounts(oSubs);

        const hasSections = syncedM.length > 0 || syncedO.length > 0;
        setIsCustomExam(
          (!!exam.total_subjects && exam.total_subjects > 0) || hasSections,
        );
        setUseQuestionBank(
          !!(exam.question_ids && exam.question_ids.length > 0) && !hasSections,
        );

        setMandatorySubjects(syncedM);
        setOptionalSubjects(syncedO);

        // Populate available subjects
        const existingSubjects = [...syncedM, ...syncedO];
        setAvailableSubjects((prev) => {
          const combined = [...prev];
          existingSubjects.forEach((s) => {
            if (!combined.find((item) => item.id === s.id)) {
              combined.push({ id: s.id, name: s.name || `Subject ${s.id}` });
            }
          });
          return combined;
        });

        setSelectedQuestionIds(exam.question_ids || []);

        if (exam.start_at) {
          const { dateStr, hour, minute, period } = parseLocalDateTime(
            exam.start_at,
          );
          setStartDate(dateStr || "");
          setStartHour(hour);
          setStartMinute(minute);
          setStartPeriod(period);
        }

        if (exam.end_at) {
          const { dateStr, hour, minute, period } = parseLocalDateTime(
            exam.end_at,
          );
          setEndDate(dateStr || "");
          setEndHour(hour);
          setEndMinute(minute);
          setEndPeriod(period);
        }
      } catch (err) {
        console.error("Error initializing modal:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    initModal();
  }, [exam, isOpen]);

  const handleNumberInput = (e: FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    input.value = bengaliToEnglishNumber(input.value);
  };

  const updateSubjectConfig = (
    subjectId: string,
    type: "mandatory" | "optional",
    field: keyof SubjectConfig,
    value: string | number | string[],
  ) => {
    const updater = (prev: SubjectConfig[]) =>
      prev.map((s) => (s.id === subjectId ? { ...s, [field]: value } : s));

    if (type === "mandatory") setMandatorySubjects(updater);
    else setOptionalSubjects(updater);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    if (exam?.id) {
      formData.append("id", exam.id);
    }
    if (exam?.batch_id) {
      formData.append("batch_id", exam.batch_id);
    }

    const startAtISO = combineLocalDateTime(
      startDate,
      startHour,
      startMinute,
      startPeriod,
    );
    const endAtISO = combineLocalDateTime(
      endDate,
      endHour,
      endMinute,
      endPeriod,
    );

    if (startAtISO) formData.set("start_at", startAtISO);
    if (endAtISO) formData.set("end_at", endAtISO);

    // Aggregate all question IDs
    const allQuestionIds = new Set<string>(selectedQuestionIds);

    if (isCustomExam) {
      mandatorySubjects.forEach((s) =>
        s.question_ids?.forEach((qid) => allQuestionIds.add(qid)),
      );
      optionalSubjects.forEach((s) =>
        s.question_ids?.forEach((qid) => allQuestionIds.add(qid)),
      );

      // Serialize subject configs
      formData.set("mandatory_subjects", JSON.stringify(mandatorySubjects));
      formData.set("optional_subjects", JSON.stringify(optionalSubjects));
    } else {
      // Fallback to simple string array if not custom exam (legacy support)
      formData.set(
        "mandatory_subjects",
        JSON.stringify(mandatorySubjects.map((s) => s.id)),
      );
      formData.set(
        "optional_subjects",
        JSON.stringify(optionalSubjects.map((s) => s.id)),
      );
    }

    formData.set("question_ids", JSON.stringify(Array.from(allQuestionIds)));
    formData.set("is_enabled", isEnabled ? "1" : "0");

    const result = await updateExam(formData);
    if (result.success) {
      toast({ title: "পরীক্ষা সফলভাবে আপডেট করা হয়েছে!" });
      if (onSuccess && result.data) {
        onSuccess(result.data as Exam);
      }
      onClose();
    } else {
      toast({
        title: "পরীক্ষা আপডেট করতে সমস্যা হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] w-[95vw] rounded-2xl md:max-w-2xl p-4 md:p-6 overflow-y-auto flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>পরীক্ষা সম্পাদন করুন</DialogTitle>
            <DialogDescription>
              নিচে পরীক্ষার বিবরণ আপডেট করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <CustomLoader />
                <p className="text-sm font-bold text-primary animate-pulse">
                  তথ্য লোড হচ্ছে...
                </p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-name-edit">পরীক্ষার নাম</Label>
                  <Input
                    id="exam-name-edit"
                    type="text"
                    name="name"
                    defaultValue={exam?.name || ""}
                    placeholder="পরীক্ষার নাম"
                    required
                  />
                </div>
                <input
                  type="hidden"
                  name="course_name"
                  value={exam?.course_name || ""}
                />
                <input
                  type="hidden"
                  name="description"
                  value={exam?.description || ""}
                />
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes-edit">সময় (মিনিট)</Label>
                  <Input
                    id="duration_minutes-edit"
                    type="number"
                    name="duration_minutes"
                    defaultValue={String(exam?.duration_minutes || "")}
                    placeholder="সময় (মিনিট)"
                    onInput={handleNumberInput}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marks_per_question-edit">
                    প্রশ্ন প্রতি মার্ক
                  </Label>
                  <Input
                    id="marks_per_question-edit"
                    type="number"
                    step="0.1"
                    name="marks_per_question"
                    defaultValue={String(exam?.marks_per_question || "1")}
                    placeholder="প্রশ্ন প্রতি মার্ক"
                    onInput={handleNumberInput}
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Label>পরীক্ষার মোড</Label>
                  <Select
                    value={mode}
                    onValueChange={(value) =>
                      setMode(value as "live" | "practice")
                    }
                  >
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="পরীক্ষার মোড নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">লাইভ (Time-limited)</SelectItem>
                      <SelectItem value="practice">
                        প্রাকটিস (আনলিমিটেড)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mode === "live" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          শুরুর তারিখ
                        </Label>
                        <Input
                          type="date"
                          value={startDate || ""}
                          onChange={(e) => setStartDate(e.target.value || "")}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          শুরুর সময়
                        </Label>
                        <div className="flex gap-1 items-center">
                          <Select
                            value={startHour}
                            onValueChange={setStartHour}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="ঘন্টা" />
                            </SelectTrigger>
                            <SelectContent>
                              {hours12.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-lg font-bold text-muted-foreground">
                            :
                          </span>
                          <Select
                            value={startMinute}
                            onValueChange={setStartMinute}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="মিনিট" />
                            </SelectTrigger>
                            <SelectContent>
                              {minutes.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={startPeriod}
                            onValueChange={(v) =>
                              setStartPeriod(v as "AM" | "PM")
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          শেষের তারিখ
                        </Label>
                        <Input
                          type="date"
                          value={endDate || ""}
                          onChange={(e) => setEndDate(e.target.value || "")}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          শেষের সময়
                        </Label>
                        <div className="flex gap-1 items-center">
                          <Select value={endHour} onValueChange={setEndHour}>
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="ঘন্টা" />
                            </SelectTrigger>
                            <SelectContent>
                              {hours12.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-lg font-bold text-muted-foreground">
                            :
                          </span>
                          <Select
                            value={endMinute}
                            onValueChange={setEndMinute}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="মিনিট" />
                            </SelectTrigger>
                            <SelectContent>
                              {minutes.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={endPeriod}
                            onValueChange={(v) =>
                              setEndPeriod(v as "AM" | "PM")
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="negative_marks-edit">নেগেটিভ মার্ক</Label>
                  <Input
                    id="negative_marks-edit"
                    type="number"
                    step="0.01"
                    name="negative_marks_per_wrong"
                    defaultValue={String(exam?.negative_marks_per_wrong || "")}
                    placeholder="নেগেটিভ মার্ক"
                    onInput={handleNumberInput}
                  />
                </div>
                <input
                  name="is_practice"
                  type="hidden"
                  value={mode === "practice" ? "true" : "false"}
                />
                {!isCustomExam && (
                  <input
                    type="hidden"
                    name="file_id"
                    defaultValue={exam?.file_id || ""}
                  />
                )}

                {!isCustomExam && (
                  <>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="use-question-bank-toggle-edit"
                        checked={useQuestionBank}
                        onCheckedChange={(checked) =>
                          setUseQuestionBank(checked as boolean)
                        }
                      />
                      <Label htmlFor="use-question-bank-toggle-edit">
                        প্রশ্ন ব্যাংক থেকে প্রশ্ন বাছুন
                      </Label>
                    </div>

                    {useQuestionBank && (
                      <div className="space-y-2 p-4 border rounded-md bg-muted/30">
                        <Label className="text-sm font-semibold">
                          প্রশ্ন নির্বাচন
                        </Label>
                        <QuestionSelector
                          selectedIds={selectedQuestionIds}
                          onChange={setSelectedQuestionIds}
                          minimal
                        />
                      </div>
                    )}

                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">
                        অথবা CSV থেকে প্রশ্ন আপলোড করুন
                      </h3>
                      <CSVUploadComponent
                        isBank={false}
                        onUploadSuccess={async (result) => {
                          const fid = (result.file_id as string) || "";
                          if (!fid) {
                            console.error(
                              "Upload success but no file_id in result:",
                              result,
                            );
                            toast({
                              title: "Error identifying uploaded file",
                              variant: "destructive",
                            });
                            return;
                          }

                          if (formRef.current) {
                            const fileIdInput = formRef.current.querySelector(
                              'input[name="file_id"]',
                            ) as HTMLInputElement;
                            if (fileIdInput) fileIdInput.value = fid;
                          }

                          // Auto-group by sections if CSV has them
                          try {
                            const qs = await fetchQuestions(
                              fid,
                              undefined,
                              5000,
                            );
                            if (qs && qs.length > 0) {
                              const sectionMap = new Map<string, string[]>();
                              qs.forEach((q) => {
                                const section = String(
                                  q.subject || q.type || "1",
                                );
                                if (!sectionMap.has(section)) {
                                  sectionMap.set(section, []);
                                }
                                if (q.id)
                                  sectionMap.get(section)?.push(String(q.id));
                              });

                              if (sectionMap.size > 0) {
                                const newSubjects = Array.from(
                                  sectionMap.keys(),
                                ).map((s) => ({
                                  id: s,
                                  name: `Section ${s}`,
                                }));
                                setAvailableSubjects(newSubjects);
                                setIsCustomExam(true);

                                const configs: SubjectConfig[] = Array.from(
                                  sectionMap.entries(),
                                ).map(([s, ids]) => ({
                                  id: s,
                                  name: `Section ${s}`,
                                  count: ids.length,
                                  question_ids: ids,
                                  type: "mandatory",
                                }));
                                setMandatorySubjects(configs);
                                setOptionalSubjects([]);
                                toast({
                                  title: "CSV Grouping Successful",
                                  description: `Detected ${sectionMap.size} sections.`,
                                });
                              }
                            }
                          } catch (err) {
                            console.error("Error auto-grouping:", err);
                          }
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shuffle_questions_edit"
                      name="shuffle_questions"
                      checked={shuffle}
                      onCheckedChange={(checked) =>
                        setShuffle(checked as boolean)
                      }
                      value="true"
                    />
                    <Label htmlFor="shuffle_questions_edit">
                      প্রশ্নগুলো এলোমেলো করুন
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_enabled_edit"
                      checked={isEnabled}
                      onCheckedChange={setIsEnabled}
                    />
                    <Label htmlFor="is_enabled_edit">পরীক্ষা সক্রিয়</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number-of-attempts-edit">
                      পরীক্ষা দেওয়ার সংখ্যা
                    </Label>
                    <Select
                      value={numberOfAttempts}
                      onValueChange={(value) =>
                        setNumberOfAttempts(value as "one_time" | "multiple")
                      }
                    >
                      <SelectTrigger id="number-of-attempts-edit">
                        <SelectValue placeholder="চেষ্টার সংখ্যা নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">একবার মাত্র</SelectItem>
                        <SelectItem value="multiple">একাধিকবার</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="number_of_attempts"
                      value={numberOfAttempts}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="custom-exam-toggle-edit"
                    checked={isCustomExam}
                    onCheckedChange={(checked) =>
                      setIsCustomExam(checked as boolean)
                    }
                  />
                  <Label htmlFor="custom-exam-toggle-edit">
                    কাস্টম এক্সাম (বিষয় ভিত্তিক)
                  </Label>
                </div>

                {isCustomExam && (
                  <div className="space-y-4 p-4 border rounded-md bg-background/50">
                    <div className="space-y-2">
                      <Label htmlFor="total_subjects-edit">মোট বিষয়</Label>
                      <Input
                        id="total_subjects-edit"
                        name="total_subjects"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g., 4"
                        defaultValue={exam?.total_subjects || ""}
                        onInput={handleNumberInput}
                      />
                    </div>

                    {/* Mandatory Sections */}
                    <div className="space-y-4">
                      <Label className="text-base font-bold flex items-center justify-between">
                        <span>বাধ্যতামূলক বিষয় (Mandatory)</span>
                        <Badge variant="secondary">
                          {mandatorySubjects.length}
                        </Badge>
                      </Label>
                      <div className="space-y-3">
                        {mandatorySubjects.map((subject, index) => (
                          <div
                            key={`mandatory-item-${subject.id}`}
                            className="p-3 rounded-lg border bg-background relative group hover:border-primary/50 transition-colors"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs w-6">
                                  {index + 1}.
                                </span>
                                <Input
                                  className="h-9 font-bold text-sm bg-background border-2 border-primary/20 focus:border-primary transition-all"
                                  value={subject.name || ""}
                                  onChange={(e) =>
                                    updateSubjectConfig(
                                      subject.id,
                                      "mandatory",
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="সেকশনের নাম লিখুন"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={index === 0}
                                    onClick={() => {
                                      setMandatorySubjects((prev) => {
                                        const newArr = [...prev];
                                        [newArr[index - 1], newArr[index]] = [
                                          newArr[index],
                                          newArr[index - 1],
                                        ];
                                        return newArr;
                                      });
                                    }}
                                    title="উপরে নিন"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={
                                      index === mandatorySubjects.length - 1
                                    }
                                    onClick={() => {
                                      setMandatorySubjects((prev) => {
                                        const newArr = [...prev];
                                        [newArr[index], newArr[index + 1]] = [
                                          newArr[index + 1],
                                          newArr[index],
                                        ];
                                        return newArr;
                                      });
                                    }}
                                    title="নিচে নিন"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pl-8 mt-1">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Count"
                                    className="h-8 w-20 text-xs border-dashed"
                                    value={subject.count || 0}
                                    onChange={(e) =>
                                      updateSubjectConfig(
                                        subject.id,
                                        "mandatory",
                                        "count",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    টি প্রশ্ন
                                  </span>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs bg-primary/5 hover:bg-primary/10"
                                  onClick={() =>
                                    setActiveSubjectSelection({
                                      id: subject.id,
                                      type: "mandatory",
                                    })
                                  }
                                >
                                  <ListChecks className="w-3 h-3 mr-1 text-primary" />
                                  প্রশ্ন বাছুন (
                                  {subject.question_ids?.length || 0})
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-50"
                                  onClick={() => {
                                    setMandatorySubjects((prev) =>
                                      prev.filter((s) => s.id !== subject.id),
                                    );
                                    setOptionalSubjects((prev) => [
                                      ...prev,
                                      { ...subject, type: "optional" },
                                    ]);
                                  }}
                                  title="Move to Optional"
                                >
                                  <ArrowDown className="w-3 h-3 mr-1" />
                                  ঐচ্ছিক করুন
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-auto"
                                  onClick={() =>
                                    setMandatorySubjects((prev) =>
                                      prev.filter((s) => s.id !== subject.id),
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {mandatorySubjects.length === 0 && (
                          <div className="text-center p-4 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                            বাধ্যতামূলক কোনো সেকশন যোগ করা হয়নি।
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Optional Sections */}
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-base font-bold flex items-center justify-between">
                        <span>অন্যান্য বিষয় (Optional)</span>
                        <Badge variant="secondary">
                          {optionalSubjects.length}
                        </Badge>
                      </Label>
                      <div className="space-y-3">
                        {optionalSubjects.map((subject, index) => (
                          <div
                            key={`optional-item-${subject.id}`}
                            className="p-3 rounded-lg border bg-secondary/5 relative group hover:border-secondary/50 transition-colors"
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs w-6">
                                  {index + 1}.
                                </span>
                                <Input
                                  className="h-9 font-bold text-sm bg-background border-2 border-secondary/20 focus:border-secondary transition-all"
                                  value={subject.name || ""}
                                  onChange={(e) =>
                                    updateSubjectConfig(
                                      subject.id,
                                      "optional",
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="সেকশনের নাম লিখুন"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={index === 0}
                                    onClick={() => {
                                      setOptionalSubjects((prev) => {
                                        const newArr = [...prev];
                                        [newArr[index - 1], newArr[index]] = [
                                          newArr[index],
                                          newArr[index - 1],
                                        ];
                                        return newArr;
                                      });
                                    }}
                                    title="উপরে নিন"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={
                                      index === optionalSubjects.length - 1
                                    }
                                    onClick={() => {
                                      setOptionalSubjects((prev) => {
                                        const newArr = [...prev];
                                        [newArr[index], newArr[index + 1]] = [
                                          newArr[index + 1],
                                          newArr[index],
                                        ];
                                        return newArr;
                                      });
                                    }}
                                    title="নিচে নিন"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pl-8 mt-1">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Count"
                                    className="h-8 w-20 text-xs border-dashed"
                                    value={subject.count || 0}
                                    onChange={(e) =>
                                      updateSubjectConfig(
                                        subject.id,
                                        "optional",
                                        "count",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    টি প্রশ্ন
                                  </span>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs bg-secondary/10 hover:bg-secondary/20"
                                  onClick={() =>
                                    setActiveSubjectSelection({
                                      id: subject.id,
                                      type: "optional",
                                    })
                                  }
                                >
                                  <ListChecks className="w-3 h-3 mr-1 text-secondary-foreground" />
                                  প্রশ্ন বাছুন (
                                  {subject.question_ids?.length || 0})
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => {
                                    setOptionalSubjects((prev) =>
                                      prev.filter((s) => s.id !== subject.id),
                                    );
                                    setMandatorySubjects((prev) => [
                                      ...prev,
                                      { ...subject, type: "mandatory" },
                                    ]);
                                  }}
                                  title="Move to Mandatory"
                                >
                                  <ArrowUp className="w-3 h-3 mr-1" />
                                  বাধ্যতামূলক করুন
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-auto"
                                  onClick={() =>
                                    setOptionalSubjects((prev) =>
                                      prev.filter((s) => s.id !== subject.id),
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {optionalSubjects.length === 0 && (
                          <div className="text-center p-4 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                            ঐচ্ছিক কোনো সেকশন যোগ করা হয়নি।
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add New Section */}
                    <div className="pt-4 border-t flex gap-2 items-center">
                      <Select
                        onValueChange={(val) => {
                          const subject = availableSubjects.find(
                            (s) => s.id === val,
                          );
                          if (subject) {
                            setMandatorySubjects((prev) => [
                              ...prev,
                              {
                                ...subject,
                                type: "mandatory",
                                count: 0,
                                question_ids: [],
                              },
                            ]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="সেকশন যোগ করুন..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects
                            .filter(
                              (s) =>
                                !mandatorySubjects.some((m) => m.id === s.id) &&
                                !optionalSubjects.some((o) => o.id === s.id),
                            )
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const newId = `custom_${Date.now()}`;
                          const newSubject = { id: newId, name: "New Section" };
                          setAvailableSubjects((prev) => [...prev, newSubject]);
                          setMandatorySubjects((prev) => [
                            ...prev,
                            {
                              ...newSubject,
                              type: "mandatory",
                              count: 0,
                              question_ids: [],
                            },
                          ]);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        কাস্টম সেকশন তৈরি করুন
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <CustomLoader minimal />
                  ) : (
                    "পরীক্ষা আপডেট করুন"
                  )}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Secondary Dialog for Subject Question Selection */}
      <Dialog
        open={!!activeSubjectSelection}
        onOpenChange={(open) => !open && setActiveSubjectSelection(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle>
              {activeSubjectSelection &&
                availableSubjects.find(
                  (s) => s.id === activeSubjectSelection.id,
                )?.name}{" "}
              - প্রশ্ন নির্বাচন
            </DialogTitle>
            <DialogDescription>
              এই বিষয়ের জন্য প্রশ্ন নির্বাচন করুন
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4">
            {activeSubjectSelection && (
              <QuestionSelector
                selectedIds={
                  (activeSubjectSelection.type === "mandatory"
                    ? mandatorySubjects.find(
                        (s) => s.id === activeSubjectSelection.id,
                      )?.question_ids
                    : optionalSubjects.find(
                        (s) => s.id === activeSubjectSelection.id,
                      )?.question_ids) || []
                }
                onChange={(ids) => {
                  const updater = (prev: SubjectConfig[]) =>
                    prev.map((s) =>
                      s.id === activeSubjectSelection.id
                        ? { ...s, question_ids: ids, count: ids.length }
                        : s,
                    );

                  if (activeSubjectSelection.type === "mandatory")
                    setMandatorySubjects(updater);
                  else setOptionalSubjects(updater);
                }}
              />
            )}
          </div>
          <div className="p-4 border-t shrink-0 flex justify-end">
            <Button onClick={() => setActiveSubjectSelection(null)}>
              সম্পন্ন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

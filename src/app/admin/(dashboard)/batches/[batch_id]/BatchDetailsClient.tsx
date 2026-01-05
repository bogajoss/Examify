"use client";

import { useState, useRef, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getExams, getUsers } from "@/lib/data-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import ConfirmPasswordDialog from "@/components/ConfirmPasswordDialog";
import { useAdminAuth } from "@/context/AdminAuthContext";
import type { Batch, Exam, User, SubjectConfig } from "@/lib/types";
import {
  PlusCircle,
  ListChecks,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Copy,
  Search,
  UserPlus,
} from "lucide-react";
import { EditExamModal } from "@/components/EditExamModal";
import { CSVUploadComponent, CustomLoader } from "@/components";
import QuestionSelector from "@/components/QuestionSelector";
import { fetchQuestions } from "@/lib/fetchQuestions";
import {
  createExam,
  deleteExam,
  enrollStudent,
  removeStudentFromBatch,
} from "@/lib/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { combineLocalDateTime, maskRollNumber } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "@/lib/date-utils";
import { useCopyLink } from "@/hooks/use-copy-link";

interface BatchDetailsClientProps {
  initialBatch: Batch;
  initialExams: Exam[];
  initialEnrolledStudents: User[];
}

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
  // Only convert Bengali numerals to English, preserve all other characters including decimal point
  const bengaliNumerals = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  let newStr = str;
  for (let i = 0; i < 10; i++) {
    newStr = newStr.replace(new RegExp(bengaliNumerals[i], "g"), i.toString());
  }
  return newStr;
};

const hours12 = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

export function BatchDetailsClient({
  initialBatch,
  initialExams,
  initialEnrolledStudents,
}: BatchDetailsClientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const { copy } = useCopyLink();

  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [mode, setMode] = useState<"live" | "practice">("live");
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<{
    type: "exam" | "student";
    id: string;
    label?: string;
  } | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const addExamFormRef = useRef<HTMLFormElement>(null);

  // Student Search & Add State
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<User[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const [isCustomExam, setIsCustomExam] = useState(false);
  const [useQuestionBank, setUseQuestionBank] = useState(false);
  const [fileId, setFileId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState(subjects);

  // Creation Form Subject Configs
  const [mandatorySubjectConfigs, setMandatorySubjectConfigs] = useState<
    SubjectConfig[]
  >([]);
  const [optionalSubjectConfigs, setOptionalSubjectConfigs] = useState<
    SubjectConfig[]
  >([]);
  const [activeSubjectSelection, setActiveSubjectSelection] = useState<{
    id: string;
    type: "mandatory" | "optional";
  } | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(
    dayjs().toDate(),
  );
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");

  const [endDate, setEndDate] = useState<Date | undefined>(
    dayjs().add(1, "hour").toDate(),
  );
  const [endHour, setEndHour] = useState("01");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("AM");

  const batch_id = initialBatch.id;

  // Queries
  const { data: exams = initialExams } = useQuery({
    queryKey: ["admin", "exams", batch_id],
    queryFn: () => getExams(batch_id),
    placeholderData: initialExams,
  });

  const { data: enrolledStudents = initialEnrolledStudents } = useQuery({
    queryKey: ["admin", "students", batch_id],
    queryFn: () => getUsers(batch_id),
    placeholderData: initialEnrolledStudents,
  });

  // Mutations
  const createExamMutation = useMutation({
    mutationFn: createExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "exams", batch_id] });
      toast({ title: "পরীক্ষা যুক্ত হয়েছে" });
      addExamFormRef.current?.reset();
      setSelectedQuestionIds([]);
      setMandatorySubjectConfigs([]);
      setOptionalSubjectConfigs([]);
      setIsAddExamOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "পরীক্ষা যোগ করতে ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!pendingDelete) return;
      const formData = new FormData();
      formData.append("id", pendingDelete.id);
      formData.append("password", password);
      formData.append("admin_uid", admin?.uid || "");
      formData.append("batch_id", batch_id);

      let result;
      if (pendingDelete.type === "exam") {
        result = await deleteExam(formData);
      } else {
        formData.append("user_id", pendingDelete.id);
        result = await removeStudentFromBatch(formData);
      }
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin",
          pendingDelete?.type === "exam" ? "exams" : "students",
          batch_id,
        ],
      });
      toast({
        title:
          pendingDelete?.type === "exam"
            ? "পরীক্ষা মুছে গেছে"
            : "স্টুডেন্ট মুছে গেছে",
      });
      setPendingDelete(null);
      setIsPasswordOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (user: User) => {
      const formData = new FormData();
      formData.append("user_id", user.uid);
      formData.append("batch_id", batch_id);
      const result = await enrollStudent(formData);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "students", batch_id],
      });
      toast({ title: "স্টুডেন্ট যুক্ত হয়েছে" });
    },
    onError: (err: Error) => {
      toast({
        title: "যোগ করতে ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const requestDeleteExam = (examId: string, examName?: string) => {
    setPendingDelete({ type: "exam", id: examId, label: examName });
    setIsPasswordOpen(true);
  };

  const requestDeleteStudent = (studentId: string, studentName?: string) => {
    setPendingDelete({ type: "student", id: studentId, label: studentName });
    setIsPasswordOpen(true);
  };

  const handleSearchStudents = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentSearchTerm.trim()) return;
    setIsSearchingStudents(true);

    const { data } = await supabase
      .from("users")
      .select("*")
      .or(`name.ilike.%${studentSearchTerm}%,roll.ilike.%${studentSearchTerm}%`)
      .limit(20);

    setStudentSearchResults((data as User[]) || []);
    setIsSearchingStudents(false);
  };

  const handleEnrollStudent = (user: User) => {
    if (enrolledStudents.some((s) => s.uid === user.uid)) {
      toast({ title: "ইতিমধ্যে ভর্তি আছে", variant: "destructive" });
      return;
    }
    enrollMutation.mutate(user);
  };

  const handleNumberInput = (e: FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const oldValue = input.value;

    // Update the value - preserve trailing decimal point if present
    let newValue = bengaliToEnglishNumber(input.value);

    // If the old value ended with a dot and the new value doesn't, preserve the dot
    if (oldValue.endsWith('.') && !newValue.endsWith('.')) {
      newValue += '.';
    }

    input.value = newValue;

    // Calculate the difference in length to adjust cursor position
    const lengthDiff = input.value.length - oldValue.length;

    // Restore cursor position, adjusting for any length changes
    if (start !== null && end !== null) {
      const newStart = Math.max(0, start + lengthDiff);
      const newEnd = Math.max(0, end + lengthDiff);
      // Use setTimeout to ensure the DOM update is complete before setting selection
      setTimeout(() => {
        try {
          input.setSelectionRange(newStart, newEnd);
        } catch (_e) {
          // If setting selection fails (e.g., input is not focused), ignore
        }
      }, 0);
    }
  };

  const updateSubjectConfig = (
    subjectId: string,
    type: "mandatory" | "optional",
    field: keyof SubjectConfig,
    value: string | number | string[],
  ) => {
    const updater = (prev: SubjectConfig[]) =>
      prev.map((s) => (s.id === subjectId ? { ...s, [field]: value } : s));
    if (type === "mandatory") setMandatorySubjectConfigs(updater);
    else setOptionalSubjectConfigs(updater);
  };

  const handleSubmitExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("batch_id", batch_id);

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

    const allQuestionIds = new Set<string>(selectedQuestionIds);
    if (isCustomExam) {
      mandatorySubjectConfigs.forEach((s) =>
        s.question_ids?.forEach((qid) => allQuestionIds.add(qid)),
      );
      optionalSubjectConfigs.forEach((s) =>
        s.question_ids?.forEach((qid) => allQuestionIds.add(qid)),
      );
      formData.set(
        "mandatory_subjects",
        JSON.stringify(mandatorySubjectConfigs),
      );
      formData.set("optional_subjects", JSON.stringify(optionalSubjectConfigs));
    }
    formData.set("question_ids", JSON.stringify(Array.from(allQuestionIds)));
    createExamMutation.mutate(formData);
  };

  if (!initialBatch) {
    return (
      <div className="flex justify-center items-center h-full">
        <CustomLoader />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>ব্যাচের তথ্য - {initialBatch.name}</CardTitle>
            <CardDescription>ব্যাচের বিবরণ এবং অবস্থা দেখুন।</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ব্যাচের নাম</p>
              <p className="text-lg font-semibold">{initialBatch.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">অবস্থা</p>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  initialBatch.status === "live"
                    ? "bg-green-500/20 text-green-700"
                    : "bg-gray-500/20 text-gray-700"
                }`}
              >
                {initialBatch.status === "live" ? "লাইভ" : "শেষ"}
              </span>
            </div>
            {initialBatch.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">বিবরণ</p>
                <p className="text-base">{initialBatch.description}</p>
              </div>
            )}
            {initialBatch.icon_url && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">আইকন</p>
                <img
                  src={initialBatch.icon_url}
                  alt={initialBatch.name}
                  className="h-16 w-16 object-cover rounded"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>পরীক্ষা পরিচালনা</CardTitle>
            <CardDescription>
              এই ব্যাচের জন্য পরীক্ষা তৈরি এবং পরিচালনা করুন।
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <Collapsible open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
              <CollapsibleTrigger asChild>
                <Button size="sm" className="w-full justify-start gap-2">
                  <PlusCircle className="h-4 w-4" />
                  নতুন পরীক্ষা যোগ করুন
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="py-4">
                <form
                  ref={addExamFormRef}
                  onSubmit={handleSubmitExam}
                  className="space-y-4 p-4 border rounded-md"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <Label htmlFor="mode">পরীক্ষার মোড</Label>
                    <Select
                      value={mode}
                      onValueChange={(value) =>
                        setMode(value as "live" | "practice")
                      }
                    >
                      <SelectTrigger id="mode" className="w-full md:w-[220px]">
                        <SelectValue placeholder="পরীক্ষার মোড নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">
                          লাইভ (Time-limited)
                        </SelectItem>
                        <SelectItem value="practice">
                          প্রাকটিস (আনলিমিটেড)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="exam-name">পরীক্ষার নাম</Label>
                      <Input
                        id="exam-name"
                        name="name"
                        placeholder="পরীক্ষার নাম"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">সময় (মিনিট)</Label>
                      <Input
                        id="duration"
                        name="duration_minutes"
                        defaultValue="40"
                        placeholder="সময় (মিনিট)"
                        type="number"
                        onInput={handleNumberInput}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marks_per_question">
                        প্রশ্ন প্রতি মার্ক
                      </Label>
                      <Input
                        id="marks_per_question"
                        name="marks_per_question"
                        type="number"
                        step="0.01"
                        defaultValue="1.00"
                        placeholder="প্রশ্ন প্রতি মার্ক"
                        onInput={handleNumberInput}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="negative_marks">নেগেটিভ মার্ক</Label>
                      <Input
                        id="negative_marks"
                        name="negative_marks_per_wrong"
                        defaultValue="0.25"
                        placeholder="নেগেটিভ মার্ক"
                        type="number"
                        step="0.01"
                        onInput={handleNumberInput}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 items-center">
                    {mode === "live" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                        <div className="space-y-2">
                          <Label>শুরুর সময়</Label>
                          <Input
                            type="date"
                            value={
                              startDate
                                ? dayjs(startDate).format("YYYY-MM-DD")
                                : ""
                            }
                            onChange={(e) =>
                              setStartDate(
                                e.target.value
                                  ? dayjs(e.target.value).toDate()
                                  : undefined,
                              )
                            }
                            className="w-full"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Select
                              value={startHour}
                              onValueChange={setStartHour}
                            >
                              <SelectTrigger className="w-full">
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
                            <Select
                              value={startMinute}
                              onValueChange={setStartMinute}
                            >
                              <SelectTrigger className="w-full">
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
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>শেষ হওয়ার সময়</Label>
                          <Input
                            type="date"
                            value={
                              endDate ? dayjs(endDate).format("YYYY-MM-DD") : ""
                            }
                            onChange={(e) =>
                              setEndDate(
                                e.target.value
                                  ? dayjs(e.target.value).toDate()
                                  : undefined,
                              )
                            }
                            className="w-full"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Select value={endHour} onValueChange={setEndHour}>
                              <SelectTrigger className="w-full">
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
                            <Select
                              value={endMinute}
                              onValueChange={setEndMinute}
                            >
                              <SelectTrigger className="w-full">
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
                              <SelectTrigger className="w-full">
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
                    )}
                    <input
                      name="is_practice"
                      type="hidden"
                      value={mode === "practice" ? "true" : "false"}
                    />
                    <input type="hidden" name="file_id" value={fileId} />

                    {!isCustomExam && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="use-question-bank-toggle-batch"
                              checked={useQuestionBank}
                              onCheckedChange={(checked) =>
                                setUseQuestionBank(checked as boolean)
                              }
                            />
                            <Label htmlFor="use-question-bank-toggle-batch">
                              প্রশ্ন ব্যাংক থেকে প্রশ্ন বাছুন
                            </Label>
                          </div>

                          {useQuestionBank && (
                            <div className="pt-2">
                              <QuestionSelector
                                selectedIds={selectedQuestionIds}
                                onChange={setSelectedQuestionIds}
                                minimal
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-3">
                            Or upload questions from CSV
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
                              setFileId(fid);

                              // Auto-group by sections if CSV has them
                              try {
                                const qs = await fetchQuestions(
                                  fid,
                                  undefined,
                                  5000,
                                );
                                if (qs && qs.length > 0) {
                                  const sectionMap = new Map<
                                    string,
                                    string[]
                                  >();
                                  qs.forEach((q) => {
                                    const section = String(
                                      q.section || q.subject || q.type || "1",
                                    );
                                    if (!sectionMap.has(section)) {
                                      sectionMap.set(section, []);
                                    }
                                    if (q.id)
                                      sectionMap
                                        .get(section)
                                        ?.push(String(q.id));
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
                                    setMandatorySubjectConfigs(configs);
                                    setOptionalSubjectConfigs([]);
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
                  </div>

                  <div className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffle-questions-toggle-batch"
                        name="shuffle_questions"
                        value="true"
                      />
                      <Label htmlFor="shuffle-questions-toggle-batch">
                        প্রশ্নগুলো এলোমেলো করুন
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="custom-exam-toggle-batch"
                      checked={isCustomExam}
                      onCheckedChange={(checked) =>
                        setIsCustomExam(checked as boolean)
                      }
                    />
                    <Label htmlFor="custom-exam-toggle-batch">
                      কাস্টম এক্সাম
                    </Label>
                  </div>

                  {isCustomExam && (
                    <div className="space-y-4 p-4 border rounded-md bg-background/50">
                      <div className="space-y-2">
                        <Label htmlFor="total_subjects">মোট বিষয়</Label>
                        <Input
                          id="total_subjects"
                          name="total_subjects"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g., 4"
                          onInput={handleNumberInput}
                        />
                      </div>

                      {/* Mandatory Sections */}
                      <div className="space-y-4">
                        <Label className="text-base font-bold flex items-center justify-between">
                          <span>বাধ্যতামূলক বিষয় (Mandatory)</span>
                          <Badge variant="secondary">
                            {mandatorySubjectConfigs.length}
                          </Badge>
                        </Label>
                        <div className="space-y-3">
                          {mandatorySubjectConfigs.map((subject, index) => (
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
                                    placeholder="সেকশনের নাম লিখুন (যেমন: পদার্থবিজ্ঞান)"
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="icon"
                                      className="h-8 w-8"
                                      disabled={index === 0}
                                      onClick={() => {
                                        setMandatorySubjectConfigs((prev) => {
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
                                        index ===
                                        mandatorySubjectConfigs.length - 1
                                      }
                                      onClick={() => {
                                        setMandatorySubjectConfigs((prev) => {
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
                                      setMandatorySubjectConfigs((prev) =>
                                        prev.filter((s) => s.id !== subject.id),
                                      );
                                      setOptionalSubjectConfigs((prev) => [
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
                                      setMandatorySubjectConfigs((prev) =>
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
                          {mandatorySubjectConfigs.length === 0 && (
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
                            {optionalSubjectConfigs.length}
                          </Badge>
                        </Label>
                        <div className="space-y-3">
                          {optionalSubjectConfigs.map((subject, index) => (
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
                                        setOptionalSubjectConfigs((prev) => {
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
                                        index ===
                                        optionalSubjectConfigs.length - 1
                                      }
                                      onClick={() => {
                                        setOptionalSubjectConfigs((prev) => {
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
                                      setOptionalSubjectConfigs((prev) =>
                                        prev.filter((s) => s.id !== subject.id),
                                      );
                                      setMandatorySubjectConfigs((prev) => [
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
                                      setOptionalSubjectConfigs((prev) =>
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
                          {optionalSubjectConfigs.length === 0 && (
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
                              setMandatorySubjectConfigs((prev) => [
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
                                  !mandatorySubjectConfigs.some(
                                    (m) => m.id === s.id,
                                  ) &&
                                  !optionalSubjectConfigs.some(
                                    (o) => o.id === s.id,
                                  ),
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
                            const newSubject = {
                              id: newId,
                              name: "নতুন সেকশন",
                            };
                            setAvailableSubjects((prev) => [
                              ...prev,
                              newSubject,
                            ]);
                            setMandatorySubjectConfigs((prev) => [
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
                          কাস্টম সেকশন
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={createExamMutation.isPending}
                    className="w-full"
                  >
                    {createExamMutation.isPending ? (
                      <>
                        <CustomLoader minimal />
                        যোগ করা হচ্ছে...
                      </>
                    ) : (
                      "নতুন পরীক্ষা যোগ করুন"
                    )}
                  </Button>
                </form>
              </CollapsibleContent>
            </Collapsible>
            <div className="relative w-full overflow-auto scrollbar-hide pt-4 mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>পরীক্ষার নাম</TableHead>
                    <TableHead className="text-right">কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = `${window.location.origin}/exams/${exam.id}`;
                            copy(link, "পরীক্ষার লিঙ্ক কপি করা হয়েছে।");
                          }}
                          title="Copy Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/exams/${exam.id}/questions`}>
                          <Button variant="outline" size="sm">
                            প্রশ্ন
                          </Button>
                        </Link>
                        <Link href={`/admin/exams/${exam.id}/results`}>
                          <Button variant="outline" size="sm">
                            ফলাফল
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingExam(exam);
                            setIsEditModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => requestDeleteExam(exam.id, exam.name)}
                        >
                          মুছুন
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ছাত্রছাত্রী পরিচালনা</CardTitle>
            <CardDescription>
              এই ব্যাচের জন্য ছাত্রছাত্রীদের যোগ করুন বা মুছে ফেলুন।
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="mb-6">
              <Dialog
                open={isAddStudentDialogOpen}
                onOpenChange={setIsAddStudentDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    ছাত্রছাত্রী যোগ করুন
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ছাত্রছাত্রী খুঁজুন এবং যুক্ত করুন</DialogTitle>
                    <DialogDescription>
                      নাম বা রোল / ফোন নম্বর দিয়ে খুঁজুন।
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSearchStudents} className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="নাম বা রোল..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                      />
                      <Button type="submit" disabled={isSearchingStudents}>
                        {isSearchingStudents ? (
                          <CustomLoader />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 mt-2">
                    {studentSearchResults.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Roll: {maskRollNumber(user.roll)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            enrollMutation.isPending ||
                            enrolledStudents.some((s) => s.uid === user.uid)
                          }
                          onClick={() => handleEnrollStudent(user)}
                        >
                          {enrolledStudents.some((s) => s.uid === user.uid)
                            ? "যুক্ত আছে"
                            : enrollMutation.isPending
                              ? "ভর্তি হচ্ছে..."
                              : "যুক্ত করুন"}
                        </Button>
                      </div>
                    ))}
                    {studentSearchResults.length === 0 &&
                      !isSearchingStudents &&
                      studentSearchTerm && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          কোনো ফলাফল পাওয়া যায়নি
                        </p>
                      )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative w-full overflow-auto scrollbar-hide">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>স্টুডেন্ট রোল</TableHead>
                    <TableHead className="text-right">কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((student) => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">
                        {maskRollNumber(student.roll)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            requestDeleteStudent(
                              student.uid,
                              maskRollNumber(student.roll),
                            )
                          }
                        >
                          মুছে ফেলুন
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <EditExamModal
        exam={editingExam}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["admin", "exams", batch_id],
          });
        }}
      />

      {/* Secondary Dialog for Subject Question Selection (Creation Mode) */}
      <Dialog
        open={!!activeSubjectSelection}
        onOpenChange={(open) => !open && setActiveSubjectSelection(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-2 md:p-4 border-b shrink-0">
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
          <div className="flex-1 overflow-hidden p-2 md:p-4">
            {activeSubjectSelection && (
              <QuestionSelector
                selectedIds={
                  (activeSubjectSelection.type === "mandatory"
                    ? mandatorySubjectConfigs.find(
                        (s) => s.id === activeSubjectSelection.id,
                      )?.question_ids
                    : optionalSubjectConfigs.find(
                        (s) => s.id === activeSubjectSelection.id,
                      )?.question_ids) || []
                }
                onChange={(ids) => {
                  updateSubjectConfig(
                    activeSubjectSelection.id,
                    activeSubjectSelection.type,
                    "question_ids",
                    ids,
                  );
                }}
              />
            )}
          </div>
          <div className="p-2 md:p-4 border-t shrink-0 flex justify-end">
            <Button onClick={() => setActiveSubjectSelection(null)}>
              সম্পন্ন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmPasswordDialog
        open={isPasswordOpen}
        onOpenChange={(open) => {
          setIsPasswordOpen(open);
          if (!open) setPendingDelete(null);
        }}
        title="মুছে ফেলার নিশ্চিতকরণ"
        description={
          pendingDelete
            ? `আপনি ${pendingDelete.type === "exam" ? "পরীক্ষা" : "ছাত্রছাত্রী"} (${pendingDelete.label || pendingDelete.id}) মুছে ফেলতে যাচ্ছেন — এটি স্থায়ী। আপনি কি নিশ্চিত?`
            : undefined
        }
        confirmLabel="মুছে ফেলুন"
        onConfirm={(pass) => deleteMutation.mutate(pass)}
      />
      <hr className="h-8 border-transparent" />
    </div>
  );
}

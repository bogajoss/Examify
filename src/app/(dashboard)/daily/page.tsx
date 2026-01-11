"use client";

import { useState } from "react";
import { PageHeader, CustomLoader } from "@/components";
import {
  getEnrolledBatches,
  checkAttendance,
  markAttendance,
  getDailyTasks,
  submitTask,
  getLiveExams,
} from "@/lib/daily-supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Send,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "@/lib/date-utils";

interface TaskStatus {
  batch_id: string;
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
  mandatory_url: string;
  optional_url: string;
  todo_url: string;
}

interface DailyExam {
  id: string;
  name: string;
  batchName?: string;
}

export default function DailyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [urls, setUrls] = useState<
    Record<string, { mandatory: string; optional: string; todo: string }>
  >({});

  // Query for enrolled batches
  const { data: batches = [] } = useQuery({
    queryKey: ["batches", "enrolled", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return await getEnrolledBatches(user.uid);
    },
    enabled: !!user?.uid && !authLoading,
  });

  // Query for attendance status
  const { data: attendanceMarked = false } = useQuery({
    queryKey: ["attendance", "today", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return false;
      return await checkAttendance(user.uid, dayjs().format("YYYY-MM-DD"));
    },
    enabled: !!user?.uid && !authLoading,
  });

  // Consolidated query for tasks and exams across all batches
  const {
    data: dailyData = {
      taskStatus: {} as Record<string, TaskStatus>,
      liveExams: [] as DailyExam[],
    },
    isLoading: loadingData,
  } = useQuery({
    queryKey: ["daily-tasks", user?.uid, batches.map((b) => b.id)],
    queryFn: async () => {
      const status: Record<string, TaskStatus> = {};
      const date = dayjs().format("YYYY-MM-DD");

      const taskPromises = batches.map((batch) =>
        getDailyTasks(user!.uid, batch.id, date),
      );

      const tasksResults = await Promise.all(taskPromises);

      tasksResults.forEach((taskData, index) => {
        const batch = batches[index];
        if (taskData) {
          status[batch.id] = {
            batch_id: batch.id,
            mandatory_done: !!taskData.mandatory_done,
            optional_done: !!taskData.optional_done,
            todo_done: !!taskData.todo_done,
            mandatory_url: taskData.mandatory_url || "",
            optional_url: taskData.optional_url || "",
            todo_url: taskData.todo_url || "",
          };
        } else {
          status[batch.id] = {
            batch_id: batch.id,
            mandatory_done: false,
            optional_done: false,
            todo_done: false,
            mandatory_url: "",
            optional_url: "",
            todo_url: "",
          };
        }
      });

      const liveExamsData = await getLiveExams(batches.map((b) => b.id));
      const liveExams = liveExamsData.map((e) => ({
        id: e.id,
        name: e.name,
        batchName: batches.find((b) => b.id === e.batch_id)?.name,
      }));

      return { taskStatus: status, liveExams };
    },
    enabled: batches.length > 0 && !!user?.uid && !authLoading,
  });

  // Attendance Mutation
  const attendanceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not found");
      await markAttendance(
        user.uid,
        dayjs().format("YYYY-MM-DD"),
        batches.map((b) => b.id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", "today", user?.uid],
      });
      toast({
        title: "উপস্থিতি নিশ্চিত করা হয়েছে",
        description:
          "আজকের জন্য আপনার সকল ব্যাচে উপস্থিতি সফলভাবে রেকর্ড করা হয়েছে।",
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "উপস্থিতি নিশ্চিত করতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  // Task Submission Mutation
  const taskMutation = useMutation({
    mutationFn: async ({
      batchId,
      type,
      url,
    }: {
      batchId: string;
      type: "mandatory" | "optional" | "todo";
      url: string;
    }) => {
      if (!user?.uid) throw new Error("User not found");
      await submitTask(
        user.uid,
        batchId,
        dayjs().format("YYYY-MM-DD"),
        type,
        url,
      );
      return { batchId, type, url };
    },
    onSuccess: (data) => {
      // Update the status locally for the specific task instead of invalidating entire query
      queryClient.setQueryData(
        ["daily-tasks", user?.uid, batches.map((b) => b.id)],
        (
          oldData:
            | { taskStatus: Record<string, TaskStatus>; liveExams: DailyExam[] }
            | undefined,
        ) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            taskStatus: {
              ...oldData.taskStatus,
              [data.batchId]: {
                ...oldData.taskStatus[data.batchId],
                [`${data.type}_done`]: true,
                [`${data.type}_url`]: data.url,
              },
            },
          };
        },
      );
      const typeLabels = {
        mandatory: "টাস্ক ১",
        optional: "টাস্ক ২",
        todo: "আপনার টুডু লিস্ট",
      };
      toast({
        title: "টাস্ক জমা হয়েছে",
        description: `${typeLabels[data.type]} সফলভাবে জমা দেওয়া হয়েছে।`,
      });
    },
    onError: () => {
      toast({
        title: "ত্রুটি",
        description: "টাস্ক জমা দিতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
    },
  });

  const handleTaskSubmit = (
    batchId: string,
    type: "mandatory" | "optional" | "todo",
  ) => {
    const url = urls[batchId]?.[type];
    if (!url) {
      toast({
        title: "লিঙ্ক প্রয়োজন",
        description: "অনুগ্রহ করে টাস্কের লিঙ্ক প্রদান করুন।",
        variant: "destructive",
      });
      return;
    }
    taskMutation.mutate({ batchId, type, url });
  };

  if (loadingData || authLoading) return <CustomLoader />;

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
      <PageHeader
        title="প্রতিদিনের কাজ ও এটেন্ডেন্স"
        description="প্রতিদিন একবার এটেন্ডেন্স দিন এবং আপনার ব্যাচ ভিত্তিক টাস্ক জমা দিন।"
      />

      {/* Attendance Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2
              className={`h-6 w-6 ${attendanceMarked ? "text-green-500" : "text-primary"}`}
            />
            আজকের উপস্থিতি
          </CardTitle>
          <CardDescription>
            এক ক্লিকেই আপনার সকল এনরোল করা ব্যাচে উপস্থিতি নিশ্চিত করুন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceMarked ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">আপনি আজকে উপস্থিত আছেন!</span>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto h-14 text-lg font-bold shadow-lg shadow-primary/20"
              onClick={() => attendanceMutation.mutate()}
              disabled={attendanceMutation.isPending}
            >
              {attendanceMutation.isPending
                ? "প্রসেসিং..."
                : "উপস্থিতি নিশ্চিত করুন"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Live Exam Alerts */}
      {dailyData.liveExams.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2 px-2 text-purple-600">
            <AlertTriangle className="h-5 w-5" />
            আজকের পরীক্ষা
          </h2>
          {dailyData.liveExams.map((exam) => (
            <Card
              key={exam.id}
              className="border-purple-200 bg-purple-50 dark:bg-purple-900/10"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-purple-700 dark:text-purple-300">
                    {exam.name}
                  </h3>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                    ব্যাচ: {exam.batchName}
                  </p>
                </div>
                <Link href="/exams">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    অংশগ্রহণ করুন
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 px-2">
          <Send className="h-5 w-5 text-primary" />
          ব্যাচ ভিত্তিক টাস্ক সাবমিশন
        </h2>

        {batches.length > 0 ? (
          <div className="grid gap-4">
            {batches.map((batch) => {
              const status = dailyData.taskStatus[batch.id];
              return (
                <Card key={batch.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-lg">{batch.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Mandatory Task */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          {status?.mandatory_done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          টাস্ক ১
                          <Badge
                            variant="outline"
                            className="text-[10px] text-red-500 border-red-200"
                          >
                            Mandatory
                          </Badge>
                        </label>
                        {status?.mandatory_done && (
                          <span className="text-xs text-green-600 font-medium">
                            সম্পন্ন
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="টাস্কের লিঙ্ক দিন (Google Drive/GitHub/etc.)"
                            className="pl-9"
                            value={
                              status?.mandatory_done
                                ? status.mandatory_url
                                : urls[batch.id]?.mandatory || ""
                            }
                            onChange={(e) =>
                              setUrls((prev) => ({
                                ...prev,
                                [batch.id]: {
                                  ...(prev[batch.id] || {
                                    mandatory: "",
                                    optional: "",
                                    todo: "",
                                  }),
                                  mandatory: e.target.value,
                                },
                              }))
                            }
                            disabled={status?.mandatory_done}
                          />
                        </div>
                        {!status?.mandatory_done && (
                          <Button
                            onClick={() =>
                              handleTaskSubmit(batch.id, "mandatory")
                            }
                            disabled={
                              taskMutation.isPending &&
                              taskMutation.variables?.batchId === batch.id &&
                              taskMutation.variables?.type === "mandatory"
                            }
                          >
                            {taskMutation.isPending &&
                            taskMutation.variables?.batchId === batch.id &&
                            taskMutation.variables?.type === "mandatory"
                              ? "..."
                              : "জমা দিন"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Optional Task */}
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          {status?.optional_done ? (
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          টাস্ক ২
                          <Badge
                            variant="outline"
                            className="text-[10px] text-blue-500 border-blue-200"
                          >
                            Optional
                          </Badge>
                        </label>
                        {status?.optional_done && (
                          <span className="text-xs text-green-600 font-medium">
                            সম্পন্ন
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="টাস্কের লিঙ্ক দিন (ঐচ্ছিক)"
                            className="pl-9"
                            value={
                              status?.optional_done
                                ? status.optional_url
                                : urls[batch.id]?.optional || ""
                            }
                            onChange={(e) =>
                              setUrls((prev) => ({
                                ...prev,
                                [batch.id]: {
                                  ...(prev[batch.id] || {
                                    mandatory: "",
                                    optional: "",
                                    todo: "",
                                  }),
                                  optional: e.target.value,
                                },
                              }))
                            }
                            disabled={status?.optional_done}
                          />
                        </div>
                        {!status?.optional_done && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleTaskSubmit(batch.id, "optional")
                            }
                            disabled={
                              taskMutation.isPending &&
                              taskMutation.variables?.batchId === batch.id &&
                              taskMutation.variables?.type === "optional"
                            }
                          >
                            {taskMutation.isPending &&
                            taskMutation.variables?.batchId === batch.id &&
                            taskMutation.variables?.type === "optional"
                              ? "..."
                              : "জমা দিন"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* To Do Task */}
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          {status?.todo_done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          আপনার টুডু লিস্ট
                          <Badge
                            variant="outline"
                            className="text-[10px] text-green-500 border-green-200"
                          >
                            To Do
                          </Badge>
                        </label>
                        {status?.todo_done && (
                          <span className="text-xs text-green-600 font-medium">
                            সম্পন্ন
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="করণীয় কাজের লিঙ্ক দিন"
                            className="pl-9"
                            value={
                              status?.todo_done
                                ? status.todo_url
                                : urls[batch.id]?.todo || ""
                            }
                            onChange={(e) =>
                              setUrls((prev) => ({
                                ...prev,
                                [batch.id]: {
                                  ...(prev[batch.id] || {
                                    mandatory: "",
                                    optional: "",
                                    todo: "",
                                  }),
                                  todo: e.target.value,
                                },
                              }))
                            }
                            disabled={status?.todo_done}
                          />
                        </div>
                        {!status?.todo_done && (
                          <Button
                            variant="outline"
                            onClick={() => handleTaskSubmit(batch.id, "todo")}
                            disabled={
                              taskMutation.isPending &&
                              taskMutation.variables?.batchId === batch.id &&
                              taskMutation.variables?.type === "todo"
                            }
                          >
                            {taskMutation.isPending &&
                            taskMutation.variables?.batchId === batch.id &&
                            taskMutation.variables?.type === "todo"
                              ? "..."
                              : "জমা দিন"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed">
            <p className="text-muted-foreground">আপনি কোনো ব্যাচে যুক্ত নেই।</p>
          </div>
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}

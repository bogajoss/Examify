import { supabase } from "./supabase";
import { User, Batch, StudentReport, ReportDay } from "./types";
import dayjs from "@/lib/date-utils";

export async function getBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Batch[];
}

export async function getReports(batchId: string, date: string) {
  // 1. Get all students in the batch
  const { data: students, error: studentsError } = await supabase
    .from("users")
    .select("*")
    .contains("enrolled_batches", [batchId]);

  if (studentsError) throw studentsError;

  // 2. Get attendance for the date
  const { data: attendance, error: attendanceError } = await supabase
    .from("student_attendance")
    .select("student_id, present")
    .eq("batch_id", batchId)
    .eq("attendance_date", date);

  if (attendanceError) throw attendanceError;

  // 3. Get tasks for the date
  const { data: tasks, error: tasksError } = await supabase
    .from("student_tasks")
    .select("*")
    .eq("batch_id", batchId)
    .eq("task_date", date);

  if (tasksError) throw tasksError;

  // 4. Get exams submitted on that date (roughly)
  // Or maybe we want exams for that batch? The report seems to be "Daily Progress".
  // The original PHP logic fetched exams submitted on that date.
  const startOfDay = dayjs(date).startOf("day").toISOString();
  const endOfDay = dayjs(date).endOf("day").toISOString();

  const { data: exams, error: examsError } = await supabase
    .from("student_exams")
    .select("student_id, score, exams(name)")
    .gte("submitted_at", startOfDay)
    .lte("submitted_at", endOfDay);

  if (examsError) throw examsError;

  // Map data
  const reportItems = students.map((student) => {
    const att = attendance?.find((a) => a.student_id === student.uid);
    const task = tasks?.find((t) => t.student_id === student.uid);
    const studentExams = exams
      ?.filter((e) => e.student_id === student.uid)
      .map((e) => ({
        name: (e.exams as any)?.name || "Exam",
        score: e.score || 0,
      }));

    return {
      uid: student.uid,
      name: student.name,
      roll: student.roll,
      present: att?.present || false,
      mandatory_done: task?.mandatory_done || false,
      optional_done: task?.optional_done || false,
      todo_done: task?.todo_done || false,
      mandatory_url: task?.mandatory_url || null,
      optional_url: task?.optional_url || null,
      todo_url: task?.todo_url || null,
      exams: studentExams || [],
    };
  });

  return reportItems;
}

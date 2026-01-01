import { supabase } from "./supabase";
import { User, Batch } from "./types";
import dayjs from "@/lib/date-utils";

export async function getEnrolledBatches(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("enrolled_batches")
    .eq("uid", userId)
    .single();

  if (error) throw error;

  const batchIds = data?.enrolled_batches || [];
  if (batchIds.length === 0) return [];

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("*")
    .in("id", batchIds);

  if (batchesError) throw batchesError;
  return batches as Batch[];
}

export async function checkAttendance(userId: string, date: string) {
  // We check if attendance exists for ANY batch on this date.
  // Or maybe for ALL enrolled batches? The UI says "today's attendance", usually global or per batch.
  // The UI shows a single button "Confirm Attendance".
  // The backend logic likely marked it for all enrolled batches.

  // Let's check if there is at least one attendance record for today.
  const { data, error } = await supabase
    .from("student_attendance")
    .select("id")
    .eq("student_id", userId)
    .eq("attendance_date", date)
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

export async function markAttendance(
  userId: string,
  date: string,
  batchIds: string[],
) {
  if (batchIds.length === 0) return;

  const inserts = batchIds.map((bid) => ({
    student_id: userId,
    batch_id: bid,
    attendance_date: date,
    present: true,
  }));

  const { error } = await supabase
    .from("student_attendance")
    .upsert(inserts, { onConflict: "student_id,batch_id,attendance_date" });

  if (error) throw error;
}

export async function getDailyTasks(
  userId: string,
  batchId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("student_tasks")
    .select("*")
    .eq("student_id", userId)
    .eq("batch_id", batchId)
    .eq("task_date", date)
    .single();

  // It's okay if no record exists
  if (error && error.code !== "PGRST116") throw error;

  return data;
}

export async function submitTask(
  userId: string,
  batchId: string,
  date: string,
  type: "mandatory" | "optional" | "todo",
  url: string,
) {
  const updateData: any = {
    student_id: userId,
    batch_id: batchId,
    task_date: date,
  };

  if (type === "mandatory") {
    updateData.mandatory_done = true;
    updateData.mandatory_url = url;
  } else if (type === "optional") {
    updateData.optional_done = true;
    updateData.optional_url = url;
  } else if (type === "todo") {
    updateData.todo_done = true;
    updateData.todo_url = url;
  }

  // We use upsert to create or update
  const { error } = await supabase
    .from("student_tasks")
    .upsert(updateData, { onConflict: "student_id,batch_id,task_date" });

  if (error) throw error;
}

export async function getLiveExams(batchIds: string[]) {
  if (batchIds.length === 0) return [];

  // Logic for "Live Exams Today": Exams that are active NOW.
  // Or exams that started today?
  // The PHP backend logic usually checked `start_at <= NOW <= end_at`.
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .in("batch_id", batchIds)
    .lte("start_at", now)
    .gte("end_at", now);

  if (error) throw error;
  return data;
}

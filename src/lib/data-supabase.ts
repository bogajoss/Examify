import { supabase } from "./supabase";
import { apiRequest } from "./api";
import { User, Batch, Exam, StudentExam } from "./types";

export async function getAdminStats() {
  const [usersCount, examsCount, batchesCount] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase.from("batches").select("*", { count: "exact", head: true }),
  ]);

  // Questions count still from MySQL
  const mysqlStats = await apiRequest<{ questionsCount: number }>("stats");
  const questionsCount = mysqlStats.success
    ? mysqlStats.data.questionsCount
    : 0;

  return {
    usersCount: usersCount.count || 0,
    examsCount: examsCount.count || 0,
    batchesCount: batchesCount.count || 0,
    questionsCount: questionsCount,
  };
}

export async function getBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Batch[];
}

export async function getBatch(id: string) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Batch;
}

export async function getExams(batchId?: string) {
  let query = supabase.from("exams").select("*");
  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as Exam[];
}

export async function getExam(id: string) {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Exam;
}

export async function getUsers(batchId?: string) {
  let query = supabase.from("users").select("*");
  if (batchId) {
    query = query.contains("enrolled_batches", [batchId]);
  }
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as User[];
}

export async function getUser(uid: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .single();

  if (error) throw error;
  return data as User;
}

export async function getExamResults(examId: string) {
  const { data, error } = await supabase
    .from("student_exams")
    .select("*, users!inner(full_name, roll_number, phone_number, uid)")
    .eq("exam_id", examId)
    .order("score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getStudentResults(studentId: string) {
  const { data, error } = await supabase
    .from("student_exams")
    .select("*, exams!inner(title, total_marks, duration_minutes)")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data;
}

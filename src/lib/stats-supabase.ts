import { supabase } from "./supabase";
import { apiRequest } from "./api";

export async function getPublicStats() {
  const [usersCount, examsCount, batchesCount] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase.from("batches").select("*", { count: "exact", head: true }),
  ]);

  return {
    usersCount: usersCount.count || 0,
    examsCount: examsCount.count || 0,
    batchesCount: batchesCount.count || 0,
  };
}

import { supabase } from "./supabase";
import { User, Batch } from "./types";

export async function getAllBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Batch[];
}

export async function getUsersWithParams(
  page: number,
  limit: number,
  search: string,
  enrolledOnly: string,
) {
  let query = supabase.from("users").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,roll.ilike.%${search}%`);
  }

  if (enrolledOnly === "1") {
    query = query.not("enrolled_batches", "is", null);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return { data: data as User[], total: count };
}

export async function getUserById(uid: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .single();

  if (error) throw error;
  return data as User;
}

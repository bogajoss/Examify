import { supabase } from "./supabase";

export async function verifyAdminPassword(adminUid: string, password: string) {
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("uid")
      .eq("uid", adminUid)
      .eq("password", password)
      .single();

    if (error || !data) return false;
    return true;
  } catch (err) {
    console.error("verifyAdminPassword error", err);
    return false;
  }
}

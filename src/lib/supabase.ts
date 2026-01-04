import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client for client-side usage (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side admin usage (full permissions)
// Use this only in server actions or API routes
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
);

// Type definitions for database tables
export interface Question {
  id: string;
  file_id: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4?: string;
  option5?: string;
  answer: string;
  explanation?: string;
  question_image?: string;
  explanation_image?: string;
  subject?: string;
  paper?: string;
  chapter?: string;
  highlight?: string;
  type?: number;
  order_index?: number;
  created_at?: string;
}

export interface File {
  id: string;
  original_filename: string;
  display_name: string;
  category_id?: string;
  uploaded_at: string;
  total_questions: number;
  external_id?: string;
  batch_id?: string;
  set_id?: string;
  is_bank?: boolean;
}

export interface ApiToken {
  id: string;
  user_id: string;
  token: string;
  name?: string;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
}

// Helper function to validate API token
export async function validateApiToken(
  token: string,
): Promise<{ valid: boolean; isAdmin: boolean; userId?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("api_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { valid: false, isAdmin: false };
    }

    return {
      valid: true,
      isAdmin: data.is_admin,
      userId: data.user_id,
    };
  } catch (error) {
    console.error("Token validation error:", error);
    return { valid: false, isAdmin: false };
  }
}

// UUID generation is handled by PostgreSQL uuid-ossp extension (uuid_generate_v4())
// Application no longer generates UUIDs - database handles it via DEFAULT values
// This keeps UUID generation centralized and more secure
export function generateUUID(): string {
  // DEPRECATED: This function is no longer used
  // Database generates UUIDs via uuid_generate_v4() default value in all INSERT operations
  console.warn(
    "generateUUID() is deprecated - database generates UUIDs via uuid_generate_v4()",
  );
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

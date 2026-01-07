import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../middleware";

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get stats
    // Count total files
    const { count: filesCount } = await supabaseAdmin
      .from("files")
      .select("id", { count: "exact", head: true });

    // Count total questions
    const { count: questionsCount } = await supabaseAdmin
      .from("questions")
      .select("id", { count: "exact", head: true });

    // Count total exams
    const { count: examsCount } = await supabaseAdmin
      .from("exams")
      .select("id", { count: "exact", head: true });

    // Count total students
    const { count: studentsCount } = await supabaseAdmin
      .from("users")
      .select("uid", { count: "exact", head: true });

    // Count total student exams (attempts)
    const { count: attemptsCount } = await supabaseAdmin
      .from("student_exams")
      .select("id", { count: "exact", head: true });

    const stats = {
      total_files: filesCount || 0,
      total_questions: questionsCount || 0,
      total_exams: examsCount || 0,
      total_students: studentsCount || 0,
      total_exam_attempts: attemptsCount || 0,
    };

    return NextResponse.json(
      { success: true, data: stats },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/stats:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

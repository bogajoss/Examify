import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, Question } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../middleware";

/**
 * @deprecated This route proxies to legacy CSV API for backward compatibility.
 * New code should use /api/questions directly with Supabase.
 */
export async function GET(request: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("file_id");
    const examId = searchParams.get("exam_id");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log(
      `[FETCH-QUESTIONS] Request received. file_id: ${fileId || "N/A"}, exam_id: ${examId || "N/A"}`
    );

    // Build query from Supabase
    let query = supabaseAdmin.from("questions").select("*");

    // Filter by file_id if provided
    if (fileId) {
      query = query.eq("file_id", fileId);
    }

    // For exam_id, we need to join with exam_questions table
    if (examId) {
      query = supabaseAdmin
        .from("exam_questions")
        .select("question_id, questions(*)")
        .eq("exam_id", examId)
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error("[FETCH-QUESTIONS] Database error:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders() }
        );
      }

      // Transform exam_questions result
      const questions = (data || []).map((eq: any) => ({
        ...eq.questions,
        order_index: eq.order_index,
      }));

      return NextResponse.json(
        { success: true, data: questions },
        { headers: corsHeaders() }
      );
    }

    // Regular file query with pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("[FETCH-QUESTIONS] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Transform questions for legacy API format
    const transformed = (data || []).map((q: Question) => ({
      id: q.id,
      file_id: q.file_id,
      question: q.question_text || "",
      question_text: q.question_text || "",
      options: [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
        (o) => o && o.trim() !== ""
      ),
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
      correct: q.answer, // legacy front-end expects 'correct'
      answer: q.answer,
      explanation: q.explanation || "",
      question_image_url: q.question_image,
      explanation_image_url: q.explanation_image,
      subject: q.subject,
      paper: q.paper,
      chapter: q.chapter,
      highlight: q.highlight,
      type: q.type,
      order_index: q.order_index,
      created_at: q.created_at,
    }));

    return NextResponse.json(
      { success: true, data: transformed, count, limit, offset },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[FETCH-QUESTIONS] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Support POST for backward compatibility
export async function POST(request: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { file_id } = body;

    let query = supabaseAdmin.from("questions").select("*");

    if (file_id) {
      query = query.eq("file_id", file_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FETCH-QUESTIONS-POST] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    const transformed = (data || []).map((q: Question) => ({
      id: q.id,
      file_id: q.file_id,
      question: q.question_text || "",
      question_text: q.question_text || "",
      options: [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
        (o) => o && o.trim() !== ""
      ),
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
      correct: q.answer,
      answer: q.answer,
      explanation: q.explanation || "",
      question_image_url: q.question_image,
      explanation_image_url: q.explanation_image,
      subject: q.subject,
      paper: q.paper,
      chapter: q.chapter,
      highlight: q.highlight,
      type: q.type,
      order_index: q.order_index,
      created_at: q.created_at,
    }));

    return NextResponse.json(
      { success: true, questions: transformed },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("[FETCH-QUESTIONS-POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

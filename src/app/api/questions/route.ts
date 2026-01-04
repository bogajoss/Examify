import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, validateApiToken } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../middleware";

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    const fileId = url.searchParams.get("file_id");
    const examId = url.searchParams.get("exam_id");
    const ids = url.searchParams.get("ids");
    const search = url.searchParams.get("search");
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!)
      : 0;
    const offset = url.searchParams.get("offset")
      ? parseInt(url.searchParams.get("offset")!)
      : 0;

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing API Token" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { valid } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid API Token" },
        { status: 403, headers: corsHeaders() },
      );
    }

    let query = supabaseAdmin.from("questions").select("*");

    // Filter by IDs if provided
    if (ids) {
      const idArray = ids.split(",").filter((id) => id.trim());
      if (idArray.length > 0) {
        query = query.in("id", idArray);
      }
    }
    // Filter by file_id if provided
    else if (fileId) {
      query = query.eq("file_id", fileId);
    }
    // Filter by exam_id if provided (through exam_questions junction table)
    else if (examId) {
      // Join through exam_questions table
      const { data: examQuestions, error: eqError } = await supabaseAdmin
        .from("exam_questions")
        .select("question_id")
        .eq("exam_id", examId);

      if (eqError) {
        return NextResponse.json(
          { success: false, error: eqError.message },
          { status: 500, headers: corsHeaders() },
        );
      }

      const questionIds = examQuestions?.map((eq) => eq.question_id) || [];
      if (questionIds.length === 0) {
        return NextResponse.json(
          { success: true, data: [] },
          { headers: corsHeaders() },
        );
      }

      query = query.in("id", questionIds);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(
        `question_text.ilike.%${search}%,explanation.ilike.%${search}%`,
      );
    }

    // Add pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    // Order by order_index
    query = query.order("order_index", { ascending: true });

    const { data: questions, error } = await query;

    if (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { success: true, data: questions },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/questions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing API Token" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { valid } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid API Token" },
        { status: 403, headers: corsHeaders() },
      );
    }

    const body = await req.json();
    const {
      file_id,
      exam_id,
      question_text,
      option1 = "",
      option2 = "",
      option3 = "",
      option4 = "",
      option5 = "",
      answer = "",
      explanation = "",
      subject = null,
      paper = null,
      chapter = null,
      highlight = null,
      type = 0,
    } = body;

    if (!question_text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: question_text" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Database generates UUID via uuid_generate_v4() default value

    // Determine file_id - if not provided, try to get from exam or create default
    let finalFileId = file_id;
    if (!finalFileId || finalFileId === "default") {
      if (exam_id) {
        // Try to get file_id from exam's questions
        const { data: examQs } = await supabaseAdmin
          .from("exam_questions")
          .select("question_id")
          .eq("exam_id", exam_id)
          .limit(1);

        if (examQs && examQs.length > 0) {
          const { data: q } = await supabaseAdmin
            .from("questions")
            .select("file_id")
            .eq("id", examQs[0].question_id)
            .single();
          if (q) finalFileId = q.file_id;
        }
      }

      // If still no file_id, create a default file
      if (!finalFileId) {
        const { data: newFile, error: fileError } = await supabaseAdmin
          .from("files")
          .insert({
            original_filename: "default.csv",
            display_name: "Default Question Bank",
            uploaded_at: new Date().toISOString(),
            total_questions: 0,
            is_bank: true,
          })
          .select()
          .single();

        if (fileError) {
          console.error("Error creating default file:", fileError);
          return NextResponse.json(
            { success: false, error: "Failed to create default file" },
            { status: 500, headers: corsHeaders() },
          );
        }

        finalFileId = newFile?.id;
      }
    }

    // Insert the question
    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .insert({
        file_id: finalFileId,
        question_text,
        option1,
        option2,
        option3,
        option4,
        option5,
        answer,
        explanation,
        subject,
        paper,
        chapter,
        highlight,
        type,
        order_index: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating question:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    // Update file's total_questions count
    const { data: fileData } = await supabaseAdmin
      .from("questions")
      .select("id", { count: "exact" })
      .eq("file_id", finalFileId);

    if (fileData) {
      await supabaseAdmin
        .from("files")
        .update({ total_questions: fileData.length })
        .eq("id", finalFileId);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Question created successfully",
        data: question,
      },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/questions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function PUT(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing API Token" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { valid } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid API Token" },
        { status: 403, headers: corsHeaders() },
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing Question ID" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const allowedFields = [
      "question_text",
      "option1",
      "option2",
      "option3",
      "option4",
      "option5",
      "answer",
      "explanation",
      "type",
      "question_image",
      "explanation_image",
      "subject",
      "paper",
      "chapter",
      "highlight",
    ];

    const updateData: Record<string, unknown> = {};
    allowedFields.forEach((field) => {
      if (field in body) {
        updateData[field] = body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating question:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Question updated successfully",
        data: question,
      },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in PUT /api/questions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing API Token" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { valid } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid API Token" },
        { status: 403, headers: corsHeaders() },
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing Question ID" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Get the question to find its file_id
    const { data: question } = await supabaseAdmin
      .from("questions")
      .select("file_id")
      .eq("id", id)
      .single();

    // Delete the question
    const { error } = await supabaseAdmin
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting question:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    // Update file's total_questions count
    if (question?.file_id) {
      const { data: fileData } = await supabaseAdmin
        .from("questions")
        .select("id", { count: "exact" })
        .eq("file_id", question.file_id);

      if (fileData) {
        await supabaseAdmin
          .from("files")
          .update({ total_questions: fileData.length })
          .eq("id", question.file_id);
      }
    }

    return NextResponse.json(
      { success: true, message: "Question deleted successfully" },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in DELETE /api/questions:", error);
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

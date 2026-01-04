import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, validateApiToken } from "@/lib/supabase";
import { parseCSV } from "@/lib/csv-parser";
import { corsHeaders, handleCors } from "../middleware";

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(request.url);
    let token = url.searchParams.get("token");

    if (!token) {
      const authHeader = request.headers.get("authorization");
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

    const formData = await request.formData();
    const csvFile = formData.get("csv_file") as File | null;

    if (!csvFile) {
      return NextResponse.json(
        { success: false, error: "No CSV file provided" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Validate file type
    if (!csvFile.type.includes("text") && csvFile.type !== "application/csv") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only CSV files are allowed.",
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Validate file size
    if (csvFile.size > MAX_CSV_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_CSV_SIZE / 1024 / 1024}MB.`,
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Parse CSV
    let questions;
    try {
      questions = await parseCSV(csvFile);
    } catch (parseError: unknown) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : "Unknown error";
      return NextResponse.json(
        { success: false, error: `CSV parsing error: ${errorMessage}` },
        { status: 400, headers: corsHeaders() },
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid questions found in CSV file" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Create a file record
    // Database generates UUID via uuid_generate_v4() default value
    const is_bank = formData.get("is_bank")
      ? parseInt(formData.get("is_bank") as string)
      : 1;

    // Start transaction - insert file
    const { data: file, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        original_filename: csvFile.name,
        display_name: csvFile.name,
        total_questions: questions.length,
        is_bank: is_bank === 1,
      })
      .select()
      .single();

    if (fileError) {
      console.error("Error creating file record:", fileError);
      return NextResponse.json(
        { success: false, error: fileError.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    // Insert all questions
    const questionRecords = questions.map((q, index) => ({
      file_id: file.id,
      question_text: q.question_text,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4 || null,
      option5: q.option5 || null,
      answer: q.answer,
      explanation: q.explanation || null,
      subject: q.subject || null,
      paper: q.paper || null,
      chapter: q.chapter || null,
      highlight: q.highlight || null,
      section: q.section || null,
      type: q.type,
      order_index: index,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("questions")
      .insert(questionRecords);

    if (questionsError) {
      console.error("Error inserting questions:", questionsError);
      // Try to rollback file creation
      await supabaseAdmin.from("files").delete().eq("id", file.id);
      return NextResponse.json(
        { success: false, error: questionsError.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${questions.length} questions imported successfully`,
        file_id: file.id,
        total_questions: questions.length,
      },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/upload-csv:", error);
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

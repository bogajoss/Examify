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

    // Fetch all files
    const { data: files, error } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("is_bank", true)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { success: true, data: files },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

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

    const body = await request.json();
    const { original_filename, display_name } = body;

    if (!original_filename) {
      return NextResponse.json(
        { success: false, error: "Missing original_filename" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Database generates UUID via uuid_generate_v4() default value
    const now = new Date().toISOString();

    const { data: file, error } = await supabaseAdmin
      .from("files")
      .insert({
        original_filename,
        display_name: display_name || original_filename,
        uploaded_at: now,
        total_questions: 0,
        is_bank: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating file:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "File record created successfully",
        file_id: file.id,
        file,
      },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing file ID" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Delete all questions in the file first
    await supabaseAdmin.from("questions").delete().eq("file_id", id);

    // Then delete the file
    const { error } = await supabaseAdmin.from("files").delete().eq("id", id);

    if (error) {
      console.error("Error deleting file:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { success: true, message: "File deleted successfully" },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in DELETE /api/files:", error);
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

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, validateApiToken } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../../middleware";

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    const fileId =
      url.searchParams.get("id") || url.searchParams.get("file_id");

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

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "Missing file_id parameter" },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Fetch the file
    const { data: file, error } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { success: true, data: file },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/files/[id]:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
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
    const { id, display_name, original_filename } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing file ID" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const updateData: Record<string, string> = {};
    if (display_name) updateData.display_name = display_name;
    if (original_filename) updateData.original_filename = original_filename;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const { data: file, error } = await supabaseAdmin
      .from("files")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating file:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      );
    }

    return NextResponse.json(
      { success: true, message: "File updated successfully", data: file },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in PUT /api/files/[id]:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
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

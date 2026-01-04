import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../middleware";

/**
 * @deprecated This route proxies to legacy CSV API for backward compatibility.
 * New code should use /api/files directly with Supabase.
 */
export async function GET(request: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing file id parameter" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Fetch from Supabase instead of legacy API
    const { data: file, error } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, data: file },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[FETCH-FILE] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/supabase";
import { corsHeaders, handleCors } from "../../middleware";

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

    const { valid, isAdmin } = await validateApiToken(token);

    return NextResponse.json(
      {
        success: true,
        valid,
        isAdmin,
        message: valid ? "Token is valid" : "Token is invalid",
      },
      { headers: corsHeaders() },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/auth/check:", error);
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

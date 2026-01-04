import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/supabase";

export async function withAuth(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    // Get token from query params or Authorization header
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
        { status: 401 },
      );
    }

    const { valid, isAdmin, userId } = await validateApiToken(token);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid API Token" },
        { status: 403 },
      );
    }

    // Attach auth context to request
    (req as unknown as Record<string, unknown>).auth = {
      isAdmin,
      userId,
      token,
    };

    return handler(req);
  };
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function handleCors(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders(),
    });
  }
  return null;
}

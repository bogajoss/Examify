import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_CSV_API_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_CSV_API_KEY || "";

if (!API_KEY) {
  throw new Error("Missing CSV_API_KEY in environment");
}

function buildBackendUrl(params: Record<string, string | undefined>) {
  const route = params.route || "file";
  const baseUrl = BACKEND_API_BASE.endsWith("/")
    ? BACKEND_API_BASE.slice(0, -1)
    : BACKEND_API_BASE;
  let u = `${baseUrl}/index.php?route=${route}`;

  // id should come first for file routes if present
  if (params.id) u += `&id=${encodeURIComponent(params.id)}`;

  // any other params (stable order)
  Object.keys(params)
    .filter((k) => k !== "id" && k !== "route")
    .sort()
    .forEach((k) => {
      const v = params[k];
      if (v) u += `&${k}=${encodeURIComponent(v)}`;
    });

  u += `&token=${encodeURIComponent(API_KEY)}`;
  return u;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const route = searchParams.get("route");

    // Build URL in exact format: route=...&id=...&token=...
    const url = buildBackendUrl({
      id: id || undefined,
      route: route || undefined,
    });

    const res = await fetch(url, {
      headers: { "User-Agent": "Course-MNR-World-Backend/1.0" },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, message: text },
        { status: res.status },
      );
    }

    const payload = await res.json();
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[FETCH-FILE] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

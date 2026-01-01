import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_CSV_API_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_CSV_API_KEY || "";

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    searchParams.set("token", API_KEY);

    const baseUrl = BACKEND_API_BASE.endsWith("/")
      ? BACKEND_API_BASE.slice(0, -1)
      : BACKEND_API_BASE;
    const url = `${baseUrl}/index.php?${searchParams.toString()}`;
    const incomingContentType = request.headers.get("content-type");

    const headers: Record<string, string> = {
      "User-Agent": "Course-MNR-World-Backend/2.0",
    };

    let body: BodyInit | null = null;
    const method = request.method;

    if (method === "POST" || method === "PUT" || method === "DELETE") {
      if (
        incomingContentType &&
        incomingContentType.includes("multipart/form-data")
      ) {
        body = await request.formData();
      } else {
        headers["Content-Type"] = "application/json";
        try {
          // Parse JSON from request and stringify it properly
          const jsonData = await request.json();
          body = JSON.stringify(jsonData);
        } catch (error) {
          // If it's not JSON, send as text (for compatibility)
          body = await request.text();
        }
      }
    }

    const options: RequestInit = {
      method,
      headers,
      body,
    };

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    const responseText = await response.text();

    if (contentType && contentType.includes("application/json")) {
      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data, { status: response.status });
      } catch {
        console.error(
          "[API-PROXY] JSON Parse Error. Raw response:",
          responseText,
        );
        return NextResponse.json(
          {
            success: false,
            message: "Backend returned invalid JSON",
            error: responseText,
          },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        {
          success: response.ok,
          message: responseText || `Error ${response.status}`,
          data: response.ok ? responseText : null,
        },
        {
          status: response.ok
            ? 200
            : response.status === 200
              ? 502
              : response.status,
        },
      );
    }
  } catch (error) {
    console.error("[API-PROXY] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
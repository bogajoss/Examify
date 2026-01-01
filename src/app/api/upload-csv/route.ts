import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_CSV_API_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_CSV_API_KEY || "";

if (!API_KEY) {
  throw new Error("Missing CSV_API_KEY in environment");
}

const getBaseUrl = () =>
  BACKEND_API_BASE.endsWith("/")
    ? BACKEND_API_BASE.slice(0, -1)
    : BACKEND_API_BASE;

export async function POST(request: NextRequest) {
  try {
    // For CSV upload, we need to handle multipart form data
    const formData = await request.formData();

    // Create a new FormData to send to the backend API
    const backendFormData = new FormData();

    // Add the CSV file
    const csvFile = formData.get("csv_file") as File | null;
    if (!csvFile) {
      return NextResponse.json(
        { success: false, message: "No CSV file provided" },
        { status: 400 },
      );
    }

    backendFormData.append("csv_file", csvFile);

    // Build URL with token
    const url = `${getBaseUrl()}/index.php?route=upload-csv&token=${encodeURIComponent(API_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      body: backendFormData,
      headers: {
        "User-Agent": "Course-MNR-World-Backend/2.0",
      },
    });

    const contentType = response.headers.get("content-type");
    let result;

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: text || `Upload failed (${response.status})`,
        },
        { status: response.status === 200 ? 502 : response.status },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: result.error || "Upload failed" },
        { status: response.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[UPLOAD-CSV] Error:", error);
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

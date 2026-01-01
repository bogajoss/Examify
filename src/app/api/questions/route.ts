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
    const body = await request.json();

    // Build URL
    const url = `${getBaseUrl()}/index.php?route=create-question`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Course-MNR-World-Backend/2.0",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorBody = contentType?.includes("application/json")
        ? (await response.json()).error || "Create question failed"
        : await response.text();
      return NextResponse.json(
        {
          success: false,
          message:
            typeof errorBody === "string"
              ? errorBody
              : JSON.stringify(errorBody),
        },
        { status: response.status },
      );
    }

    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { success: false, message: "Unexpected response format from backend" },
        { status: 502 },
      );
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CREATE-QUESTION] Error:", error);
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Build URL
    const url = `${getBaseUrl()}/index.php?route=update-question`;

    const response = await fetch(url, {
      method: "PUT", // PHP backend accepts POST or PUT for updates, but PUT is more semantically correct
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Course-MNR-World-Backend/2.0",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorBody = contentType?.includes("application/json")
        ? (await response.json()).error || "Update question failed"
        : await response.text();
      return NextResponse.json(
        {
          success: false,
          message:
            typeof errorBody === "string"
              ? errorBody
              : JSON.stringify(errorBody),
        },
        { status: response.status },
      );
    }

    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { success: false, message: "Unexpected response format from backend" },
        { status: 502 },
      );
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[UPDATE-QUESTION] Error:", error);
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Build URL
    const url = `${getBaseUrl()}/index.php?route=delete-question`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Course-MNR-World-Backend/2.0",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorBody = contentType?.includes("application/json")
        ? (await response.json()).error || "Delete question failed"
        : await response.text();
      return NextResponse.json(
        {
          success: false,
          message:
            typeof errorBody === "string"
              ? errorBody
              : JSON.stringify(errorBody),
        },
        { status: response.status },
      );
    }

    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { success: false, message: "Unexpected response format from backend" },
        { status: 502 },
      );
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[DELETE-QUESTION] Error:", error);
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

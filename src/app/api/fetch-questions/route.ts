import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_CSV_API_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_CSV_API_KEY || "";

if (!API_KEY) {
  throw new Error(
    "Missing CSV_API_KEY or NEXT_PUBLIC_CSV_API_KEY in environment",
  );
}

// Helper to make CSV API URLs with consistent parameter order
function buildBackendUrl(params: Record<string, string | undefined>) {
  const baseUrl = BACKEND_API_BASE.endsWith("/")
    ? BACKEND_API_BASE.slice(0, -1)
    : BACKEND_API_BASE;
  // Always point to index.php
  let u = `${baseUrl}/index.php?route=questions`;

  // Add known params in a deterministic order
  const order = ["id", "file_id", "exam_id", "limit", "offset"];
  for (const k of order) {
    const v = params[k];
    if (v) u += `&${k}=${encodeURIComponent(v)}`;
  }

  // Token must go last per spec
  u += `&token=${encodeURIComponent(API_KEY)}`;
  return u;
}

// Shape returned by new PHP API questions endpoint
interface RawQuestion {
  id: string; // UUID
  file_id: string;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  option5: string;
  answer: string;
  explanation: string;
  question_image_url?: string;
  explanation_image_url?: string;
  subject?: string;
  paper?: string;
  chapter?: string;
  highlight?: string;
  type: string;
  order_index: string;
  question_marks?: string | number;
  created_at: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("file_id");
    const examId = searchParams.get("exam_id");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    console.log(
      `[FETCH-QUESTIONS] Request received. file_id: ${fileId || "N/A"}, exam_id: ${examId || "N/A"}`,
    );

    const url = buildBackendUrl({
      file_id: fileId || undefined,
      exam_id: examId || undefined,
      limit: limit || undefined,
      offset: offset || undefined,
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Course-MNR-World-Backend/2.0",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorBody = contentType?.includes("application/json")
        ? (await response.json()).error ||
          `API fetch failed (${response.status})`
        : await response.text();
      console.error("[FETCH-QUESTIONS] Non-OK:", response.status, errorBody);
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
      await response.text();
      return NextResponse.json(
        { success: false, message: "Unexpected response format from backend" },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const raw = payload.data;

    if (!Array.isArray(raw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unexpected API response shape: data is not an array",
        },
        { status: 502 },
      );
    }

    const transformed = raw.map((q: RawQuestion) => ({
      id: q.id,
      file_id: q.file_id,
      question: q.question_text || "",
      question_text: q.question_text || "",
      options: [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
        (o) => o && o.trim() !== "",
      ),
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
      correct: q.answer, // legacy front-end expects 'correct'
      answer: q.answer,
      explanation: q.explanation || "",
      question_image_url: q.question_image_url,
      explanation_image_url: q.explanation_image_url,
      subject: q.subject,
      paper: q.paper,
      chapter: q.chapter,
      highlight: q.highlight,
      type: q.type,
      order_index: q.order_index,
      question_marks: q.question_marks,
      created_at: q.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: { questions: transformed, total: transformed.length },
    });
  } catch (error) {
    console.error("[FETCH-QUESTIONS] Error:", error);
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

// Support POST for backward compatibility
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file_id } = body;

    const url = buildBackendUrl({ file_id: file_id || undefined });

    const response = await fetch(url, {
      headers: { "User-Agent": "Course-MNR-World-Backend/2.0" },
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorBody = contentType?.includes("application/json")
        ? (await response.json()).error || `Failed (${response.status})`
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

    const payload = await response.json();
    const raw = payload.data;

    if (!Array.isArray(raw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unexpected API shape: data is not an array",
        },
        { status: 502 },
      );
    }
    const transformed = raw.map((q: RawQuestion) => ({
      id: q.id,
      file_id: q.file_id,
      question: q.question_text || "",
      question_text: q.question_text || "",
      options: [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
        (o) => o && o.trim() !== "",
      ),
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      option5: q.option5,
      correct: q.answer,
      answer: q.answer,
      explanation: q.explanation || "",
      question_image_url: q.question_image_url,
      explanation_image_url: q.explanation_image_url,
      subject: q.subject,
      paper: q.paper,
      chapter: q.chapter,
      highlight: q.highlight,
      type: q.type,
      order_index: q.order_index,
      question_marks: q.question_marks,
      created_at: q.created_at,
    }));
    return NextResponse.json({ success: true, questions: transformed });
  } catch (error) {
    console.error("[FETCH-QUESTIONS-POST] Error:", error);
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

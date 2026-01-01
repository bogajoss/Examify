import { NextRequest, NextResponse } from "next/server";
import { maskRollNumber } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { examId } = await request.json();

    if (!examId) {
      return NextResponse.json({ error: "Exam ID required" }, { status: 400 });
    }

    // Fetch exam details from Supabase
    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Fetch all student results for this exam from Supabase
    const { data: results, error: resultsError } = await supabaseAdmin
      .from("student_exams")
      .select("*, users!inner(name, roll)")
      .eq("exam_id", examId);

    if (resultsError || !results) {
      return NextResponse.json(
        { error: "Failed to fetch results" },
        { status: 500 },
      );
    }

    // Create CSV content
    const headers = [
      "ক্র.স.",
      "নাম",
      "রোল",
      "স্কোর",
      "সঠিক",
      "ভুল",
      "উত্তর না দেওয়া",
      "জমা দেওয়ার সময়",
    ];

    const rows: string[] = [];

    // Add summary info as comments
    rows.push(`# পরীক্ষা: ${exam.name}`);
    rows.push(`# সময়: ${exam.duration_minutes} মিনিট`);
    rows.push(`# নেগেটিভ মার্ক: ${exam.negative_marks_per_wrong}`);
    rows.push(`# মোট শিক্ষার্থী: ${results?.length || 0}`);
    rows.push("");

    // Add CSV headers
    rows.push(headers.map((h) => `"${h}"`).join(","));

    // Add data rows
    (
      results as {
        users: { name: string; roll: string };
        score: number;
        correct_answers: number;
        wrong_answers: number;
        unattempted: number;
        submitted_at: string;
      }[]
    ).forEach((result, idx: number) => {
      const row = [
        idx + 1,
        `"${result.users.name || "N/A"}"`,
        `"${maskRollNumber(result.users.roll || "N/A")}"`,
        (result.score || 0).toFixed(2),
        result.correct_answers || 0,
        result.wrong_answers || 0,
        result.unattempted || 0,
        `"${formatDate(result.submitted_at, "DD/MM/YYYY, hh:mm A")}"`,
      ];
      rows.push(row.join(","));
    });

    const csv = rows.join("\n");

    // Return CSV as downloadable file
    const filename = `${exam.name.replace(/\s+/g, "_")}_results_${Date.now()}.csv`;
    const encoder = new TextEncoder();
    return new NextResponse(encoder.encode(csv), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "Failed to export CSV" },
      { status: 500 },
    );
  }
}

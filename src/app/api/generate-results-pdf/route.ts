import { NextRequest, NextResponse } from "next/server";
import { maskMobileNumber } from "@/lib/utils";
import dayjs, { formatDate } from "@/lib/date-utils";
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

    const processedResults = results.map((result: any) => ({
      ...result,
      student_id: {
        name: result.users.name,
        roll: maskMobileNumber(result.users.roll),
      },
      score: result.score || 0,
    }));

    // Calculate statistics
    const totalStudents = processedResults?.length || 0;
    const avgScore =
      totalStudents > 0
        ? (processedResults?.reduce((sum, r) => sum + (r.score || 0), 0) || 0) /
          totalStudents
        : 0;
    const maxScore = Math.max(
      ...(processedResults?.map((r) => r.score || 0) || [0]),
    );
    const minScore = Math.min(
      ...(processedResults?.map((r) => r.score || 0) || [0]),
    );

    // Generate HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <title>${exam.name} - ফলাফল</title>
    <link href="/SolaimanLipi.ttf" rel="preload" as="font" type="font/ttf" crossorigin>
    <style>
        @font-face {
          font-family: 'SolaimanLipi';
          src: url('/SolaimanLipi.ttf') format('truetype');
        }
        body { 
          font-family: 'SolaimanLipi', sans-serif; 
          line-height: 1.6;
          position: relative;
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: -1;
          opacity: 0.05;
          width: 60%;
        }
        .container {
          padding: 20px;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        h1 { text-align: center; color: #333; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
        hr { margin: 20px 0; border: 1px solid #ddd; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #333; }
        .details-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; font-size: 12px; }
        .details-grid span { color: #555; }
        .details-grid strong { font-weight: bold; }
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .stat-box { padding: 10px; border: 1px solid #ddd; text-align: center; }
        .stat-value { font-size: 18px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 11px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background-color: #f0f0f0; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="watermark">
      <img src="/icon.png" alt="watermark" style="width: 100%; height: auto;" />
    </div>
    <div class="container">
      <h1>পরীক্ষা ফলাফল রিপোর্ট</h1>
      <div class="subtitle">Exam Result Report</div>
      <hr>

      <div class="section">
          <div class="section-title">পরীক্ষার বিবরণ</div>
          <div class="details-grid">
              <span>নাম / Name:</span>
              <strong>${exam.name}</strong>
              
              <span>সময়:</span>
              <strong>${exam.duration_minutes} মিনিট</strong>
              
              <span>নেগেটিভ মার্ক:</span>
              <strong>${exam.negative_marks_per_wrong}</strong>

              <span>তৈরির তারিখ:</span>
              <strong>${formatDate(exam.created_at, "DD/MM/YYYY")}</strong>
          </div>
      </div>

      <div class="section">
          <div class="section-title">সংক্ষিপ্ত পরিসংখ্যান</div>
          <div class="stats">
              <div class="stat-box">
                  <div class="stat-value">${totalStudents}</div>
                  <div class="stat-label">মোট শিক্ষার্থী</div>
              </div>
              <div class="stat-box">
                  <div class="stat-value">${avgScore.toFixed(2)}</div>
                  <div class="stat-label">গড় স্কোর</div>
              </div>
              <div class="stat-box">
                  <div class="stat-value">${maxScore}</div>
                  <div class="stat-label">সর্বোচ্চ স্কোর</div>
              </div>
              <div class="stat-box">
                  <div class="stat-value">${minScore}</div>
                  <div class="stat-label">সর্বনিম্ন স্কোর</div>
              </div>
          </div>
      </div>

      <div class="section">
          <div class="section-title">শিক্ষার্থীর বিস্তারিত ফলাফল</div>
          <table>
              <thead>
                  <tr>
                      <th>ক্র.স.</th>
                      <th>নাম</th>
                      <th>রোল</th>
                      <th>স্কোর</th>
                      <th>সঠিক</th>
                      <th>ভুল</th>
                      <th>উত্তর না দেওয়া</th>
                  </tr>
              </thead>
              <tbody>
                  ${(processedResults || [])
                    .map(
                      (r, idx) => `
                      <tr>
                          <td>${idx + 1}</td>
                          <td>${r.student_id.name || "N/A"}</td>
                          <td>${maskMobileNumber(r.student_id.roll || "N/A")}</td>
                          <td><strong>${r.score?.toFixed(2) || 0}</strong></td>
                          <td>${r.correct_answers || 0}</td>
                          <td>${r.wrong_answers || 0}</td>
                          <td>${r.unattempted || 0}</td>
                      </tr>
                  `,
                    )
                    .join("")}
              </tbody>
          </table>
      </div>

      <div className="footer">
          <p style="font-weight: bold; font-size: 12px;">&copy; Examify</p>
          <p>Generated on: ${formatDate(dayjs(), "DD MMMM YYYY, hh:mm A")}</p>
      </div>
    </div>
</body>
</html>
    `;

    // Return HTML for browser to handle printing/PDF generation
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate results" },
      { status: 500 },
    );
  }
}

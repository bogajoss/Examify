import { NextRequest, NextResponse } from "next/server";
import dayjs, { formatDate } from "@/lib/date-utils";
import { maskRollNumber } from "@/lib/utils";

interface ExamResult {
  name: string;
  score: number;
}

interface ReportData {
  roll: string;
  name: string;
  present: boolean;
  exams: ExamResult[];
  mandatory_done: boolean;
  optional_done: boolean;
  todo_done: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const {
      date,
      reports,
      batchName,
    }: { date: string; reports: ReportData[]; batchName: string } =
      await req.json();

    if (!reports || !Array.isArray(reports)) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>এটেন্ডেন্স ও টাস্ক রিপোর্ট - ${batchName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <link href="/SolaimanLipi.ttf" rel="preload" as="font" type="font/ttf" crossorigin>
        <style>
          @font-face {
            font-family: 'SolaimanLipi';
            src: url('/SolaimanLipi.ttf') format('truetype');
          }
          body { 
            font-family: 'Hind Siliguri', 'SolaimanLipi', sans-serif; 
            padding: 20px; 
            line-height: 1.6; 
            position: relative; 
            color: #1a1a1a;
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
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .meta { font-size: 14px; color: #333; margin-top: 5px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; border-bottom: 2px solid #333; }
          .present { color: green; font-weight: bold; }
          .absent { color: red; }
          .done { color: blue; }
          .pending { color: #999; }
          .exam-badge { display: block; font-size: 10px; margin-bottom: 2px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          <img src="/icon.png" alt="watermark" style="width: 100%; height: auto;" />
        </div>
        <div class="header">
          <h1 class="title">এটেন্ডেন্স ও টাস্ক রিপোর্ট</h1>
          <div class="subtitle">Daily Attendance & Task Report</div>
          <div class="meta">ব্যাচ: ${batchName} | তারিখ: ${date}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>নাম</th>
              <th>রোল</th>
              <th>উপস্থিতি</th>
              <th>পরীক্ষা</th>
              <th>বাধ্যতামূলক</th>
              <th>ঐচ্ছিক</th>
              <th>করণীয়</th>
            </tr>
          </thead>
          <tbody>
            ${reports
              .map(
                (r: ReportData) => `
              <tr>
                <td>${r.name}</td>
                <td>${maskRollNumber(r.roll)}</td>
                <td class="${r.present ? "present" : "absent"}">${r.present ? "উপস্থিত" : "অনুপস্থিত"}</td>
                <td>
                  ${
                    r.exams && r.exams.length > 0
                      ? r.exams
                          .map(
                            (ex: ExamResult) =>
                              `<div class="exam-badge">${ex.name}: <b>${ex.score.toFixed(2)}</b></div>`,
                          )
                          .join("")
                      : "অংশ নেয়নি"
                  }
                </td>
                <td class="${r.mandatory_done ? "done" : "pending"}">${r.mandatory_done ? "সম্পন্ন" : "বাকি"}</td>
                <td class="${r.optional_done ? "done" : "pending"}">${r.optional_done ? "সম্পন্ন" : "নেই"}</td>
                <td class="${r.todo_done ? "done" : "pending"}">${r.todo_done ? "সম্পন্ন" : "নেই"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="margin-top: 40px; text-align: right; font-size: 12px; color: #999;">
          রিপোর্ট জেনারেট করা হয়েছে: ${formatDate(dayjs(), "DD MMMM YYYY, hh:mm A")}
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

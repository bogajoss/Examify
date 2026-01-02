"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RawQuestion } from "@/lib/fetchQuestions";
import LatexRenderer from "@/components/LatexRenderer";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import dayjs, { formatDate } from "@/lib/date-utils";

type Props = {
  questions: RawQuestion[] | null;
  examName?: string;
  onEdit?: (question: RawQuestion) => void;
  onDelete?: (questionId: string) => void;
};

export default function BulkQuestionList({
  questions,
  examName,
  onEdit,
  onDelete,
}: Props) {
  const [mode, setMode] = React.useState<"question" | "solution">("question");
  const [filters] = React.useState({
    subject: "all",
    paper: "all",
    chapter: "all",
    highlight: "all",
    search: "",
  });

  const filteredQuestions = React.useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => {
      const matchesSubject =
        filters.subject === "all" || q.subject === filters.subject;
      const matchesPaper = filters.paper === "all" || q.paper === filters.paper;
      const matchesChapter =
        filters.chapter === "all" || q.chapter === filters.chapter;
      const matchesHighlight =
        filters.highlight === "all" || q.highlight === filters.highlight;

      const searchText = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        (q.question || q.question_text || "")
          .toLowerCase()
          .includes(searchText) ||
        (q.explanation || "").toLowerCase().includes(searchText);

      return (
        matchesSubject &&
        matchesPaper &&
        matchesChapter &&
        matchesHighlight &&
        matchesSearch
      );
    });
  }, [questions, filters]);

  const buildPrintableHtml = (printMode: "question" | "solution") => {
    if (!filteredQuestions || filteredQuestions.length === 0) return "";

    const questionsHtml = (filteredQuestions || [])
      .map((q, idx) => {
        const qHtml = (q.question || q.question_text || "").replace(
          /<img/g,
          '<img class="qimg"',
        );
        const optsCandidate = (q as Record<string, unknown>).options;
        const opts = Array.isArray(optsCandidate)
          ? (optsCandidate as string[]).filter(
              (o) => o && typeof o === "string" && o.trim() !== "",
            )
          : [q.option1, q.option2, q.option3, q.option4, q.option5].filter(
              (o): o is string => Boolean(o),
            );
        const answer =
          typeof q.answer === "number"
            ? String.fromCharCode(65 + Number(q.answer))
            : String(q.answer || "");
        const explanation = (q.explanation || "").replace(
          /<img/g,
          '<img class="qimg"',
        );

        const qImgHtml = q.question_image_url
          ? `<div style='margin-top: 8px; margin-bottom: 8px;'><img src='${q.question_image_url}' style='max-width: 100%; height: auto; border-radius: 4px;' /></div>`
          : "";

        const optionsHtml = opts
          .map(
            (o, i) =>
              `<div style='margin-bottom:6px;'><strong>${String.fromCharCode(65 + i)}.</strong> ${o}</div>`,
          )
          .join("");

        const answerHtml =
          printMode === "solution"
            ? `<div style='margin-top: 12px; padding: 8px; background-color: #f3f4f6; border-radius: 4px'><strong style='color: #374151'>উত্তর:</strong> <span style='font-weight: bold; color: #059669'>${answer}</span></div>`
            : "";

        const expImgHtml =
          printMode === "solution" && q.explanation_image_url
            ? `<div style='margin-top: 8px;'><img src='${q.explanation_image_url}' style='max-width: 100%; height: auto; border-radius: 4px;' /></div>`
            : "";

        const explanationHtml =
          printMode === "solution" && (explanation || q.explanation_image_url)
            ? `<div style='margin-top: 8px; padding: 8px; background-color: #fef3c7; border-radius: 4px'><strong style='color: #78350f'>ব্যাখ্যা:</strong>${explanation ? `<div style='margin-top: 4px; color: #92400e'>${explanation}</div>` : ""}${expImgHtml}</div>`
            : "";

        const metaTags = [];
        if (q.subject) metaTags.push(`Subject: ${q.subject}`);
        if (q.paper) metaTags.push(`Paper: ${q.paper}`);
        if (q.chapter) metaTags.push(`Chapter: ${q.chapter}`);
        if (q.highlight) metaTags.push(`Highlight: ${q.highlight}`);

        const metaHtml =
          metaTags.length > 0
            ? `<div style='margin-top: 8px; font-size: 11px; color: #6b7280; font-style: italic;'>${metaTags.join(" | ")}</div>`
            : "";

        return `
          <div style='page-break-inside: avoid; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb'>
            <div style='margin-bottom: 8px'>
              <strong style='font-size: 16px'>প্রশ্ন ${idx + 1}.</strong>
              <div style='margin-top: 4px; font-size: 15px'>${qHtml}</div>
              ${qImgHtml}
              ${metaHtml}
            </div>
            <div style='margin-top: 12px; margin-left: 12px'>${optionsHtml}</div>
            ${answerHtml}
            ${explanationHtml}
          </div>
        `;
      })
      .join("");

    return `
      <html>
        <head>
          <meta charset='UTF-8' />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${examName || "সকল প্রশ্ন"}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8" crossorigin="anonymous"></script>
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05" crossorigin="anonymous"
              onload="renderMathInElement(document.body);"></script>
          <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { 
              font-family: 'Hind Siliguri', sans-serif; 
              padding: 24px; 
              color: #111827; 
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
            .container { max-width: 900px; margin: 0 auto }
            .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #1f2937; padding-bottom: 16px; }
            .header h1 { margin: 0; font-size: 28px; color: #1f2937 }
            .header p { margin: 8px 0 0 0; color: #6b7280; font-size: 14px }
            .meta { margin-top: 12px; padding: 8px 12px; background-color: #f9fafb; border-radius: 4px; font-size: 12px; color: #6b7280; }
            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; }
            .qimg {
              width: 100%;
              max-width: 400px;
            }
            @media print { 
              body { 
                padding: 12px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              } 
              .container { max-width: 100% } 
              .header { page-break-after: avoid } 
            }
          </style>
        </head>
        <body>
          <div class="watermark">
            <img src="${window.location.origin}/icon.png" alt="watermark" style="width: 100%; height: auto;" />
          </div>
          <div class="container">
            <div class="header">
              <h1>${examName || "সকল প্রশ্ন"}</h1>
              <p>মোট প্রশ্ন: ${filteredQuestions.length}</p>
              <div class="meta">নির্মিত: ${formatDate(dayjs(), "DD MMMM YYYY, hh:mm A")}</div>
            </div>
            ${questionsHtml}
            <div class="footer">
              <p style="font-weight: bold; font-size: 12px;">&copy; Examify</p>
              <p>Generated on: ${formatDate(dayjs(), "DD MMMM YYYY, hh:mm A")}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintMode = (printMode: "question" | "solution") => {
    if (!filteredQuestions || filteredQuestions.length === 0) return;

    // Build HTML and open in new window synchronously (user-initiated click)
    const html = buildPrintableHtml(printMode);
    try {
      const blob = new Blob([html], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const newWin = window.open(url, "_blank");
      if (!newWin) {
        // fallback: download the HTML file
        const a = document.createElement("a");
        a.href = url;
        a.download = `${examName || "questions"}_${printMode}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      // Try to print after load
      newWin.focus();
      setTimeout(() => {
        try {
          newWin.print();
        } catch (err) {
          console.error("Print failed:", err);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-2 items-center">
          <Button
            variant={mode === "question" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("question")}
          >
            শুধু প্রশ্ন
          </Button>
          <Button
            variant={mode === "solution" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("solution")}
          >
            সমাধান
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrintMode("question")}
          >
            প্রশ্ন প্রিন্ট
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrintMode("solution")}
          >
            সমাধানসহ প্রিন্ট
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          ({filteredQuestions.length} টি প্রশ্ন পাওয়া গেছে)
        </div>
      </div>

      <div
        className={cn(
          "prose dark:prose-invert max-w-none p-4 rounded-md border space-y-6 bg-card text-card-foreground relative overflow-hidden",
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] opacity-5 pointer-events-none select-none z-0">
          <img src="/icon.png" alt="watermark" className="w-full h-auto" />
        </div>

        {filteredQuestions && filteredQuestions.length > 0 ? (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="border-b pb-6 last:border-b-0 group relative z-10"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <strong className="text-lg">প্রশ্ন {idx + 1}.</strong>
                      {(q.subject || q.paper || q.chapter || q.highlight) && (
                        <div className="flex flex-wrap gap-1.5">
                          {q.subject && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200 font-normal"
                            >
                              {q.subject}
                            </Badge>
                          )}
                          {q.paper && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-green-50 text-green-600 border-green-200 font-normal"
                            >
                              {q.paper}
                            </Badge>
                          )}
                          {q.chapter && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-purple-50 text-purple-600 border-purple-200 font-normal"
                            >
                              {q.chapter}
                            </Badge>
                          )}
                          {q.highlight && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-200 font-normal"
                            >
                              {q.highlight}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <LatexRenderer
                        html={(q.question || q.question_text || "").replace(
                          /<img/g,
                          '<img class="qimg"',
                        )}
                      />
                    </div>
                    {q.question_image_url && (
                      <div className="my-3 rounded-lg overflow-hidden border border-border bg-muted/30 max-w-md">
                        <img
                          src={q.question_image_url as string}
                          alt="Question"
                          className="max-w-full h-auto"
                          loading="lazy"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          style={{ userSelect: "none" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {(onEdit || onDelete) && (
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(q)}
                        className="h-8 w-8 p-0"
                        title="এডিট করুন"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && q.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(q.id!)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {(() => {
                const optsCandidate = (q as Record<string, unknown>).options;
                const optsArr: string[] = Array.isArray(optsCandidate)
                  ? (optsCandidate as string[]).filter(
                      (o) => o && typeof o === "string" && o.trim() !== "",
                    )
                  : [
                      q.option1,
                      q.option2,
                      q.option3,
                      q.option4,
                      q.option5,
                    ].filter((o): o is string => Boolean(o));
                if (!optsArr || optsArr.length === 0) return null;
                return (
                  <div className="mt-3 space-y-2 ml-4">
                    {optsArr.map((opt: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="font-semibold">
                          {String.fromCharCode(65 + i)}.
                        </div>
                        <div className="flex-1">
                          <LatexRenderer html={String(opt)} />
                        </div>
                      </div>
                    ))}

                    {mode === "solution" && (
                      <>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <strong>উত্তর:</strong>
                          <span className="ml-2">
                            {typeof q.answer === "number"
                              ? String.fromCharCode(65 + Number(q.answer))
                              : String(q.answer)}
                          </span>
                        </div>

                        {q.explanation && (
                          <div className="mt-3">
                            <strong>ব্যাখ্যা:</strong>
                            <div className="mt-1 text-sm">
                              <LatexRenderer
                                html={(q.explanation || "").replace(
                                  /<img/g,
                                  '<img class="qimg"',
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {q.explanation_image_url && (
                          <div className="my-3 rounded-lg overflow-hidden border border-border bg-muted/30 max-w-md">
                            <img
                              src={q.explanation_image_url as string}
                              alt="Explanation"
                              className="max-w-full h-auto"
                              loading="lazy"
                              onContextMenu={(e) => e.preventDefault()}
                              onDragStart={(e) => e.preventDefault()}
                              style={{ userSelect: "none" }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">কোনো প্রশ্ন নেই</p>
        )}
      </div>
    </div>
  );
}

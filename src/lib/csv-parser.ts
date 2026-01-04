/**
 * CSV Parser for Question Bank
 * Handles parsing of CSV files with questions
 */

export interface ParsedQuestion {
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4?: string;
  option5?: string;
  answer: string;
  explanation?: string;
  subject?: string;
  paper?: string;
  chapter?: string;
  highlight?: string;
  type: number;
}

/**
 * Clean up HTML tags from CSV data
 * Removes color attributes from font tags
 */
export function cleanCsvHtml(text: string): string {
  if (!text) return text;

  // Remove color="..." attribute from <font> tags
  text = text.replace(
    /(<font\b[^>]*?)\bcolor\s*=\s*["']?[^"'>]*?["']?([^>]*?>)/gi,
    function ($0, $1, $2) {
      return $1 + $2;
    },
  );

  return text;
}

/**
 * Detect if answers are 0-indexed (start from 0)
 */
export function detectZeroIndexedAnswers(questions: ParsedQuestion[]): boolean {
  if (!questions || questions.length === 0) return false;

  let hasZero = false;
  let maxOptionValue = 0;

  for (const q of questions) {
    const answer = String(q.answer).trim();

    if (!isNaN(Number(answer))) {
      const answerVal = parseInt(answer);

      if (answerVal === 0) {
        hasZero = true;
      }

      maxOptionValue = Math.max(maxOptionValue, answerVal);
    }
  }

  return hasZero && maxOptionValue <= 5;
}

/**
 * Convert 0-indexed answers to 1-indexed
 */
export function convertAnswersFromZeroToOne(questions: ParsedQuestion[]): void {
  for (const q of questions) {
    const answer = String(q.answer).trim();

    if (!isNaN(Number(answer))) {
      const answerVal = parseInt(answer);
      q.answer = String(answerVal + 1);
    }
  }
}

/**
 * Parse CSV content and extract questions
 */
export async function parseCSV(file: File): Promise<ParsedQuestion[]> {
  const content = await file.text();

  // Detect and handle encoding
  // CSV files may have BOM (Byte Order Mark)
  let csv = content;
  if (csv.charCodeAt(0) === 0xfeff) {
    csv = csv.slice(1);
  }

  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV file must have header and at least one data row");
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/['"]|^\s+|\s+$/g, ""),
  );

  // Find column indices
  const findColumnIndex = (
    names: string[],
    ...alternatives: string[][]
  ): number => {
    for (let i = 0; i < names.length; i++) {
      for (const alt of alternatives) {
        if (alt.includes(names[i])) return i;
      }
    }
    return -1;
  };

  const questionCol = findColumnIndex(headers, [
    "question",
    "question_text",
    "q",
  ]);
  const option1Col = findColumnIndex(headers, [
    "option1",
    "option_1",
    "opt1",
    "a",
  ]);
  const option2Col = findColumnIndex(headers, [
    "option2",
    "option_2",
    "opt2",
    "b",
  ]);
  const option3Col = findColumnIndex(headers, [
    "option3",
    "option_3",
    "opt3",
    "c",
  ]);
  const option4Col = findColumnIndex(headers, [
    "option4",
    "option_4",
    "opt4",
    "d",
  ]);
  const option5Col = findColumnIndex(headers, [
    "option5",
    "option_5",
    "opt5",
    "e",
  ]);
  const answerCol = findColumnIndex(headers, [
    "answer",
    "ans",
    "correct_answer",
  ]);
  const explanationCol = findColumnIndex(headers, [
    "explanation",
    "exp",
    "explanation_text",
  ]);
  const subjectCol = findColumnIndex(headers, ["subject", "subject_name"]);
  const paperCol = findColumnIndex(headers, ["paper", "paper_name"]);
  const chapterCol = findColumnIndex(headers, ["chapter", "chapter_name"]);
  const highlightCol = findColumnIndex(headers, ["highlight", "tag"]);
  const typeCol = findColumnIndex(headers, ["type", "question_type"]);

  if (
    questionCol === -1 ||
    option1Col === -1 ||
    option2Col === -1 ||
    option3Col === -1 ||
    answerCol === -1
  ) {
    throw new Error(
      "CSV must have columns: question, option1, option2, option3, answer",
    );
  }

  const questions: ParsedQuestion[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Robust CSV splitting that handles quoted commas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const question_text = values[questionCol]?.trim() || "";
    if (!question_text) continue;

    questions.push({
      question_text: cleanCsvHtml(question_text),
      option1: cleanCsvHtml(values[option1Col] || ""),
      option2: cleanCsvHtml(values[option2Col] || ""),
      option3: cleanCsvHtml(values[option3Col] || ""),
      option4:
        option4Col >= 0 ? cleanCsvHtml(values[option4Col] || "") : undefined,
      option5:
        option5Col >= 0 ? cleanCsvHtml(values[option5Col] || "") : undefined,
      answer: values[answerCol] || "",
      explanation:
        explanationCol >= 0
          ? cleanCsvHtml(values[explanationCol] || "")
          : undefined,
      subject:
        subjectCol >= 0 ? values[subjectCol]?.trim() || undefined : undefined,
      paper: paperCol >= 0 ? values[paperCol]?.trim() || undefined : undefined,
      chapter:
        chapterCol >= 0 ? values[chapterCol]?.trim() || undefined : undefined,
      highlight:
        highlightCol >= 0
          ? values[highlightCol]?.trim() || undefined
          : undefined,
      type: typeCol >= 0 ? parseInt(values[typeCol]) || 0 : 0,
    });
  }

  // Check for 0-indexed answers and convert if needed
  if (detectZeroIndexedAnswers(questions)) {
    convertAnswersFromZeroToOne(questions);
  }

  return questions;
}

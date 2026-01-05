/**
 * CSV Parser for Question Bank
 * Handles parsing of CSV files with questions
 */

import Papa from "papaparse";

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
  section?: string;
}

/**
 * Clean up HTML tags from CSV data
 * Removes color attributes from font tags
 */
export function cleanCsvHtml(text: string): string {
  if (!text) return text;

  // Remove <font> and </font> tags completely, keeping only the content inside
  text = text.replace(/<font[^>]*>|<\/font>/gi, "");

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
  // For browser environments, use FileReader
  if (typeof window !== "undefined" && window.FileReader) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          parseCSVContent(csv).then(resolve).catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  } else {
    // For Node.js environments, get text directly from file
    const content = await file.text();
    return parseCSVContent(content);
  }
}

/**
 * Parse CSV content string and extract questions
 */
export async function parseCSVContent(csv: string): Promise<ParsedQuestion[]> {
  // Detect and handle encoding
  // CSV files may have BOM (Byte Order Mark)
  let content = csv;
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  // Parse CSV using PapaParse which handles multi-line quoted fields properly
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transform: (value: string) => {
      // Remove surrounding quotes if present and handle escaped quotes
      if (
        typeof value === "string" &&
        value.startsWith('"') &&
        value.endsWith('"')
      ) {
        return value.slice(1, -1).replace(/""/g, '"');
      }
      return value;
    },
  });

  if (results.errors.length > 0) {
    console.error("CSV parsing errors:", results.errors);
  }

  if (!results.data || results.data.length === 0) {
    throw new Error("CSV file must have header and at least one data row");
  }

  // Get the headers from the parsed data
  const headers = Object.keys(results.data[0] as Record<string, unknown>).map((h) =>
    h.trim().toLowerCase(),
  );

  // Find column indices
  const findColumnIndex = (names: string[]): number => {
    for (const name of names) {
      const index = headers.findIndex((h) => h === name.toLowerCase());
      if (index !== -1) return index;
    }
    return -1;
  };

  const questionCol = findColumnIndex([
    "question",
    "questions",
    "question_text",
    "q",
  ]);
  const option1Col = findColumnIndex(["option1", "option_1", "opt1", "a"]);
  const option2Col = findColumnIndex(["option2", "option_2", "opt2", "b"]);
  const option3Col = findColumnIndex(["option3", "option_3", "opt3", "c"]);
  const option4Col = findColumnIndex(["option4", "option_4", "opt4", "d"]);
  const option5Col = findColumnIndex(["option5", "option_5", "opt5", "e"]);
  const answerCol = findColumnIndex(["answer", "ans", "correct_answer"]);
  const explanationCol = findColumnIndex([
    "explanation",
    "exp",
    "explanation_text",
  ]);
  const subjectCol = findColumnIndex(["subject", "subject_name"]);
  const paperCol = findColumnIndex(["paper", "paper_name"]);
  const chapterCol = findColumnIndex(["chapter", "chapter_name"]);
  const highlightCol = findColumnIndex(["highlight", "tag"]);
  const typeCol = findColumnIndex(["type", "question_type"]);
  const sectionCol = findColumnIndex(["section", "section_name"]);

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
  for (const row of results.data) {
    if (!row) continue;

    const rowValues = Object.values(row as Record<string, unknown>);

    const question_text = rowValues[questionCol]?.toString()?.trim() || "";
    if (!question_text) continue;

    questions.push({
      question_text: cleanCsvHtml(question_text),
      option1: cleanCsvHtml(rowValues[option1Col]?.toString() || ""),
      option2: cleanCsvHtml(rowValues[option2Col]?.toString() || ""),
      option3: cleanCsvHtml(rowValues[option3Col]?.toString() || ""),
      option4:
        option4Col >= 0
          ? cleanCsvHtml(rowValues[option4Col]?.toString() || "")
          : undefined,
      option5:
        option5Col >= 0
          ? cleanCsvHtml(rowValues[option5Col]?.toString() || "")
          : undefined,
      answer: rowValues[answerCol]?.toString() || "",
      explanation:
        explanationCol >= 0
          ? cleanCsvHtml(rowValues[explanationCol]?.toString() || "")
          : undefined,
      subject:
        subjectCol >= 0
          ? rowValues[subjectCol]?.toString()?.trim() || undefined
          : undefined,
      paper:
        paperCol >= 0
          ? rowValues[paperCol]?.toString()?.trim() || undefined
          : undefined,
      chapter:
        chapterCol >= 0
          ? rowValues[chapterCol]?.toString()?.trim() || undefined
          : undefined,
      highlight:
        highlightCol >= 0
          ? rowValues[highlightCol]?.toString()?.trim() || undefined
          : undefined,
      type:
        typeCol >= 0 ? parseInt(rowValues[typeCol]?.toString() || "0") || 0 : 0,
      section:
        sectionCol >= 0
          ? rowValues[sectionCol]?.toString()?.trim() || undefined
          : undefined,
    });
  }

  // Check for 0-indexed answers and convert if needed
  if (detectZeroIndexedAnswers(questions)) {
    convertAnswersFromZeroToOne(questions);
  }

  return questions;
}

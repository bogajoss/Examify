import { supabase } from "@/lib/supabase";
import { Question } from "./types";

export interface RawQuestion extends Partial<Question> {
  uid?: string;
  correct?: string;
  [key: string]: unknown;
}

export async function fetchQuestions(
  fileId?: string | number,
  exam_id?: string,
  limit?: number,
  offset?: number,
  search?: string,
  ids?: string[],
): Promise<RawQuestion[]> {
  // Safety guard: if we have no filters at all, don't fetch anything to avoid returning the whole database
  if (!fileId && !exam_id && !search && (!ids || ids.length === 0)) {
    console.warn(
      "fetchQuestions called without any filters, aborting fetch to prevent full database return.",
    );
    return [];
  }

  try {
    let query = supabase.from("questions").select("*");

    // Filter by IDs if provided
    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }
    // Filter by exam_id if provided (through exam_questions junction table)
    else if (exam_id) {
      // Use the inner join syntax to filter questions by exam_id via exam_questions table
      // Note: This assumes foreign key relationship is set up correctly in Supabase
      query = supabase
        .from("questions")
        .select("*, exam_questions!inner(exam_id, order_index)")
        .eq("exam_questions.exam_id", exam_id);
    }
    // Filter by file_id if provided
    else if (fileId) {
      query = query.eq("file_id", fileId);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(
        `question_text.ilike.%${search}%,explanation.ilike.%${search}%`,
      );
    }

    // Add pagination
    if (limit) {
      const from = offset || 0;
      query = query.range(from, from + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching questions from Supabase:", error);
      throw new Error(error.message);
    }

    if (!data) return [];

    const processedData = data as (Record<string, unknown> & {
      exam_questions?: { order_index: number }[];
    })[];

    // Sort by order_index if fetched via exam_id
    if (
      exam_id &&
      processedData.length > 0 &&
      processedData[0].exam_questions
    ) {
      processedData.sort((a, b) => {
        const orderA = a.exam_questions?.[0]?.order_index ?? 0;
        const orderB = b.exam_questions?.[0]?.order_index ?? 0;
        return orderA - orderB;
      });
    }

    // Transform the data
    const transformed: RawQuestion[] = processedData.map((q) =>
      normalizeQuestion(q as RawQuestion),
    );

    return transformed;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

export function normalizeQuestion(q: RawQuestion): RawQuestion {
  // Normalize answer index to 0-based integer
  let answerIndex: number | string = -1;
  const answerString = (q.answer || q.correct || "").toString().trim();

  if (/^\d+$/.test(answerString)) {
    const num = parseInt(answerString, 10);
    // Standardizing: 1-based (1,2,3,4) to 0-based (0,1,2,3)
    // If it's 0, we assume it's already 0-based A.
    if (num > 0) {
      answerIndex = num - 1;
    } else {
      answerIndex = 0; // "0" is A
    }
  } else if (answerString.length === 1 && /[a-zA-Z]/.test(answerString)) {
    // A -> 0, B -> 1, etc.
    answerIndex = answerString.toUpperCase().charCodeAt(0) - 65;
  } else {
    // Fallback to original if we can't parse it
    answerIndex = q.answer || q.correct || "";
  }

  // Normalize options - ensure we have an array
  const options = (
    Array.isArray(q.options) && q.options.length > 0
      ? q.options
      : [q.option1, q.option2, q.option3, q.option4, q.option5]
  ).filter((o): o is string => typeof o === "string" && o.trim() !== "");

  return {
    ...q,
    id: q.id ? String(q.id) : Math.random().toString(36).substring(2, 11),
    question: q.question_text || q.question || "",
    question_text: q.question_text || q.question || "",
    options: options,
    correct: String(q.answer || q.correct || ""),
    answer: answerIndex,
    explanation: q.explanation || "",
  };
}

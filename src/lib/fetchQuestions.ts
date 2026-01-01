import { apiRequest } from "@/lib/api";
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
    const params: Record<string, string> = {};
    if (fileId) {
      params.file_id = String(fileId);
    }
    if (exam_id) {
      params.exam_id = exam_id;
    }
    if (ids && ids.length > 0) {
      params.ids = ids.join(",");
    }
    if (limit !== undefined) {
      params.limit = String(limit);
    }
    if (offset !== undefined) {
      params.offset = String(offset);
    }
    if (search) {
      params.search = search;
    }

    const result = await apiRequest<RawQuestion[]>(
      "questions",
      "GET",
      null,
      params,
    );

    if (!result) {
      throw new Error("No response from API");
    }

    let rawData: RawQuestion[] = [];

    if (result.success && Array.isArray(result.data)) {
      rawData = result.data;
    } else if (Array.isArray(result)) {
      // Fallback for direct array response
      rawData = result as unknown as RawQuestion[];
    } else {
      if (result.success === false) {
        throw new Error(result.message || "Failed to fetch questions");
      }
      console.warn("Unexpected API response format in fetchQuestions", result);
      rawData = [];
    }

    // Transform the data
    const transformed: RawQuestion[] = rawData.map(normalizeQuestion);

    // Client-side filtering as a safety net because backend might be returning too much
    // Only filter by fileId if we are NOT fetching by exam_id.
    // If we fetched by exam_id, we trust the backend to return the exam's questions.
    if (fileId && !exam_id) {
      return transformed.filter((q) => String(q.file_id) === String(fileId));
    }

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

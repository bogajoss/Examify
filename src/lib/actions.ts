"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "./supabase";
import { parseCSV } from "@/lib/csv-parser";
import type { Exam, Question, SubjectConfig } from "./types";

const randomUUID = () => globalThis.crypto.randomUUID();

// Helper function to verify password internally
async function verifyPasswordInternal() {
  // Bypassing password verification as per user request
  return true;
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const roll = formData.get("roll") as string;
  const batch_id = formData.get("batch_id") as string | null;
  const passwordMode = formData.get("passwordMode") as "auto" | "manual";
  const manualPassword = formData.get("pass") as string;

  // 1. Generate password based on mode
  let newPassword = manualPassword;
  if (passwordMode === "auto") {
    newPassword = Math.random().toString(36).slice(-8);
  }

  // 2. Insert the new user into Supabase
  const enrolled_batches = batch_id ? [batch_id] : [];

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      name,
      roll,
      pass: newPassword,
      enrolled_batches,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create user: " + error.message,
    };
  }

  revalidatePath("/admin/users");

  return {
    success: true,
    message: "User created successfully",
    data: { ...data, pass: newPassword },
  };
}

export async function updateUser(formData: FormData) {
  const uid = formData.get("uid") as string;
  const name = formData.get("name") as string;
  const roll = formData.get("roll") as string;
  const pass = formData.get("pass") as string;

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({
      name,
      roll,
      pass,
    })
    .eq("uid", uid)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update user: " + error.message,
    };
  }

  revalidatePath("/admin/users");

  return {
    success: true,
    data,
  };
}

export async function createBatch(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const icon_url = formData.get("icon_url") as string;
  const status = formData.get("status") as "live" | "end";
  const is_public = formData.get("is_public") === "true";

  const { data, error } = await supabaseAdmin
    .from("batches")
    .insert({
      name,
      description,
      icon_url,
      status,
      is_public,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create batch: " + error.message,
    };
  }

  revalidatePath("/admin/batches");

  return {
    success: true,
    message: "Batch created successfully",
    data,
  };
}

export async function updateBatch(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const is_public = formData.get("is_public_hidden") === "true";
  const icon_url = formData.get("icon_url") as string;

  const { data, error } = await supabaseAdmin
    .from("batches")
    .update({
      name,
      description,
      is_public,
      icon_url,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update batch: " + error.message,
    };
  }

  revalidatePath("/admin/batches");
  revalidatePath(`/admin/batches/${id}`);

  return {
    success: true,
    message: "Batch updated successfully",
    data,
  };
}

export async function deleteBatch(formData: FormData) {
  const id = formData.get("id") as string;

  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Invalid password or unauthorized" };
  }

  const { error } = await supabaseAdmin.from("batches").delete().eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to delete batch: " + error.message,
    };
  }

  revalidatePath("/admin/batches");

  return {
    success: true,
    message: "Batch deleted successfully",
  };
}

export async function createExam(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const course_name = formData.get("course_name") as string;
  const batch_id_raw = formData.get("batch_id") as string | null;
  const batch_id = batch_id_raw === "public" ? null : batch_id_raw;
  const durationRaw = formData.get("duration_minutes") as string;
  const duration_minutes = durationRaw ? parseInt(durationRaw, 10) : 120; // Default to 120 if not provided
  const marks_per_question_raw = formData.get("marks_per_question") as string;
  const marks_per_question = marks_per_question_raw
    ? parseFloat(marks_per_question_raw)
    : 1; // Default to 1 if not provided
  const negative_marks_per_wrong_raw = formData.get(
    "negative_marks_per_wrong",
  ) as string;
  const negative_marks_per_wrong = negative_marks_per_wrong_raw
    ? parseFloat(negative_marks_per_wrong_raw)
    : 0.25; // Default to 0.25 if not provided
  const file_id = formData.get("file_id") as string;
  const is_practice = formData.get("is_practice") === "true";
  const shuffle_questions = formData.get("shuffle_questions") === "true";
  const number_of_attempts =
    (formData.get("number_of_attempts") as string) || "one_time";
  let start_at = formData.get("start_at") as string | null;
  let end_at = formData.get("end_at") as string | null;

  if (is_practice) {
    start_at = null;
    end_at = null;
  }

  const total_subjects_raw = formData.get("total_subjects") as string;
  const total_subjects = total_subjects_raw
    ? parseInt(total_subjects_raw)
    : null;

  let mandatory_subjects = [];
  try {
    const raw = formData.get("mandatory_subjects") as string;
    mandatory_subjects = raw ? JSON.parse(raw) : [];
  } catch {
    mandatory_subjects = [];
  }

  let optional_subjects = [];
  try {
    const raw = formData.get("optional_subjects") as string;
    optional_subjects = raw ? JSON.parse(raw) : [];
  } catch {
    optional_subjects = [];
  }

  let question_ids: string[] = [];
  try {
    const raw = formData.get("question_ids") as string;
    question_ids = raw ? JSON.parse(raw) : [];
  } catch {
    question_ids = [];
  }

  // Set default status to 'live' for new exams
  const status = "live";

  const { data, error } = await supabaseAdmin
    .from("exams")
    .insert({
      name,
      description,
      course_name,
      batch_id,
      duration_minutes: isNaN(duration_minutes) ? 120 : duration_minutes,
      marks_per_question: isNaN(marks_per_question) ? 1 : marks_per_question,
      negative_marks_per_wrong: isNaN(negative_marks_per_wrong)
        ? 0.25
        : negative_marks_per_wrong,
      file_id: file_id || null,
      is_practice,
      shuffle_questions,
      start_at,
      end_at,
      total_subjects,
      mandatory_subjects,
      optional_subjects,
      number_of_attempts,
      status, // Explicitly set status to 'live'
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create exam: " + error.message,
    };
  }

  // Insert exam questions if question_ids provided
  if (question_ids.length > 0 && data?.id) {
    const exam_questions_data = question_ids.map((question_id, index) => ({
      exam_id: data.id,
      question_id,
      order_index: index,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("exam_questions")
      .insert(exam_questions_data);

    if (questionsError) {
      console.error("Failed to insert exam questions:", questionsError);
      // Don't fail the whole operation, but log the error
    }
  }

  if (batch_id) {
    revalidatePath(`/admin/batches/${batch_id}`);
  } else {
    revalidatePath("/admin/exams");
  }

  return {
    success: true,
    message: "Exam created successfully",
    data,
  };
}

export async function deleteExam(formData: FormData) {
  const id = formData.get("id") as string;
  const batch_id = formData.get("batch_id") as string | null;

  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Invalid password or unauthorized" };
  }

  const { error } = await supabaseAdmin.from("exams").delete().eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to delete exam: " + error.message,
    };
  }

  if (batch_id) {
    revalidatePath(`/admin/batches/${batch_id}`);
  } else {
    revalidatePath("/admin/exams");
  }

  return {
    success: true,
    message: "Exam deleted successfully",
  };
}

export async function updateExam(formData: FormData) {
  const id = formData.get("id") as string;
  const batch_id = formData.get("batch_id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const course_name = formData.get("course_name") as string;

  const durationRaw = formData.get("duration_minutes") as string;
  const duration_minutes = parseInt(durationRaw, 10);
  const marks_per_question_raw = formData.get("marks_per_question") as string;
  const marks_per_question = marks_per_question_raw
    ? parseFloat(marks_per_question_raw)
    : null;
  const negative_marks_per_wrong = parseFloat(
    formData.get("negative_marks_per_wrong") as string,
  );
  const file_id = formData.get("file_id") as string;
  const is_practice = formData.get("is_practice") === "true";
  const shuffle_questions = formData.get("shuffle_questions") === "true";

  // Map legacy is_enabled toggle to status
  // If is_enabled is "1" (true) -> status = "live"
  // If is_enabled is "0" (false) -> status = "draft"
  const is_enabled_input = formData.get("is_enabled");
  let status = undefined;
  if (is_enabled_input !== null) {
    status = is_enabled_input !== "0" ? "live" : "draft";
  }

  const number_of_attempts =
    (formData.get("number_of_attempts") as string) || "one_time";
  let start_at = formData.get("start_at") as string | null;
  let end_at = formData.get("end_at") as string | null;

  if (is_practice) {
    start_at = null;
    end_at = null;
  }

  const total_subjects_raw = formData.get("total_subjects") as string;
  const total_subjects = total_subjects_raw
    ? parseInt(total_subjects_raw, 10)
    : null;

  let mandatory_subjects = [];
  try {
    const raw = formData.get("mandatory_subjects") as string;
    mandatory_subjects = raw ? JSON.parse(raw) : [];
  } catch {
    mandatory_subjects = [];
  }

  let optional_subjects = [];
  try {
    const raw = formData.get("optional_subjects") as string;
    optional_subjects = raw ? JSON.parse(raw) : [];
  } catch {
    optional_subjects = [];
  }

  let question_ids: string[] = [];
  try {
    const raw = formData.get("question_ids") as string;
    question_ids = raw ? JSON.parse(raw) : [];
  } catch {
    question_ids = [];
  }

  const updateData: Record<string, unknown> = {
    name,
    description,
    course_name,
    duration_minutes: isNaN(duration_minutes) ? null : duration_minutes,
    marks_per_question,
    negative_marks_per_wrong,
    file_id: file_id || null,
    is_practice: is_practice || false,
    shuffle_questions,
    start_at,
    end_at,
    total_subjects,
    mandatory_subjects,
    optional_subjects,
    number_of_attempts,
  };

  if (status) {
    updateData.status = status;
  }

  const { data, error } = await supabaseAdmin
    .from("exams")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update exam: " + error.message,
    };
  }

  // Update exam questions if question_ids provided
  if (question_ids.length > 0 && data?.id) {
    // First delete existing exam questions
    const { error: deleteError } = await supabaseAdmin
      .from("exam_questions")
      .delete()
      .eq("exam_id", data.id);

    if (deleteError) {
      console.error("Failed to delete existing exam questions:", deleteError);
    }

    // Then insert new exam questions
    const exam_questions_data = question_ids.map((question_id, index) => ({
      exam_id: data.id,
      question_id,
      order_index: index,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("exam_questions")
      .insert(exam_questions_data);

    if (questionsError) {
      console.error("Failed to insert exam questions:", questionsError);
      // Don't fail the whole operation, but log the error
    }
  }

  const revalidatePathString = `/admin/batches/${String(batch_id)}`;
  revalidatePath(revalidatePathString);
  revalidatePath("/admin/exams");

  return {
    success: true,
    data,
  };
}

export async function enrollStudent(formData: FormData) {
  const user_id = formData.get("user_id") as string;
  const batch_id = formData.get("batch_id") as string;

  // Fetch current enrolled batches
  const { data: userData, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("enrolled_batches")
    .eq("uid", user_id)
    .single();

  if (fetchError) {
    return { success: false, message: "User not found" };
  }

  const currentBatches = userData.enrolled_batches || [];
  if (!currentBatches.includes(batch_id)) {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ enrolled_batches: [...currentBatches, batch_id] })
      .eq("uid", user_id);

    if (updateError) {
      return {
        success: false,
        message: "Failed to enroll student: " + updateError.message,
      };
    }
  }

  revalidatePath(`/admin/batches/${batch_id}`);

  return {
    success: true,
  };
}

export async function removeStudentFromBatch(formData: FormData) {
  const user_id = formData.get("user_id") as string;
  const batch_id = formData.get("batch_id") as string;

  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Invalid password or unauthorized" };
  }

  // Fetch current enrolled batches
  const { data: userData, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("enrolled_batches")
    .eq("uid", user_id)
    .single();

  if (fetchError) {
    return { success: false, message: "User not found" };
  }

  const currentBatches = userData.enrolled_batches || [];
  const updatedBatches = currentBatches.filter((id: string) => id !== batch_id);

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ enrolled_batches: updatedBatches })
    .eq("uid", user_id);

  if (updateError) {
    return {
      success: false,
      message: "Failed to remove student from batch: " + updateError.message,
    };
  }

  revalidatePath(`/admin/batches/${batch_id}`);

  return {
    success: true,
  };
}

export async function deleteUser(formData: FormData) {
  const uid = formData.get("uid") as string;

  const { error } = await supabaseAdmin.from("users").delete().eq("uid", uid);

  if (error) {
    return {
      success: false,
      message: "Failed to delete user: " + error.message,
    };
  }

  revalidatePath("/admin/users");
  return { success: true, message: "User deleted successfully" };
}

export async function deleteStudentExamResult(formData: FormData) {
  const id = formData.get("id") as string;
  const exam_id = formData.get("exam_id") as string;

  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Invalid password or unauthorized" };
  }

  const { error } = await supabaseAdmin
    .from("student_exams")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to delete result: " + error.message,
    };
  }

  if (exam_id) {
    revalidatePath(`/admin/exams/${exam_id}/results`);
  }

  return { success: true, message: "Result deleted" };
}



export async function importUsersData(formData: FormData) {
  try {
    const jsonFile = formData.get("file") as File;

    if (!jsonFile) {
      return { success: false, message: "No file selected" };
    }

    if (!(await verifyPasswordInternal())) {
      return { success: false, message: "Invalid password or unauthorized" };
    }

    const fileContent = await jsonFile.text();
    const importedData = JSON.parse(fileContent);

    if (!importedData.users || !Array.isArray(importedData.users)) {
      return { success: false, message: "Invalid file format" };
    }

    const { error } = await supabaseAdmin.from("users").upsert(
      importedData.users.map(
        (u: {
          uid?: string;
          name: string;
          roll: string;
          pass?: string;
          enrolled_batches?: string[];
        }) => ({
          uid: u.uid || randomUUID(),
          name: u.name,
          roll: u.roll,
          pass: u.pass || "",
          enrolled_batches: u.enrolled_batches || [],
        }),
      ),
      { onConflict: "roll" },
    );

    if (error) {
      return { success: false, message: "Import failed: " + error.message };
    }

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `${importedData.users.length} users imported successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Import failed: " + (error as Error).message,
    };
  }
}

// Keeping Question-related API calls to Supabase if needed in future
export async function importBatchData(_formData: FormData) {
  // This function was originally intended to coordinate imports across multiple services.
  // With the full migration to Supabase, this logic needs to be rewritten to handle
  // batch and exam creation alongside question imports transactionally or sequentially.
  // For now, use the individual import/create actions.

  return {
    success: false,
    message: "Import Batch Data not yet implemented for Supabase",
  };
}

export async function updateStudentResultScore(formData: FormData) {
  const id = formData.get("id") as string;
  const score = parseFloat(formData.get("score") as string);
  const correct_answers =
    parseInt(formData.get("correct_answers") as string) || 0;
  const wrong_answers = parseInt(formData.get("wrong_answers") as string) || 0;
  const unattempted = parseInt(formData.get("unattempted") as string) || 0;
  const exam_id = formData.get("exam_id") as string;

  const { error } = await supabaseAdmin
    .from("student_exams")
    .update({
      score,
      correct_answers,
      wrong_answers,
      unattempted,
    })
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to update score: " + error.message,
    };
  }

  if (exam_id) {
    revalidatePath(`/admin/exams/${exam_id}/results`);
  }

  return { success: true, message: "Score updated successfully" };
}

export async function exportBatchData(_batchId: string) {
  // Export functionality removed
  return {
    success: false,
    message: "Export functionality has been removed",
  };
}

export async function bulkUpdateExamScores(_formData: FormData) {
  // Placeholder for bulk update
  return {
    success: false,
    message: "Bulk update not yet implemented for Supabase",
  };
}

export async function recalculateExamScores(formData: FormData) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  const examId = formData.get("exam_id") as string;
  if (!examId) {
    return { success: false, message: "Exam ID is required" };
  }

  try {
    // 1. Fetch Exam Details
    const { data: exam, error: examError } = await supabaseAdmin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      throw new Error("Exam not found");
    }

    // 2. Fetch All Questions for this Exam (linked via exam_questions or file_id logic)
    // We need the latest correct answer for each question.
    // Logic similar to fetchQuestions but server-side simplified.
    let examQuestions: Question[] = [];
    
    // a. Questions from file
    if (exam.file_id) {
      const { data: fq } = await supabaseAdmin
        .from("questions")
        .select("*")
        .eq("file_id", exam.file_id);
      if (fq) examQuestions = [...examQuestions, ...(fq as Question[])];
    }

    // b. Questions from explicit links (custom exams)
    const { data: linkedQ } = await supabaseAdmin
      .from("exam_questions")
      .select("question_id, questions(*)")
      .eq("exam_id", examId);
    
    if (linkedQ) {
      (linkedQ as unknown as { questions: Question }[]).forEach((lq) => {
        if (lq.questions && !examQuestions.some(q => q.id === lq.questions.id)) {
          examQuestions.push(lq.questions);
        }
      });
    }

    // Map questions by ID for fast lookup
    const questionMap = new Map<string, Question>();
    examQuestions.forEach(q => {
      if (q.id) questionMap.set(q.id, q);
    });

    // 3. Fetch All Student Results for this Exam
    const { data: studentExams, error: seError } = await supabaseAdmin
      .from("student_exams")
      .select("id, student_id")
      .eq("exam_id", examId);

    if (seError) throw seError;
    if (!studentExams || studentExams.length === 0) {
      return { success: true, message: "No student results to recalculate." };
    }

    // 4. Fetch All Responses for these exams
    const studentExamIds = studentExams.map(se => se.id);
    const { data: allResponses, error: respError } = await supabaseAdmin
      .from("student_responses")
      .select("*")
      .in("student_exam_id", studentExamIds);

    if (respError) throw respError;

    interface StudentResponse {
      id: string;
      student_exam_id: string;
      question_id: string;
      selected_option: string;
      is_correct: boolean;
      marks_obtained: number;
    }

    // Group responses by student_exam_id
    const responsesByExam = new Map<string, StudentResponse[]>();
    (allResponses as unknown as StudentResponse[])?.forEach(r => {
      const list = responsesByExam.get(r.student_exam_id) || [];
      list.push(r);
      responsesByExam.set(r.student_exam_id, list);
    });

    let updatedCount = 0;

    // 5. Iterate and Recalculate
    for (const se of studentExams) {
      const responses = responsesByExam.get(se.id) || [];
      
      // Determine Attempted Subjects to filter Valid Questions
      // (Using the logic: Mandatory + Optional subjects that have at least 1 response)
      const attemptedSubjects = new Set<string>();
      responses.forEach(r => {
        const q = questionMap.get(r.question_id);
        if (q && q.subject) attemptedSubjects.add(q.subject);
      });

      // Filter Relevant Questions for this student
      const relevantQuestions = examQuestions.filter(q => {
        // 1. Mandatory Check
        const isMandatory = (exam.mandatory_subjects as (string | SubjectConfig)[])?.some((s) => {
           const sId = typeof s === 'string' ? s : s.id;
           const sName = typeof s === 'object' ? s.name : undefined;
           return sId === q.subject || sName === q.subject;
        });
        if (isMandatory) return true;

        // 2. Optional Check (only if attempted)
        const isOptional = (exam.optional_subjects as (string | SubjectConfig)[])?.some((s) => {
           const sId = typeof s === 'string' ? s : s.id;
           const sName = typeof s === 'object' ? s.name : undefined;
           return sId === q.subject || sName === q.subject;
        });
        if (isOptional) {
          return q.subject && attemptedSubjects.has(q.subject);
        }

        // 3. Fallback (if no strict subject config, include all)
        if (!exam.mandatory_subjects && !exam.optional_subjects) return true;
        
        return false;
      });

      // Calculate Stats
      let correct = 0;
      let wrong = 0;
      let score = 0;
      
      const responseUpdates: { id: string; is_correct: boolean; marks_obtained: number }[] = [];

      relevantQuestions.forEach(q => {
        const response = responses.find(r => r.question_id === q.id);
        
        // Normalize Correct Answer from Question Bank
        let correctIndex = -1;
        // Logic from normalizeQuestion (simplified for server)
        if (typeof q.answer === 'number') {
           correctIndex = q.answer;
        } else {
           const ansStr = String(q.answer || "").trim();
           if (/^\d+$/.test(ansStr)) correctIndex = parseInt(ansStr) - 1;
           else if (ansStr.length === 1) correctIndex = ansStr.toUpperCase().charCodeAt(0) - 65;
        }

        const qMarks = q.question_marks ? parseFloat(String(q.question_marks)) : (exam.marks_per_question || 1);
        const qNeg = exam.negative_marks_per_wrong || 0;

        if (response) {
          // Student attempted this question
          const selectedIndex = parseInt(response.selected_option);
          let isCorrect = false;
          let marksObtained = 0;

          if (!isNaN(selectedIndex) && selectedIndex === correctIndex) {
            correct++;
            score += qMarks;
            marksObtained = qMarks;
            isCorrect = true;
          } else {
            wrong++;
            score -= qNeg;
            marksObtained = -qNeg;
            isCorrect = false;
          }

          // Queue update for response detail if it changed
          if (response.is_correct !== isCorrect || response.marks_obtained !== marksObtained) {
             responseUpdates.push({
               id: response.id,
               is_correct: isCorrect,
               marks_obtained: marksObtained
             });
          }
        }
      });

      const unattempted = relevantQuestions.length - (correct + wrong);

      // Update Student Exam Record
      const { error: updateError } = await supabaseAdmin
        .from("student_exams")
        .update({
          score: Number(score.toFixed(2)),
          correct_answers: correct,
          wrong_answers: wrong,
          unattempted: unattempted
        })
        .eq("id", se.id);

      if (!updateError) updatedCount++;

      // Batch Update Response Details (Optional optimization: do in chunks if massive)
      if (responseUpdates.length > 0) {
        for (const update of responseUpdates) {
           await supabaseAdmin.from("student_responses").update({
             is_correct: update.is_correct,
             marks_obtained: update.marks_obtained
           }).eq("id", update.id);
        }
      }
    }

    revalidatePath(`/admin/exams/${examId}/results`);
    return {
      success: true,
      message: `Successfully recalculated scores for ${updatedCount} students.`,
    };

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Recalculation error:", error);
    return { success: false, message: "Recalculation failed: " + error.message };
  }
}

export async function cleanupUnrolledStudents() {
  // Assuming "enrolled_batches" is an array. Users with empty array or null are unrolled.
  // Supabase delete with filters.

  // First, find them to count them (optional but good for feedback)
  const { count, error: countError } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .or("enrolled_batches.is.null,enrolled_batches.eq.{}");

  if (countError) {
    return {
      success: false,
      message: "Failed to count users: " + countError.message,
    };
  }

  if (count === 0) {
    return { success: true, message: "No unrolled students found.", count: 0 };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .or("enrolled_batches.is.null,enrolled_batches.eq.{}");

  if (error) {
    return {
      success: false,
      message: "Failed to delete users: " + error.message,
    };
  }

  return { success: true, message: `${count} users cleaned up.`, count };
}

export async function uploadCSVAction(formData: FormData) {
  const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB

  try {
    const csvFile = formData.get("csv_file") as File | null;
    const is_bank_raw = formData.get("is_bank");
    const is_bank = is_bank_raw ? parseInt(is_bank_raw as string) : 1;

    if (!csvFile) {
      return { success: false, message: "No CSV file provided" };
    }

    // Validate file type
    if (
      !csvFile.type.includes("text") &&
      csvFile.type !== "application/csv" &&
      !csvFile.name.endsWith(".csv")
    ) {
      return {
        success: false,
        message: "Invalid file type. Only CSV files are allowed.",
      };
    }

    // Validate file size
    if (csvFile.size > MAX_CSV_SIZE) {
      return {
        success: false,
        message: `File too large. Maximum size is ${MAX_CSV_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Parse CSV
    let questions;
    try {
      questions = await parseCSV(csvFile);
    } catch (parseError: unknown) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : "Unknown error";
      return { success: false, message: `CSV parsing error: ${errorMessage}` };
    }

    if (!questions || questions.length === 0) {
      return {
        success: false,
        message: "No valid questions found in CSV file",
      };
    }

    // Create a file record
    // Start transaction - insert file
    const { data: file, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        original_filename: csvFile.name,
        display_name: csvFile.name,
        total_questions: questions.length,
        is_bank: is_bank === 1,
      })
      .select()
      .single();

    if (fileError) {
      console.error("Error creating file record:", fileError);
      return { success: false, message: fileError.message };
    }

    // Insert all questions
    const questionRecords = questions.map((q, index) => ({
      file_id: file.id,
      question_text: q.question_text,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4 || null,
      option5: q.option5 || null,
      answer: q.answer,
      explanation: q.explanation || null,
      subject: q.subject || null,
      paper: q.paper || null,
      chapter: q.chapter || null,
      highlight: q.highlight || null,
      section: q.section || null,
      type: q.type,
      order_index: index,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("questions")
      .insert(questionRecords);

    if (questionsError) {
      console.error("Error inserting questions:", questionsError);
      // Try to rollback file creation
      await supabaseAdmin.from("files").delete().eq("id", file.id);
      return { success: false, message: questionsError.message };
    }

    revalidatePath("/admin/files");

    return {
      success: true,
      message: `${questions.length} questions imported successfully`,
      data: {
        file_id: file.id,
        total_questions: questions.length,
      },
    };
  } catch (error: unknown) {
    console.error("Error in uploadCSVAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return { success: false, message: errorMessage };
  }
}

export async function deleteFileAction(fileId: string) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  const { error } = await supabaseAdmin.from("files").delete().eq("id", fileId);

  if (error) {
    return {
      success: false,
      message: "Failed to delete file: " + error.message,
    };
  }

  revalidatePath("/admin/questions");
  return { success: true, message: "File deleted successfully" };
}

export async function renameFileAction(fileId: string, newName: string) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  const { error } = await supabaseAdmin
    .from("files")
    .update({ display_name: newName })
    .eq("id", fileId);

  if (error) {
    return {
      success: false,
      message: "Failed to rename file: " + error.message,
    };
  }

  revalidatePath("/admin/questions");
  return { success: true, message: "File renamed successfully" };
}

export async function deleteQuestionAction(questionId: string) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  // Get file_id first for revalidation (optional but good)
  const { data: q } = await supabaseAdmin
    .from("questions")
    .select("file_id")
    .eq("id", questionId)
    .single();

  const { error } = await supabaseAdmin
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return {
      success: false,
      message: "Failed to delete question: " + error.message,
    };
  }

  // Update file total count
  if (q?.file_id) {
    const { count } = await supabaseAdmin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("file_id", q.file_id);

    await supabaseAdmin
      .from("files")
      .update({ total_questions: count || 0 })
      .eq("id", q.file_id);

    revalidatePath(`/admin/questions/edit/${q.file_id}`);
  }

  return { success: true, message: "Question deleted successfully" };
}

export async function updateQuestionAction(
  questionId: string,
  data: Record<string, unknown>,
) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  // Valid columns in questions table
  const validColumns = [
    "question_text",
    "option1",
    "option2",
    "option3",
    "option4",
    "option5",
    "answer",
    "explanation",
    "subject",
    "paper",
    "chapter",
    "highlight",
    "type",
    "section",
    "question_image",
    "explanation_image",
  ];

  // Filter to only valid columns
  const filteredData: Record<string, unknown> = {};
  validColumns.forEach((col) => {
    if (col in data) {
      filteredData[col] = data[col];
    }
  });

  const { data: updatedQ, error } = await supabaseAdmin
    .from("questions")
    .update(filteredData)
    .eq("id", questionId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update question: " + error.message,
    };
  }

  return {
    success: true,
    message: "Question updated successfully",
    data: updatedQ,
  };
}

export async function createQuestionAction(data: Record<string, unknown>) {
  if (!(await verifyPasswordInternal())) {
    return { success: false, message: "Unauthorized" };
  }

  // Valid columns in questions table
  const validColumns = [
    "file_id",
    "question_text",
    "option1",
    "option2",
    "option3",
    "option4",
    "option5",
    "answer",
    "explanation",
    "subject",
    "paper",
    "chapter",
    "highlight",
    "type",
    "section",
    "question_image",
    "explanation_image",
    "order_index",
  ];

  // Filter to only valid columns
  const filteredData: Record<string, unknown> = {};
  validColumns.forEach((col) => {
    if (col in data) {
      filteredData[col] = data[col];
    }
  });

  const { data: newQ, error } = await supabaseAdmin
    .from("questions")
    .insert(filteredData)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create question: " + error.message,
    };
  }

  // Update file total count
  if (newQ?.file_id) {
    const { count } = await supabaseAdmin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("file_id", newQ.file_id);

    await supabaseAdmin
      .from("files")
      .update({ total_questions: count || 0 })
      .eq("id", newQ.file_id);

    revalidatePath(`/admin/questions/edit/${newQ.file_id}`);
  }

  return {
    success: true,
    message: "Question created successfully",
    data: newQ,
  };
}

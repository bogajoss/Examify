export interface User {
  uid: string;
  name: string;
  roll: string;
  pass?: string;
  enrolled_batches?: string[];
  created_at: string;
}

export interface UserFormResult extends User {
  pass?: string;
}

export type Admin = {
  uid: string;
  username: string;
  role: "admin" | "moderator";
  created_at: string;
};

export type Batch = {
  id: string;
  name: string;
  section?: string;
  description?: string;
  icon_url?: string;
  status: "live" | "end";
  is_public: boolean;
  created_at: string;
};

export type Exam = {
  id: string;
  name: string;
  title?: string;
  description?: string | null;
  course_name?: string | null;
  batch_id?: string | null;
  duration_minutes?: number;
  marks_per_question?: number;
  negative_marks_per_wrong?: number;
  file_id?: string;
  is_practice?: boolean;
  type?: "live" | "practice";
  category?: string;
  shuffle_questions?: boolean;
  number_of_attempts?: "one_time" | "multiple";
  start_at?: string | null;
  end_at?: string | null;
  total_subjects?: number | null;
  mandatory_subjects?: SubjectConfig[] | string[] | null; // JSONB array in DB
  optional_subjects?: SubjectConfig[] | string[] | null; // JSONB array in DB
  question_ids?: string[];
  status?: "draft" | "live" | "end";
  created_at: string;
  questions?: Question[];
};

export type SubjectConfig = {
  id: string;
  name?: string;
  count?: number;
  question_ids?: string[];
  type?: "mandatory" | "optional";
};

export type Question = {
  id?: string;
  exam_id?: string;
  file_id?: string;
  question: string;
  question_text?: string;
  options: string[] | Record<string, string>;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  option5?: string;
  answer: number | string;
  correct?: string;
  explanation?: string | null;
  subject?: string | null;
  paper?: string | null;
  chapter?: string | null;
  highlight?: string | null;
  type?: string | null;
  order_index?: number;
  question_image?: string;
  explanation_image?: string;
  question_image_url?: string;
  explanation_image_url?: string;
  question_marks?: number | string;
  created_at?: string;
};

export type StudentExam = {
  id?: string;
  exam_id: string;
  student_id: string;
  score?: number | null; // nullable in DB
  correct_answers?: number;
  wrong_answers?: number;
  unattempted?: number;
  started_at?: string;
  submitted_at?: string;
  marks_per_question?: number;
};

export type ServerActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T | T[] | null;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
};

export type ReportDay = {
  date: string;
  attendance: "Yes" | "No" | "-";
  task_1: string | null;
  task_2: string | null;
  exams: string[];
  marks: string[];
  progress: number;
};

export type StudentReport = {
  uid: string;
  name: string;
  roll: string;
  days: Record<string, ReportDay>;
};

export type DeletedItem = {
  id: string;
  item_type: "batch" | "user" | string;
  item_id: string;
  display_name: string;
  data: string; // JSON string
  deleted_by?: string;
  deleted_at: string;
  expires_at: string;
};

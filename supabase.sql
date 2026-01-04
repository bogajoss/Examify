-- Enable only necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- CREATE ENUM TYPE FIRST (with safe creation)
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('admin', 'moderator');
    END IF;
END$$;

-- ============================================================
-- API TOKENS TABLE (For backend authentication)
-- ============================================================
create table if not exists api_tokens (
  id uuid default uuid_generate_v4() not null primary key,
  user_id uuid not null,
  token varchar(255) not null unique,
  name varchar(255),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true,
  is_admin boolean default false
);

create index if not exists idx_api_tokens_token on api_tokens(token);
create index if not exists idx_api_tokens_active on api_tokens(is_active);

-- ============================================================
-- CATEGORIES TABLE (For organizing question files)
-- ============================================================
create table if not exists categories (
  id uuid default uuid_generate_v4() not null primary key,
  name varchar(255) not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- FILES TABLE (Question banks/files)
-- ============================================================
create table if not exists files (
  id uuid default uuid_generate_v4() not null primary key,
  original_filename varchar(255) not null,
  display_name varchar(255),
  category_id uuid references categories(id) on delete set null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_questions integer default 0,
  external_id varchar(50),
  batch_id varchar(50),
  set_id varchar(50),
  is_bank boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_files_bank on files(is_bank);
create index if not exists idx_files_uploaded on files(uploaded_at);
create index if not exists idx_files_batch on files(batch_id);
create index if not exists idx_files_category on files(category_id);

-- ============================================================
-- QUESTIONS TABLE (Individual questions)
-- ============================================================
create table if not exists questions (
  id uuid default uuid_generate_v4() not null primary key,
  file_id uuid not null references files(id) on delete cascade,
  question_text text,
  option1 text,
  option2 text,
  option3 text,
  option4 text,
  option5 text,
  answer varchar(10),
  explanation text,
  question_image text,
  explanation_image text,
  subject varchar(100),
  paper varchar(100),
  chapter varchar(255),
  highlight varchar(255),
  section varchar(255),
  type integer default 0,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_questions_file on questions(file_id);
create index if not exists idx_questions_order on questions(order_index);
create index if not exists idx_questions_subject on questions(subject);
create index if not exists idx_questions_section on questions(section);
create index if not exists idx_file_question on questions(file_id, id);

-- ============================================================
-- ADMINS
-- ============================================================
create table if not exists admins (
  uid uuid default uuid_generate_v4() not null primary key,
  username text unique not null,
  password text not null,
  name text,
  role admin_role default 'admin',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_admins_username on admins(username);

-- ============================================================
-- BATCHES
-- ============================================================
create table if not exists batches (
  id uuid default uuid_generate_v4() not null primary key,
  name text not null,
  description text,
  icon_url text,
  is_public boolean default false,
  status text default 'live' check (status in ('live', 'ended')),
  created_by uuid references admins(uid) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_batches_status on batches(status);
create index if not exists idx_batches_public on batches(is_public);
create index if not exists idx_batches_created_by on batches(created_by);

-- ============================================================
-- USERS (Students)
-- ============================================================
create table if not exists users (
  uid uuid default uuid_generate_v4() not null primary key,
  name text,
  roll text unique not null,
  pass text not null,
  enrolled_batches uuid[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_users_enrolled_batches on users using gin(enrolled_batches);
create index if not exists idx_users_roll on users(roll);

-- ============================================================
-- EXAMS
-- ============================================================
create table if not exists exams (
  id uuid default uuid_generate_v4() not null primary key,
  name text not null,
  description text,
  course_name text,
  batch_id uuid references batches(id) on delete cascade,
  duration_minutes integer default 120,
  negative_marks_per_wrong numeric(4,2) default 0.25,
  file_id uuid references files(id) on delete set null,
  is_practice boolean default false,
  number_of_attempts text default 'one_time' check (number_of_attempts in ('one_time', 'multiple')),
  status text default 'draft' check (status in ('draft', 'live', 'ended')),
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  shuffle_sections_only boolean default false,
  shuffle_questions boolean default false,
  marks_per_question numeric default 1,
  total_subjects integer,
  mandatory_subjects jsonb,
  optional_subjects jsonb,
  created_by uuid references admins(uid) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_exams_batch_id on exams(batch_id);
create index if not exists idx_exams_status on exams(status);
create index if not exists idx_exams_file_id on exams(file_id);
create index if not exists idx_exams_created_by on exams(created_by);
create index if not exists idx_exams_start_end on exams(start_at, end_at);

-- ============================================================
-- EXAM QUESTIONS (Linking table)
-- ============================================================
create table if not exists exam_questions (
  id uuid default uuid_generate_v4() not null primary key,
  exam_id uuid not null references exams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(exam_id, question_id)
);

create index if not exists idx_exam_questions_exam on exam_questions(exam_id);
create index if not exists idx_exam_questions_question on exam_questions(question_id);
create index if not exists idx_exam_questions_order on exam_questions(exam_id, order_index);

-- ============================================================
-- STUDENT EXAMS (Results Header)
-- ============================================================
create table if not exists student_exams (
  id uuid default uuid_generate_v4() not null primary key,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references users(uid) on delete cascade,
  score numeric(5,2) default 0,
  correct_answers integer default 0,
  wrong_answers integer default 0,
  unattempted integer default 0,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, exam_id)
);

create index if not exists idx_student_exams_student_id on student_exams(student_id);
create index if not exists idx_student_exams_exam_id on student_exams(exam_id);
create index if not exists idx_student_exams_submitted on student_exams(submitted_at);

-- ============================================================
-- STUDENT RESPONSES (Detailed Answers)
-- ============================================================
create table if not exists student_responses (
  id uuid default uuid_generate_v4() not null primary key,
  student_exam_id uuid not null references student_exams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option text,
  is_correct boolean default false,
  marks_obtained numeric(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_exam_id, question_id)
);

create index if not exists idx_student_responses_exam on student_responses(student_exam_id);
create index if not exists idx_student_responses_question on student_responses(question_id);
create index if not exists idx_student_responses_correct on student_responses(is_correct);

-- ============================================================
-- DAILY RECORDS (Stats)
-- ============================================================
create table if not exists daily_records (
  id uuid default uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  exams_attempted integer default 0,
  questions_solved integer default 0,
  record_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, record_date)
);

create index if not exists idx_daily_records_student on daily_records(student_id);
create index if not exists idx_daily_records_date on daily_records(record_date);
create index if not exists idx_daily_records_student_date on daily_records(student_id, record_date);

-- ============================================================
-- STUDENT ATTENDANCE
-- ============================================================
create table if not exists student_attendance (
  id uuid default uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  attendance_date date default current_date,
  present boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, batch_id, attendance_date)
);

create index if not exists idx_attendance_student on student_attendance(student_id);
create index if not exists idx_attendance_batch on student_attendance(batch_id);
create index if not exists idx_attendance_date on student_attendance(attendance_date);
create index if not exists idx_attendance_present on student_attendance(present);

-- ============================================================
-- STUDENT TASKS
-- ============================================================
create table if not exists student_tasks (
  id uuid default uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  task_date date default current_date,
  mandatory_done boolean default false,
  optional_done boolean default false,
  todo_done boolean default false,
  mandatory_url text,
  optional_url text,
  todo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, batch_id, task_date)
);

create index if not exists idx_student_tasks_student on student_tasks(student_id);
create index if not exists idx_student_tasks_batch on student_tasks(batch_id);
create index if not exists idx_student_tasks_date on student_tasks(task_date);
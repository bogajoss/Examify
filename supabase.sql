-- Enable UUID extension
create extension if not exists "uuid-ossp" with schema extensions;

-- USERS (Students)
create table if not exists users (
  uid uuid default extensions.uuid_generate_v4() not null primary key,
  name text,
  roll text unique,
  pass text,
  enrolled_batches uuid[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX if not exists idx_users_enrolled_batches ON users USING GIN (enrolled_batches);

-- ADMINS
create type admin_role as enum ('admin', 'moderator');

create table if not exists admins (
  uid uuid default extensions.uuid_generate_v4() not null primary key,
  username text unique,
  password text,
  name text,
  role admin_role default 'admin',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BATCHES
create table if not exists batches (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  name text not null,
  description text,
  icon_url text,
  is_public boolean default false,
  status text default 'live' check (status in ('live', 'end')),
  created_by uuid references admins(uid) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EXAMS
create table if not exists exams (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  name text not null,
  description text,
  batch_id uuid references batches(id) on delete cascade,
  duration_minutes integer default 120,
  negative_marks_per_wrong numeric(4,2) default 0.25,
  file_id uuid, -- Reference to MySQL file_id
  is_practice boolean default false,
  status text default 'draft', -- draft, live, ended
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  shuffle_sections_only boolean default false,
  shuffle_questions boolean default false,
  marks_per_question numeric default 1,
  total_subjects integer,
  mandatory_subjects jsonb,
  optional_subjects jsonb,
  created_by uuid references admins(uid) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX if not exists idx_exams_batch_id ON exams(batch_id);

-- STUDENT EXAMS (Results Header)
create table if not exists student_exams (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references users(uid) on delete cascade,
  score numeric(5,2) default 0,
  correct_answers integer default 0,
  wrong_answers integer default 0,
  unattempted integer default 0,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, exam_id)
);

CREATE INDEX if not exists idx_student_exams_student_id ON student_exams(student_id);
CREATE INDEX if not exists idx_student_exams_exam_id ON student_exams(exam_id);

-- STUDENT RESPONSES (Detailed Answers)
create table if not exists student_responses (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  student_exam_id uuid not null references student_exams(id) on delete cascade,
  question_id uuid not null, -- Reference to MySQL question_id
  selected_option text,
  is_correct boolean default false,
  marks_obtained numeric(5,2) default 0,
  unique(student_exam_id, question_id)
);

CREATE INDEX if not exists idx_student_responses_exam ON student_responses(student_exam_id);

-- DAILY RECORDS (Stats)
create table if not exists daily_records (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  exams_attempted integer default 0,
  questions_solved integer default 0,
  record_date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, record_date)
);

-- STUDENT ATTENDANCE
create table if not exists student_attendance (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  attendance_date date default CURRENT_DATE,
  present boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, batch_id, attendance_date)
);

-- STUDENT TASKS
create table if not exists student_tasks (
  id uuid default extensions.uuid_generate_v4() not null primary key,
  student_id uuid not null references users(uid) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  task_date date default CURRENT_DATE,
  mandatory_done boolean default false,
  optional_done boolean default false,
  todo_done boolean default false,
  mandatory_url text,
  optional_url text,
  todo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, batch_id, task_date)
);
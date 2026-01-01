SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Retaining files, questions, exam_questions (for linking), and api_tokens

CREATE TABLE IF NOT EXISTS `files` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_questions` int(11) DEFAULT '0',
  `external_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batch_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `set_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_bank` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_files_bank` (`is_bank`),
  KEY `idx_files_uploaded` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `questions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_text` longtext COLLATE utf8mb4_unicode_ci,
  `option1` longtext COLLATE utf8mb4_unicode_ci,
  `option2` longtext COLLATE utf8mb4_unicode_ci,
  `option3` longtext COLLATE utf8mb4_unicode_ci,
  `option4KV` longtext COLLATE utf8mb4_unicode_ci,
  `option4` longtext COLLATE utf8mb4_unicode_ci,
  `option5` longtext COLLATE utf8mb4_unicode_ci,
  `answer` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `explanation` longtext COLLATE utf8mb4_unicode_ci,
  `question_image` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `explanation_image` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paper` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chapter` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `highlight` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` int(11) DEFAULT '0',
  `order_index` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `file_id` (`file_id`),
  KEY `idx_questions_order` (`order_index`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Linking table for questions in a specific exam (Exam ID from Supabase)
CREATE TABLE IF NOT EXISTS `exam_questions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exam_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL, -- UUID from Supabase
  `question_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `exam_id` (`exam_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `exam_questions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `is_admin` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_tokens_token` (`token`),
  KEY `idx_tokens_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE questions ADD INDEX idx_file_question (file_id, id);
ALTER TABLE files ADD INDEX idx_file_bank_alt (is_bank);
ALTER TABLE exam_questions ADD INDEX idx_exam_questions (exam_id, question_id);

ANALYZE TABLE questions;
ANALYZE TABLE files;
ANALYZE TABLE exam_questions;

-- SEED DATA

-- Insert token for default access (user_id is arbitrary since users table is gone)
INSERT INTO `api_tokens` (`id`, `user_id`, `token`, `name`, `is_active`, `is_admin`)
VALUES (UUID(), UUID(), 'ff1337', 'Default Token', 1, 1);

COMMIT;
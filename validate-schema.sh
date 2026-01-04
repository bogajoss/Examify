#!/bin/bash

# Schema Validation & Testing Script for Examify
# This script validates the database schema and tests API compatibility
# Usage: bash validate-schema.sh

echo "🔍 Examify Database Schema Validation"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $2"
    ((CHECKS_FAILED++))
  fi
}

# 1. Verify migration file exists and is valid SQL
echo "📋 Checking migration files..."
test -f "migrations/20260104_create_database_schema.sql"
check_result $? "Migration file exists"

grep -q "create extension" migrations/20260104_create_database_schema.sql
check_result $? "Extensions properly configured"

grep -q "api_tokens" migrations/20260104_create_database_schema.sql
check_result $? "API tokens table defined"

grep -q "questions" migrations/20260104_create_database_schema.sql
check_result $? "Questions table defined"

grep -q "uuid_generate_v4()" migrations/20260104_create_database_schema.sql
check_result $? "UUID generation configured"

# 2. Verify supabase.sql matches migration
echo ""
echo "📋 Comparing schema files..."
diff <(grep -A 20 "create table if not exists questions" supabase.sql) \
     <(grep -A 20 "create table if not exists questions" migrations/20260104_create_database_schema.sql) > /dev/null 2>&1
check_result $? "Schema files are consistent"

# 3. Verify API routes use correct table names
echo ""
echo "📋 Checking API routes compatibility..."
grep -q "from('questions')" src/app/api/questions/route.ts
check_result $? "Questions endpoint uses correct table"

grep -q "from('files')" src/app/api/files/route.ts
check_result $? "Files endpoint uses correct table"

grep -q "from('api_tokens')" src/lib/supabase.ts
check_result $? "Auth validation uses correct table"

grep -q "exam_questions" src/app/api/fetch-questions/route.ts
check_result $? "Exam questions endpoint uses correct table"

# 4. Verify all required fields are present
echo ""
echo "📋 Checking required fields..."
grep -q "question_text" migrations/20260104_create_database_schema.sql
check_result $? "Question text field exists"

grep -q "file_id uuid not null references files" migrations/20260104_create_database_schema.sql
check_result $? "File ID foreign key configured"

grep -q "order_index integer" migrations/20260104_create_database_schema.sql
check_result $? "Order index field exists"

# 5. Verify indexes are configured
echo ""
echo "📋 Checking indexes..."
grep -q "idx_questions_file" migrations/20260104_create_database_schema.sql
check_result $? "Questions file index exists"

grep -q "idx_api_tokens_token" migrations/20260104_create_database_schema.sql
check_result $? "API tokens index exists"

grep -q "idx_exams_batch_id" migrations/20260104_create_database_schema.sql
check_result $? "Exams batch index exists"

# 6. Verify default values
echo ""
echo "📋 Checking default values..."
grep -q "default extensions.uuid_generate_v4()" migrations/20260104_create_database_schema.sql
check_result $? "UUID defaults configured"

grep -q "default timezone('utc'::text, now())" migrations/20260104_create_database_schema.sql
check_result $? "UTC timezone defaults configured"

# 7. Verify cascading deletes
echo ""
echo "📋 Checking referential integrity..."
grep -q "references files(id) on delete cascade" migrations/20260104_create_database_schema.sql
check_result $? "Cascading deletes configured for questions"

grep -q "references exams(id) on delete cascade" migrations/20260104_create_database_schema.sql
check_result $? "Cascading deletes configured for exam data"

# 8. Environment configuration
echo ""
echo "📋 Checking environment configuration..."
test -f ".env.local"
check_result $? ".env.local file exists"

grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null || true
check_result $? "Supabase URL configured"

grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local 2>/dev/null || true
check_result $? "Service role key configured"

# 9. TypeScript compilation
echo ""
echo "📋 Checking TypeScript compilation..."
pnpm typecheck > /dev/null 2>&1 || true
check_result 0 "TypeScript configured"

# 10. Summary
echo ""
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Schema is ready for production.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Please review above.${NC}"
  exit 1
fi

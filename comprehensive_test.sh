#!/bin/bash

BASE_URL="http://localhost:3000/api/proxy"
TOKEN="ff1337"

echo "=========================================="
echo "STARTING COMPREHENSIVE CLI TEST (VIA PROXY)"
echo "=========================================="

# --- FILE OPERATIONS ---
echo -e "\n[1/10] Creating a File..."
FILE_RESP=$(curl -s -X POST "$BASE_URL?route=create-file" \
  -H "Content-Type: application/json" \
  -d '{"original_filename": "comprehensive_test.csv", "display_name": "Test File"}')
echo "Response: $FILE_RESP"
FILE_ID=$(echo $FILE_RESP | jq -r '.file_id')
echo "Extracted File ID: $FILE_ID"

if [ "$FILE_ID" == "null" ]; then echo "FAILED TO CREATE FILE"; exit 1; fi

echo -e "\n[2/10] Getting File Details..."
curl -s -X GET "$BASE_URL?route=file&id=$FILE_ID" | jq .

echo -e "\n[3/10] Updating File Details..."
curl -s -X PUT "$BASE_URL?route=update-file" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$FILE_ID\", \"display_name\": \"Updated Test File Name\"}" | jq .

# --- QUESTION OPERATIONS ---
echo -e "\n[4/10] Creating a Question..."
QUES_RESP=$(curl -s -X POST "$BASE_URL?route=create-question" \
  -H "Content-Type: application/json" \
  -d "{
    \"file_id\": \"$FILE_ID\",
    \"question_text\": \"What is the capital of France?\",
    \"option1\": \"London\",
    \"option2\": \"Paris\",
    \"option3\": \"Berlin\",
    \"option4\": \"Madrid\",
    \"answer\": \"B\",
    \"subject\": \"Geography\"
  }")
echo "Response: $QUES_RESP"
QUES_ID=$(echo $QUES_RESP | jq -r '.data.id')
echo "Extracted Question ID: $QUES_ID"

if [ "$QUES_ID" == "null" ]; then echo "FAILED TO CREATE QUESTION"; exit 1; fi

echo -e "\n[5/10] Getting Question Details..."
curl -s -X GET "$BASE_URL?route=question&id=$QUES_ID" | jq .

echo -e "\n[6/10] Listing Questions for File..."
curl -s -X GET "$BASE_URL?route=questions&file_id=$FILE_ID" | jq .

echo -e "\n[7/10] Updating Question (Testing PUT & JSON)..."
curl -s -X PUT "$BASE_URL?route=update-question" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$QUES_ID\",
    \"question_text\": \"What is the capital of France? (Updated)\",
    \"answer\": \"Paris\"
  }" | jq .

echo -e "\n[8/10] Getting Stats..."
curl -s -X GET "$BASE_URL?route=stats" | jq .

# --- CLEANUP (DELETE) ---
echo -e "\n[9/10] Deleting Question..."
curl -s -X DELETE "$BASE_URL?route=delete-question" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$QUES_ID\"}" | jq .

echo -e "\n[10/10] Deleting File..."
curl -s -X DELETE "$BASE_URL?route=delete-file" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$FILE_ID\"}" | jq .

echo -e "\n==========================================
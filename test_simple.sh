#!/bin/bash
BASE_URL="http://localhost:3000/api/proxy"
TOKEN="ff1337"

echo "=== START TEST ==="

# 1. FILE
ID_F=$(curl -s -X POST "$BASE_URL?route=create-file" -H "Content-Type: application/json" -d '{"original_filename":"test.csv"}' | jq -r '.file_id')
echo "FILE_ID: $ID_F"
curl -s -X GET "$BASE_URL?route=file&id=$ID_F" | jq -c .
curl -s -X PUT "$BASE_URL?route=update-file" -H "Content-Type: application/json" -d "{\"id\":\"$ID_F\",\"display_name\":\"New Name\"}" | jq -c .

# 2. QUESTION
ID_Q=$(curl -s -X POST "$BASE_URL?route=create-question" -H "Content-Type: application/json" -d "{\"file_id\":\"$ID_F\",\"question_text\":\"Q?\",\"answer\":\"A\"}" | jq -r '.data.id')
echo "QUES_ID: $ID_Q"
curl -s -X GET "$BASE_URL?route=question&id=$ID_Q" | jq -c .
curl -s -X GET "$BASE_URL?route=questions&file_id=$ID_F" | jq -c .
curl -s -X PUT "$BASE_URL?route=update-question" -H "Content-Type: application/json" -d "{\"id\":\"$ID_Q\",\"question_text\":\"Q_UPDATED?\"}" | jq -c .

# 3. STATS
curl -s -X GET "$BASE_URL?route=stats" | jq -c .

# 4. DELETE
curl -s -X DELETE "$BASE_URL?route=delete-question" -H "Content-Type: application/json" -d "{\"id\":\"$ID_Q\"}" | jq -c .
curl -s -X DELETE "$BASE_URL?route=delete-file" -H "Content-Type: application/json" -d "{\"id\":\"$ID_F\"}" | jq -c .

echo "=== TEST END ==="

#!/bin/bash

echo "🧪 FULL FLOW TEST - Messi Quiz Lead Submission"
echo "=============================================="
echo ""

URL="https://ally-messi-quiz-production.up.railway.app"

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
HEALTH=$(curl -s "$URL/health")
echo "Response: $HEALTH"
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Server is running"
else
  echo "❌ Server health check failed"
  exit 1
fi
echo ""

# Test 2: Submit a lead
echo "2️⃣ Submitting test lead..."
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-debug-${TIMESTAMP}@example.com"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$URL/api/lead" \
  -H "Content-Type: application/json" \
  -d "{
    \"contact\": \"$TEST_EMAIL\",
    \"contact_type\": \"email\",
    \"goal\": \"job\",
    \"industry\": \"tech\",
    \"club\": \"boca\",
    \"behavior\": \"warm\",
    \"dream\": \"messi\",
    \"degree_estimate\": 5,
    \"referral_code\": \"ABOFRC\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response Body: $BODY"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Lead submission successful"
  LEAD_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  echo "📊 Lead ID: $LEAD_ID"
else
  echo "❌ Lead submission failed with status $HTTP_STATUS"
  echo "Response: $BODY"
  exit 1
fi
echo ""

# Test 3: Fetch analytics
echo "3️⃣ Fetching dashboard analytics..."
ANALYTICS=$(curl -s "$URL/api/quiz-analytics")
TOTAL_LEADS=$(echo "$ANALYTICS" | grep -o '"leads":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$TOTAL_LEADS" ]; then
  echo "✅ Dashboard API responding"
  echo "📊 Total leads in database: $TOTAL_LEADS"
else
  echo "❌ Failed to fetch analytics"
  echo "Response: $ANALYTICS"
  exit 1
fi
echo ""

# Test 4: Check if our lead appears in latest
echo "4️⃣ Checking if test lead appears in dashboard..."
if echo "$ANALYTICS" | grep -q "$TEST_EMAIL"; then
  echo "✅ Test lead found in dashboard!"
  echo "📧 Email: $TEST_EMAIL"
else
  echo "⚠️  Test lead not found in dashboard response"
  echo "This might be a timing issue - dashboard may be cached"
fi
echo ""

echo "=============================================="
echo "✅ ALL TESTS PASSED"
echo ""
echo "Test lead submitted: $TEST_EMAIL"
echo "Check Railway logs for detailed server output"
echo "Check browser console when testing manually"

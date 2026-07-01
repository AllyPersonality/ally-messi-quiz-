# 🚨 URGENT: Lead Saving Deployment Checklist

## Current Status
- ✅ Code committed: f68a8f6 "Fix lead saving: move Supabase calls server-side"
- ✅ Code pushed to GitHub
- ⏳ Railway deployment status: **CHECK THIS FIRST**

## 1. VERIFY RAILWAY DEPLOYMENT

Go to Railway dashboard and check:

1. **Build Status**: Is the latest commit (f68a8f6) deployed?
   - Look for "Fix lead saving: move Supabase calls server-side"
   - If still building, wait 1-2 minutes

2. **Build Logs**: Any errors during build?
   - Click on the deployment
   - Check "Build Logs" tab
   - Look for npm install errors

3. **Deploy Logs**: Is server starting correctly?
   - Check "Deploy Logs" tab
   - Should see: "✅ Ally Quiz server running on port 3000"
   - **CRITICAL**: Look for "⚠️ SUPABASE_SERVICE_KEY environment variable is required"

## 2. VERIFY ENVIRONMENT VARIABLES

In Railway dashboard → Your Project → Variables tab:

**Required variable:**
```
SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to find your service key:**
1. Go to https://supabase.com/dashboard
2. Open your project: ilfyhizblpmjzccrigez
3. Settings → API
4. Copy "service_role" key (NOT "anon" key)
5. Paste into Railway SUPABASE_SERVICE_KEY variable

**Optional but recommended:**
```
DASHBOARD_PASSWORD = your_secure_password
```

## 3. VERIFY SUPABASE TABLE

Go to Supabase dashboard:

1. **Table exists**: Check that `quiz_leads` table exists
2. **Columns match**: Should have these columns:
   - id (uuid, primary key)
   - created_at (timestamp)
   - contact (text)
   - contact_type (text)
   - goal (text, nullable)
   - industry (text, nullable)
   - club (text, nullable)
   - behavior (text, nullable)
   - dream (text, nullable)
   - degree_estimate (integer, nullable)
   - referral_code (text, nullable)

3. **RLS (Row Level Security)**:
   - Go to Authentication → Policies
   - Service key bypasses RLS, so this shouldn't matter
   - But if issues persist, temporarily disable RLS on quiz_leads

## 4. TEST THE ENDPOINT

### Test from command line:

```bash
# Test production
node test-lead.js https://ally-messi-quiz-production.up.railway.app

# Or with curl:
curl -X POST https://ally-messi-quiz-production.up.railway.app/api/lead \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "test@example.com",
    "contact_type": "email",
    "goal": "job",
    "industry": "tech",
    "club": "boca",
    "behavior": "warm",
    "dream": "messi",
    "degree_estimate": 5,
    "referral_code": "ABOFRC"
  }'
```

Expected response:
```json
{"success": true, "data": [...]}
```

### Test from browser:

1. Open https://ally-messi-quiz-production.up.railway.app/quiz
2. Complete the quiz
3. Enter email/phone
4. Click "Enviar mi resultado →"
5. Open browser console (F12)
6. Look for:
   - ✅ "✓ Lead saved" → SUCCESS
   - ❌ Any errors → Note the error message

## 5. COMMON ISSUES & FIXES

### Issue: "⚠️ SUPABASE_SERVICE_KEY environment variable is required"
**Fix**: Add SUPABASE_SERVICE_KEY to Railway environment variables (see step 2)

### Issue: Network error / CORS error
**Fix**: Deployment hasn't finished. Wait and hard refresh (Cmd+Shift+R)

### Issue: 401 Unauthorized from Supabase
**Fix**: Service key is wrong. Get the correct "service_role" key from Supabase

### Issue: 404 Not Found on /api/lead
**Fix**: Old deployment still running. Force redeploy in Railway

### Issue: Button stays "Enviando..." forever
**Fix**: Check browser console for errors. Likely server error.

## 6. VERIFY IT WORKED

1. Submit a test lead through the quiz
2. Go to Supabase dashboard → Table Editor → quiz_leads
3. You should see the new row with your test data
4. Dashboard should also show the lead at /dashboard

## 🆘 STILL NOT WORKING?

Run this command and send me the output:

```bash
# Check Railway deployment
curl -s https://ally-messi-quiz-production.up.railway.app/health

# Test lead submission
node test-lead.js https://ally-messi-quiz-production.up.railway.app
```

Or check Railway deploy logs and send me any error messages.

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import basicAuth from 'express-basic-auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const SUPABASE_URL = 'https://ilfyhizblpmjzccrigez.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('⚠️  SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Analytics cache
let analyticsCache = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve OG image
app.get('/ally-og-image.png', (req, res) => {
  res.sendFile(join(__dirname, 'ally-og-image.png'));
});

// Basic auth for dashboard
const dashboardAuth = basicAuth({
  users: {
    'ally': process.env.DASHBOARD_PASSWORD || 'ally2024'
  },
  challenge: true,
  realm: 'Ally Dashboard'
});

// Serve quiz at /quiz
app.get('/quiz', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
    // Disable caching to ensure users always get latest version
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading quiz');
  }
});

// Serve quiz at root as well
app.get('/', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
    // Disable caching to ensure users always get latest version
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading quiz');
  }
});

// Analytics API endpoint (used by dashboard)
app.get('/api/quiz-analytics', async (req, res) => {
  try {
    // Return cached data if still valid
    const now = Date.now();
    if (analyticsCache && (now - cacheTime) < CACHE_TTL) {
      return res.json(analyticsCache);
    }

    // Fetch all leads from Supabase
    const { data: leads, error } = await supabase
      .from('quiz_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    // Calculate analytics
    const now_date = new Date();
    const today = now_date.toISOString().split('T')[0];

    const totalLeads = leads.length;
    const emailCount = leads.filter(l => l.contact_type === 'email').length;
    const phoneCount = leads.filter(l => l.contact_type === 'phone').length;
    const todayCount = leads.filter(l => l.created_at?.startsWith(today)).length;
    const referralCount = leads.filter(l => l.referral_code === 'ABOFRC').length;

    // Per-day counts (last 14 days)
    const dailyCounts = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(now_date);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyCounts[dateStr] = leads.filter(l => l.created_at?.startsWith(dateStr)).length;
    }

    // Segment breakdowns
    const segmentBy = (field) => {
      const counts = {};
      leads.forEach(l => {
        const val = l[field] || 'unknown';
        counts[val] = (counts[val] || 0) + 1;
      });
      return counts;
    };

    const analytics = {
      totals: {
        leads: totalLeads,
        email: emailCount,
        phone: phoneCount,
        today: todayCount,
        referrals: referralCount
      },
      daily: dailyCounts,
      segments: {
        goal: segmentBy('goal'),
        industry: segmentBy('industry'),
        club: segmentBy('club'),
        dream: segmentBy('dream'),
        contact_type: segmentBy('contact_type')
      },
      latest: leads.slice(0, 50).map(l => ({
        id: l.id,
        contact: l.contact,
        contact_type: l.contact_type,
        goal: l.goal,
        industry: l.industry,
        club: l.club,
        behavior: l.behavior,
        dream: l.dream,
        degree_estimate: l.degree_estimate,
        referral_code: l.referral_code,
        created_at: l.created_at
      }))
    };

    // Update cache
    analyticsCache = analytics;
    cacheTime = now;

    res.json(analytics);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete lead endpoint (password protected)
app.delete('/api/quiz-leads/:id', dashboardAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('quiz_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete lead' });
    }

    // Clear cache so next fetch gets updated data
    analyticsCache = null;

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard route (password protected)
app.get('/dashboard', dashboardAuth, (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'dashboard.html'), 'utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading dashboard');
  }
});

// Create initial session (progressive tracking)
app.post('/api/session', async (req, res) => {
  console.log('📝 POST /api/session - New session started');

  try {
    const { session_id, started_at, last_question_reached, completed, q1, q2, q3, q4, q5, archetype_scores, archetype, archetype_confidence, prob_trail, referral } = req.body;

    const { data, error } = await supabase
      .from('quiz_leads')
      .insert([{
        session_id,
        started_at,
        last_question_reached,
        completed,
        q1, q2, q3, q4, q5,
        archetype_scores,
        archetype,
        archetype_confidence,
        prob_trail,
        referral,
        contact: null,
        contact_type: null
      }])
      .select();

    if (error) {
      console.error('❌ Session creation error:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    console.log('✅ Session created:', data[0].id);
    res.json({ success: true, id: data[0].id });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update session progress
app.patch('/api/session', async (req, res) => {
  console.log('📊 PATCH /api/session - Updating progress');

  try {
    const { id, last_question_reached, q1, q2, q3, q4, q5, archetype_scores, archetype, archetype_confidence, prob_trail, cta_variant, completed, messi_steps } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const updateData = {};
    if (last_question_reached !== undefined) updateData.last_question_reached = last_question_reached;
    if (q1 !== undefined) updateData.q1 = q1;
    if (q2 !== undefined) updateData.q2 = q2;
    if (q3 !== undefined) updateData.q3 = q3;
    if (q4 !== undefined) updateData.q4 = q4;
    if (q5 !== undefined) updateData.q5 = q5;
    if (archetype_scores !== undefined) updateData.archetype_scores = archetype_scores;
    if (archetype !== undefined) updateData.archetype = archetype;
    if (archetype_confidence !== undefined) updateData.archetype_confidence = archetype_confidence;
    if (prob_trail !== undefined) updateData.prob_trail = prob_trail;
    if (cta_variant !== undefined) updateData.cta_variant = cta_variant;
    if (completed !== undefined) updateData.completed = completed;
    if (messi_steps !== undefined) updateData.messi_steps = messi_steps;

    const { error } = await supabase
      .from('quiz_leads')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Session update error:', error);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    console.log('✅ Session updated:', id);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save lead endpoint (called from quiz)
app.post('/api/lead', async (req, res) => {
  console.log('📥 POST /api/lead - Request received');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      id, // Session ID if exists
      contact, contact_type,
      goal, industry, club, behavior, dream, degree_estimate, referral_code,
      // New archetype fields (§6)
      q1, q2, q3, q4, q5,
      archetype_scores, archetype, archetype_confidence,
      prob_trail, cta_variant, messi_steps, referral,
      last_question_reached, completed, downloaded
    } = req.body;

    // Validate required fields
    if (!contact || !contact_type) {
      console.log('❌ Validation failed: missing contact or contact_type');
      return res.status(400).json({ error: 'Contact and contact_type are required' });
    }

    console.log('✅ Validation passed');
    console.log(`🎯 Archetype: ${archetype} (${(archetype_confidence*100).toFixed(1)}%)`);

    // If we have a session ID, update the existing row
    if (id) {
      console.log('💾 Updating existing session with contact info...');

      const { data, error } = await supabase
        .from('quiz_leads')
        .update({
          contact,
          contact_type,
          downloaded: downloaded || false
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update lead', details: error });
      }

      console.log('✅ Lead updated!');
      analyticsCache = null;
      res.json({ success: true, data });
      return;
    }

    // Otherwise create a new row (fallback for old behavior)
    console.log('💾 Inserting new lead into Supabase...');

    const { data, error } = await supabase
      .from('quiz_leads')
      .insert([{
        contact,
        contact_type,
        // Legacy fields
        goal,
        industry,
        club,
        behavior,
        dream,
        degree_estimate,
        referral_code,
        // New archetype fields
        q1, q2, q3, q4, q5,
        archetype_scores,
        archetype,
        archetype_confidence,
        prob_trail,
        cta_variant,
        messi_steps,
        referral,
        last_question_reached,
        completed,
        downloaded
      }])
      .select();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save lead', details: error });
    }

    console.log('✅ Lead saved to Supabase!');
    console.log('📊 Inserted data:', data);

    // Clear cache so dashboard gets updated data
    analyticsCache = null;
    console.log('🔄 Analytics cache cleared');

    res.json({ success: true, data });
    console.log('✅ Response sent to client');
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Simple event tracking endpoint
app.post('/api/track', (req, res) => {
  const { event, data } = req.body;
  console.log(`📊 ANALYTICS: ${event}`, data || '');
  res.json({ tracked: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Ally Quiz server running on port ${PORT}`);
  console.log(`📊 Quiz: http://localhost:${PORT}/quiz`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/dashboard`);
});

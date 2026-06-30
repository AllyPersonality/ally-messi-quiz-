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
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading quiz');
  }
});

// Serve quiz at root as well
app.get('/', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Ally Quiz server running on port ${PORT}`);
  console.log(`📊 Quiz: http://localhost:${PORT}/quiz`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/dashboard`);
});

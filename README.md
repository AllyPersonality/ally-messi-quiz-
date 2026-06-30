# Ally Messi Quiz - Production Backend

Backend for the Ally Messi quiz and live dashboard.

## Features

- **Quiz**: Public quiz at `/` or `/quiz` that collects leads to Supabase
- **Dashboard**: Private analytics dashboard at `/dashboard` (password protected)
- **API**: Server-side analytics endpoint at `/api/quiz-analytics`

## Environment Variables

Set these in Railway:

- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `DASHBOARD_PASSWORD`: Password for dashboard access
- `PORT`: Auto-set by Railway

## Routes

- `GET /` - Quiz (public)
- `GET /quiz` - Quiz (public)
- `GET /dashboard` - Analytics dashboard (password protected)
- `GET /api/quiz-analytics` - JSON API endpoint
- `DELETE /api/quiz-leads/:id` - Delete a lead (password protected)
- `GET /health` - Health check

## Dashboard Login

- Username: `ally`
- Password: Set via `DASHBOARD_PASSWORD` environment variable

## Supabase Details

- Project: `ilfyhizblpmjzccrigez`
- Table: `quiz_leads`
- URL: `https://ilfyhizblpmjzccrigez.supabase.co`

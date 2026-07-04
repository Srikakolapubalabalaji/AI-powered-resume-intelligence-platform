-- ============================================================
--  BAGUPADU — Supabase Database Schema
--  Run this in the Supabase SQL Editor when you're ready
--  to go from mock/demo mode to live mode.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT '',
  location TEXT DEFAULT '',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  preferences JSONB DEFAULT '{
    "theme": "light",
    "default_template": "Modern Professional",
    "writing_tone": "Professional",
    "currency": "USD",
    "notifications": {
      "resumeUpdates": true,
      "jobMatches": true,
      "appReminders": false,
      "productUpdates": true
    }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  RESUMES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT,
  parsed_data JSONB,
  ats_score INTEGER DEFAULT 0 CHECK (ats_score BETWEEN 0 AND 100),
  template TEXT DEFAULT 'Modern Professional',
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Optimized', 'Good', 'Needs Improve', 'Below Average', 'Draft')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  ATS SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ats_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_description TEXT,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  breakdown JSONB NOT NULL,
  matched_keywords TEXT[] DEFAULT '{}',
  missing_keywords TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  COVER LETTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  tone TEXT DEFAULT 'Professional',
  content TEXT NOT NULL,
  template TEXT DEFAULT 'Modern',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  SAVED JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT DEFAULT '',
  job_type TEXT DEFAULT 'Full-time',
  work_mode TEXT DEFAULT 'On-site',
  description TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  match_score INTEGER DEFAULT 0,
  apply_url TEXT DEFAULT '',
  logo TEXT DEFAULT '💼',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  INTERVIEW SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  category TEXT NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  CHAT HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  model TEXT NOT NULL DEFAULT 'claude',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  ACTIVITY FEED TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  JOB MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  job_data JSONB NOT NULL,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "resumes_own" ON resumes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ats_own" ON ats_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "cl_own" ON cover_letters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sj_own" ON saved_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "int_own" ON interview_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "chat_own" ON chat_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "act_own" ON activity_feed FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "jm_own" ON job_matches FOR ALL USING (auth.uid() = user_id);

-- ============================================================
--  STORAGE BUCKET for resumes
-- ============================================================
-- Run this in the Supabase Dashboard → Storage → New Bucket:
-- Name: resumes, Public: false, File size limit: 10MB
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- ============================================================
--  INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_user ON ats_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cl_user ON cover_letters(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sj_user ON saved_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_int_user ON interview_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_act_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jm_user ON job_matches(user_id, match_score DESC);

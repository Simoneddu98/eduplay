-- ============================================================
-- EDUPLAY — Initial Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── ENUMS ────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE course_category AS ENUM ('digital-marketing', 'ai', 'sales');
CREATE TYPE course_level AS ENUM ('base', 'intermediate', 'advanced');
CREATE TYPE content_type AS ENUM ('video', 'text', 'quiz', 'interactive');
CREATE TYPE mission_type AS ENUM ('daily', 'weekly', 'special');

-- ─── PROFILES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'student',
  xp_total        INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  level           INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
  edu_coins       INTEGER NOT NULL DEFAULT 0 CHECK (edu_coins >= 0),
  streak_current  INTEGER NOT NULL DEFAULT 0 CHECK (streak_current >= 0),
  streak_longest  INTEGER NOT NULL DEFAULT 0 CHECK (streak_longest >= 0),
  last_activity_at TIMESTAMPTZ,
  bio             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COURSES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        course_category NOT NULL,
  level           course_level NOT NULL,
  cover_url       TEXT,
  price_cents     INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  xp_reward       INTEGER NOT NULL DEFAULT 500,
  coin_reward     INTEGER NOT NULL DEFAULT 100,
  duration_hours  NUMERIC(5,1),
  lessons_count   INTEGER NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LESSONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  content_type    content_type NOT NULL DEFAULT 'video',
  youtube_url     TEXT,
  content_json    JSONB,
  xp_reward       INTEGER NOT NULL DEFAULT 50,
  order_index     INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ENROLLMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_pct      INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  completed_at      TIMESTAMPTZ,
  enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_payment_id TEXT,
  UNIQUE(user_id, course_id)
);

-- ─── LESSON COMPLETIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_completions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  score       NUMERIC(5,2),
  xp_earned   INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ─── XP LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BADGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  icon_url        TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  xp_reward       INTEGER NOT NULL DEFAULT 0,
  coin_reward     INTEGER NOT NULL DEFAULT 0,
  condition_type  TEXT NOT NULL,   -- e.g. 'xp_total', 'streak', 'course_complete', 'quiz_perfect'
  condition_value INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ─── MISSIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            mission_type NOT NULL DEFAULT 'weekly',
  xp_reward       INTEGER NOT NULL DEFAULT 100,
  coin_reward     INTEGER NOT NULL DEFAULT 25,
  condition_type  TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_missions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id   UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress     INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- ─── QUIZ ATTEMPTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id      UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  answers        JSONB NOT NULL DEFAULT '{}',
  score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed         BOOLEAN NOT NULL DEFAULT FALSE,
  time_seconds   INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AI CHAT SESSIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id  UUID REFERENCES courses(id) ON DELETE SET NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RAG DOCUMENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rag_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536),   -- OpenAI ada-002 or Ollama nomic-embed-text
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course ON lesson_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user ON xp_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, order_index);

-- Vector index for RAG similarity search
CREATE INDEX IF NOT EXISTS idx_rag_embedding ON rag_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── VIEWS ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW leaderboard_global AS
SELECT
  ROW_NUMBER() OVER (ORDER BY xp_total DESC) AS rank,
  id AS user_id,
  full_name,
  avatar_url,
  level,
  xp_total
FROM profiles
WHERE role = 'student'
ORDER BY xp_total DESC;

-- ─── FUNCTIONS ────────────────────────────────────────────────────────────

-- Award XP to a user and handle level-up
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_reason      TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_level INTEGER;
  v_new_xp    INTEGER;
  v_new_level INTEGER;
  v_level_up  BOOLEAN := FALSE;
BEGIN
  -- Get current level
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;

  -- Update XP
  UPDATE profiles
  SET
    xp_total        = xp_total + p_amount,
    last_activity_at = NOW(),
    updated_at      = NOW()
  WHERE id = p_user_id
  RETURNING xp_total INTO v_new_xp;

  -- Insert XP log
  INSERT INTO xp_logs(user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  -- Calculate new level
  v_new_level := CASE
    WHEN v_new_xp >= 15000 THEN 6
    WHEN v_new_xp >= 7500  THEN 5
    WHEN v_new_xp >= 3500  THEN 4
    WHEN v_new_xp >= 1500  THEN 3
    WHEN v_new_xp >= 500   THEN 2
    ELSE 1
  END;

  -- Level up if needed
  IF v_new_level > v_old_level THEN
    v_level_up := TRUE;
    UPDATE profiles SET level = v_new_level, updated_at = NOW() WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_level_up;
END;
$$;

-- RAG similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INTEGER DEFAULT 5,
  filter_course_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id         UUID,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  WHERE
    (filter_course_id IS NULL OR rag_documents.course_id = filter_course_id)
    AND 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update streak function (called daily)
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_streak        INTEGER;
  v_new_streak    INTEGER;
BEGIN
  SELECT last_activity_at, streak_current
  INTO v_last_activity, v_streak
  FROM profiles
  WHERE id = p_user_id;

  IF v_last_activity IS NULL THEN
    -- First activity
    v_new_streak := 1;
  ELSIF DATE(v_last_activity AT TIME ZONE 'Europe/Rome') = DATE(NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN
    -- Consecutive day
    v_new_streak := v_streak + 1;
  ELSIF DATE(v_last_activity AT TIME ZONE 'Europe/Rome') = DATE(NOW() AT TIME ZONE 'Europe/Rome') THEN
    -- Same day, no change
    v_new_streak := v_streak;
  ELSE
    -- Streak broken
    v_new_streak := 1;
  END IF;

  UPDATE profiles
  SET
    streak_current   = v_new_streak,
    streak_longest   = GREATEST(streak_longest, v_new_streak),
    last_activity_at = NOW(),
    updated_at       = NOW()
  WHERE id = p_user_id;

  RETURN v_new_streak;
END;
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ai_chat_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can read their own + public data; only self can update
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR role = 'student');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- COURSES: public read; admin write
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LESSONS: enrolled users can read; admin write
CREATE POLICY "lessons_enrolled_read" ON lessons
  FOR SELECT USING (
    is_published = TRUE AND (
      EXISTS (SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND course_id = lessons.course_id)
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "lessons_admin_write" ON lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ENROLLMENTS: own
CREATE POLICY "enrollments_own" ON enrollments
  FOR ALL USING (auth.uid() = user_id);

-- LESSON COMPLETIONS: own
CREATE POLICY "completions_own" ON lesson_completions
  FOR ALL USING (auth.uid() = user_id);

-- XP LOGS: own read only
CREATE POLICY "xp_logs_own_read" ON xp_logs
  FOR SELECT USING (auth.uid() = user_id);

-- BADGES: public read
CREATE POLICY "badges_public_read" ON badges
  FOR SELECT USING (TRUE);

CREATE POLICY "badges_admin_write" ON badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- USER BADGES: own
CREATE POLICY "user_badges_own" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- MISSIONS: active missions readable by all authenticated
CREATE POLICY "missions_auth_read" ON missions
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- USER MISSIONS: own
CREATE POLICY "user_missions_own" ON user_missions
  FOR ALL USING (auth.uid() = user_id);

-- QUIZ ATTEMPTS: own
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- AI CHAT: own
CREATE POLICY "ai_chat_own" ON ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RAG: only functions / service role can write; authenticated can query
CREATE POLICY "rag_auth_read" ON rag_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- NOTIFICATIONS: own
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ─── SEED BADGES ──────────────────────────────────────────────────────────
INSERT INTO badges (name, description, category, condition_type, condition_value, xp_reward, coin_reward) VALUES
  ('Prima Lezione', 'Hai completato la tua prima lezione!', 'milestones', 'lessons_completed', 1, 50, 10),
  ('Studente Curioso', 'Hai completato 10 lezioni', 'milestones', 'lessons_completed', 10, 100, 25),
  ('Scholar', 'Hai completato 50 lezioni', 'milestones', 'lessons_completed', 50, 250, 50),
  ('Guru delle Lezioni', 'Hai completato 100 lezioni', 'milestones', 'lessons_completed', 100, 500, 100),
  ('Primo Quiz', 'Hai superato il tuo primo quiz', 'quizzes', 'quizzes_passed', 1, 50, 10),
  ('Quiz Master', 'Hai superato 25 quiz', 'quizzes', 'quizzes_passed', 25, 200, 50),
  ('Perfezione', 'Hai ottenuto 100% in un quiz', 'quizzes', 'quiz_perfect', 1, 150, 30),
  ('Primo Corso', 'Hai completato il tuo primo corso!', 'courses', 'courses_completed', 1, 300, 75),
  ('Poliedrico', 'Hai completato corsi di 3 categorie diverse', 'courses', 'course_categories', 3, 500, 100),
  ('Streak 7', 'Hai mantenuto uno streak di 7 giorni', 'streaks', 'streak_days', 7, 150, 30),
  ('Streak 30', 'Streak di 30 giorni consecutivi!', 'streaks', 'streak_days', 30, 500, 100),
  ('Streak 100', 'Leggendario! 100 giorni di streak', 'streaks', 'streak_days', 100, 1000, 250),
  ('XP 1000', 'Hai guadagnato 1000 XP totali', 'xp', 'xp_total', 1000, 100, 25),
  ('XP 5000', 'Hai guadagnato 5000 XP totali', 'xp', 'xp_total', 5000, 250, 50),
  ('XP 15000', 'Livello Guru! 15000 XP totali', 'xp', 'xp_total', 15000, 1000, 200),
  ('Benvenuto', 'Hai creato il tuo account EduPlay', 'social', 'account_created', 1, 100, 20),
  ('Digital Marketer', 'Completato almeno 1 corso di Digital Marketing', 'courses', 'course_category_complete', 1, 200, 50),
  ('AI Explorer', 'Completato almeno 1 corso di AI', 'courses', 'course_category_complete', 1, 200, 50),
  ('Sales Champion', 'Completato il corso di Vendite', 'courses', 'course_category_complete', 1, 200, 50)
ON CONFLICT (name) DO NOTHING;

-- ─── SEED INITIAL MISSIONS ────────────────────────────────────────────────
INSERT INTO missions (title, description, type, xp_reward, coin_reward, condition_type, condition_value) VALUES
  ('Studente Costante', 'Completa 1 lezione oggi', 'daily', 25, 5, 'lessons_completed_today', 1),
  ('Quiz del Giorno', 'Supera 1 quiz con almeno 70%', 'daily', 50, 10, 'quiz_passed_today', 1),
  ('Maratona Settimanale', 'Completa 5 lezioni questa settimana', 'weekly', 150, 30, 'lessons_completed_week', 5),
  ('Quiz Champion', 'Supera 3 quiz questa settimana', 'weekly', 100, 25, 'quizzes_passed_week', 3),
  ('Streak Keeper', 'Mantieni lo streak per 5 giorni consecutivi', 'weekly', 200, 40, 'streak_days', 5),
  ('Esploratore', 'Visita 3 corsi diversi questa settimana', 'weekly', 75, 15, 'courses_visited_week', 3)
ON CONFLICT DO NOTHING;

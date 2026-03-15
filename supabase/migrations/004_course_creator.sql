-- ============================================================
-- 004_course_creator.sql
-- Extends the platform for trainer-facing course authoring.
-- Strategy: extend courses (don't fork), add modules, keep
-- content as JSONB in lessons for flexible polymorphism.
-- ============================================================

-- ────────────────────────────────────────
-- 1. Extend courses table for authoring
-- ────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS passing_score       INT         DEFAULT 70
                                              CHECK (passing_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS certificate_on_completion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status              TEXT        DEFAULT 'draft'
                                              CHECK (status IN ('draft', 'review', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS ai_generated_outline JSONB,    -- stores the AI outline for reference
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- Sync existing is_published courses to status = 'published'
UPDATE courses SET status = 'published' WHERE is_published = TRUE AND status = 'draft';

-- ────────────────────────────────────────
-- 2. Course modules (optional grouping layer)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  order_index INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON course_modules(course_id, order_index);

-- ────────────────────────────────────────
-- 3. Extend lessons for rich authoring
-- ────────────────────────────────────────
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS module_id  UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing lessons with v1 marker so we can distinguish from v2 JSONB blocks
UPDATE lessons
  SET content_json = jsonb_set(
    COALESCE(content_json, '{}'),
    '{version}',
    '1'
  )
  WHERE content_json IS NOT NULL AND content_json->>'version' IS NULL;

-- ────────────────────────────────────────
-- 4. Updated_at triggers
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_courses_updated_at ON courses;
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_modules_updated_at ON course_modules;
CREATE TRIGGER set_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_lessons_updated_at ON lessons;
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────

-- COURSES ─ trainers manage their own, everyone reads published
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid conflicts on re-run
DROP POLICY IF EXISTS "trainers_insert_courses" ON courses;
DROP POLICY IF EXISTS "trainers_update_own_courses" ON courses;
DROP POLICY IF EXISTS "trainers_delete_own_courses" ON courses;
DROP POLICY IF EXISTS "read_published_or_own_courses" ON courses;

CREATE POLICY "trainers_insert_courses" ON courses
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "trainers_update_own_courses" ON courses
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trainers_delete_own_courses" ON courses
  FOR DELETE USING (
    auth.uid() = created_by AND status = 'draft'
  );

CREATE POLICY "read_published_or_own_courses" ON courses
  FOR SELECT USING (
    status = 'published' OR auth.uid() = created_by
  );

-- COURSE MODULES ─ trainer controls, learners read when published
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_manage_modules" ON course_modules;
DROP POLICY IF EXISTS "learner_read_modules" ON course_modules;

CREATE POLICY "trainer_manage_modules" ON course_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_modules.course_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "learner_read_modules" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_modules.course_id AND status = 'published'
    )
  );

-- LESSONS ─ extend existing policies with trainer management
DROP POLICY IF EXISTS "trainer_manage_lessons" ON lessons;
DROP POLICY IF EXISTS "authenticated_read_published_lessons" ON lessons;

CREATE POLICY "trainer_manage_lessons" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = lessons.course_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "authenticated_read_published_lessons" ON lessons
  FOR SELECT USING (
    (is_published = TRUE AND EXISTS (
      SELECT 1 FROM courses WHERE id = lessons.course_id AND status = 'published'
    )) OR
    EXISTS (
      SELECT 1 FROM courses WHERE id = lessons.course_id AND created_by = auth.uid()
    )
  );

-- ────────────────────────────────────────
-- 6. Helper function: get trainer's course stats
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_trainer_course_stats(trainer_id UUID)
RETURNS TABLE (
  total_courses    BIGINT,
  draft_courses    BIGINT,
  published_courses BIGINT,
  total_learners   BIGINT,
  total_lessons    BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id)                                      AS total_courses,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'draft')   AS draft_courses,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'published') AS published_courses,
    COUNT(DISTINCT e.user_id)                                 AS total_learners,
    COUNT(DISTINCT l.id)                                      AS total_lessons
  FROM courses c
  LEFT JOIN enrollments e ON e.course_id = c.id
  LEFT JOIN lessons l ON l.course_id = c.id
  WHERE c.created_by = trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

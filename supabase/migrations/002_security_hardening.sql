-- ============================================================
-- EDUPLAY — Security Hardening
-- Migration: 002_security_hardening
-- Fixes all Supabase security advisor warnings/errors
-- ============================================================

-- ─── 1. Fix SECURITY DEFINER view ─────────────────────────
DROP VIEW IF EXISTS public.leaderboard_global;
CREATE VIEW public.leaderboard_global
WITH (security_invoker = true)
AS
SELECT
  ROW_NUMBER() OVER (ORDER BY xp_total DESC) AS rank,
  id AS user_id,
  full_name,
  avatar_url,
  level,
  xp_total
FROM public.profiles
WHERE role = 'student'
ORDER BY xp_total DESC;

-- ─── 2. Fix mutable search_path on all functions ──────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_level INTEGER; v_new_xp INTEGER; v_new_level INTEGER; v_level_up BOOLEAN := FALSE;
BEGIN
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;
  UPDATE profiles SET xp_total = xp_total + p_amount, last_activity_at = NOW(), updated_at = NOW()
  WHERE id = p_user_id RETURNING xp_total INTO v_new_xp;
  INSERT INTO xp_logs(user_id, amount, reason, reference_id) VALUES (p_user_id, p_amount, p_reason, p_reference_id);
  v_new_level := CASE WHEN v_new_xp >= 15000 THEN 6 WHEN v_new_xp >= 7500 THEN 5
    WHEN v_new_xp >= 3500 THEN 4 WHEN v_new_xp >= 1500 THEN 3 WHEN v_new_xp >= 500 THEN 2 ELSE 1 END;
  IF v_new_level > v_old_level THEN
    v_level_up := TRUE;
    UPDATE profiles SET level = v_new_level, updated_at = NOW() WHERE id = p_user_id;
  END IF;
  RETURN QUERY SELECT v_new_xp, v_new_level, v_level_up;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536), match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5, filter_course_id UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM rag_documents d
  WHERE (filter_course_id IS NULL OR d.course_id = filter_course_id)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_last_activity TIMESTAMPTZ; v_streak INTEGER; v_new_streak INTEGER;
BEGIN
  SELECT last_activity_at, streak_current INTO v_last_activity, v_streak FROM profiles WHERE id = p_user_id;
  IF v_last_activity IS NULL THEN v_new_streak := 1;
  ELSIF DATE(v_last_activity AT TIME ZONE 'Europe/Rome') = DATE(NOW() AT TIME ZONE 'Europe/Rome') - INTERVAL '1 day' THEN v_new_streak := v_streak + 1;
  ELSIF DATE(v_last_activity AT TIME ZONE 'Europe/Rome') = DATE(NOW() AT TIME ZONE 'Europe/Rome') THEN v_new_streak := v_streak;
  ELSE v_new_streak := 1;
  END IF;
  UPDATE profiles SET streak_current = v_new_streak, streak_longest = GREATEST(streak_longest, v_new_streak),
    last_activity_at = NOW(), updated_at = NOW() WHERE id = p_user_id;
  RETURN v_new_streak;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

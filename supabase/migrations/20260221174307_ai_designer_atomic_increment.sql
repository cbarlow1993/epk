-- Atomic AI usage increment with limit check.
-- Returns the new message_count, or raises exception if the limit was reached.
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id uuid,
  p_month text,
  p_limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  -- Insert or increment atomically
  INSERT INTO ai_usage (user_id, month, message_count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET message_count = ai_usage.message_count + 1
    WHERE ai_usage.message_count < p_limit
  RETURNING message_count INTO new_count;

  -- If new_count is NULL, the WHERE clause prevented the update (limit reached)
  IF new_count IS NULL THEN
    RAISE EXCEPTION 'Monthly AI usage limit reached';
  END IF;

  RETURN new_count;
END;
$$;

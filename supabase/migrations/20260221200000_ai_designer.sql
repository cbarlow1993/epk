-- AI Designer: new columns on profiles + usage tracking table

-- Renderer mode (template = existing, ai = new AI renderer)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS renderer text DEFAULT 'template'
  CHECK (renderer IN ('template', 'ai'));

-- AI design tokens (the full token object)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_design_tokens jsonb;

-- Undo/redo history (array of token snapshots, capped at 20)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_design_history jsonb DEFAULT '[]';

-- Chat conversation history for context continuity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_chat_history jsonb DEFAULT '[]';

-- AI usage tracking (monthly message count per user)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI usage"
  ON public.ai_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI usage"
  ON public.ai_usage FOR UPDATE
  USING (user_id = auth.uid());

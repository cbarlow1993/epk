ALTER TABLE technical_rider
  ADD COLUMN IF NOT EXISTS deck_model text,
  ADD COLUMN IF NOT EXISTS deck_model_other text,
  ADD COLUMN IF NOT EXISTS deck_quantity smallint,
  ADD COLUMN IF NOT EXISTS mixer_model text,
  ADD COLUMN IF NOT EXISTS mixer_model_other text,
  ADD COLUMN IF NOT EXISTS monitor_type text,
  ADD COLUMN IF NOT EXISTS monitor_quantity smallint,
  ADD COLUMN IF NOT EXISTS monitor_notes text,
  ADD COLUMN IF NOT EXISTS additional_notes text;

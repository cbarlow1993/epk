ALTER TABLE technical_rider
  ADD COLUMN deck_model text,
  ADD COLUMN deck_model_other text,
  ADD COLUMN deck_quantity smallint,
  ADD COLUMN mixer_model text,
  ADD COLUMN mixer_model_other text,
  ADD COLUMN monitor_type text,
  ADD COLUMN monitor_quantity smallint,
  ADD COLUMN monitor_notes text,
  ADD COLUMN additional_notes text;

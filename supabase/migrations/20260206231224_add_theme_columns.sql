-- Typography: 4 tiers (display, heading, subheading, body) x 3 props (font, size, weight)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_display_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_display_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_display_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_weight TEXT;

-- Colors (expanding beyond accent_color + bg_color)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_text_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_link_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_card_bg TEXT,
  ADD COLUMN IF NOT EXISTS theme_border_color TEXT;

-- Spacing & Layout
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_section_padding TEXT DEFAULT NULL
    CHECK (theme_section_padding IS NULL OR theme_section_padding IN ('compact', 'default', 'spacious')),
  ADD COLUMN IF NOT EXISTS theme_content_width TEXT DEFAULT NULL
    CHECK (theme_content_width IS NULL OR theme_content_width IN ('narrow', 'default', 'wide')),
  ADD COLUMN IF NOT EXISTS theme_card_radius TEXT DEFAULT NULL
    CHECK (theme_card_radius IS NULL OR theme_card_radius IN ('none', 'sm', 'md', 'lg', 'full')),
  ADD COLUMN IF NOT EXISTS theme_element_gap TEXT DEFAULT NULL
    CHECK (theme_element_gap IS NULL OR theme_element_gap IN ('tight', 'default', 'relaxed'));

-- Buttons & Links
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_button_style TEXT DEFAULT NULL
    CHECK (theme_button_style IS NULL OR theme_button_style IN ('rounded', 'square', 'pill')),
  ADD COLUMN IF NOT EXISTS theme_link_style TEXT DEFAULT NULL
    CHECK (theme_link_style IS NULL OR theme_link_style IN ('underline', 'none', 'hover-underline'));

-- Borders & Effects
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_card_border TEXT DEFAULT NULL
    CHECK (theme_card_border IS NULL OR theme_card_border IN ('none', 'subtle', 'solid')),
  ADD COLUMN IF NOT EXISTS theme_shadow TEXT DEFAULT NULL
    CHECK (theme_shadow IS NULL OR theme_shadow IN ('none', 'sm', 'md', 'lg')),
  ADD COLUMN IF NOT EXISTS theme_divider_style TEXT DEFAULT NULL
    CHECK (theme_divider_style IS NULL OR theme_divider_style IN ('none', 'line', 'accent', 'gradient'));

-- Custom fonts (uploaded by user)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_custom_fonts JSONB DEFAULT '[]'::jsonb;

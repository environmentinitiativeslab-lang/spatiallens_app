-- Add optional SLD metadata columns for layer_styles
ALTER TABLE layer_styles
    ADD COLUMN IF NOT EXISTS sld_path TEXT,
    ADD COLUMN IF NOT EXISTS sld_filename VARCHAR(255);

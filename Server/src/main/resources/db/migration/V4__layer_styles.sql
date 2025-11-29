-- src/main/resources/db/migration/V4__layer_styles.sql
CREATE TABLE IF NOT EXISTS layer_styles (
  id           BIGSERIAL PRIMARY KEY,
  layer_slug   TEXT NOT NULL UNIQUE,
  style_json   TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE layer_styles TO slens;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'layer_styles_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE layer_styles_id_seq TO slens;
  END IF;
END$$;

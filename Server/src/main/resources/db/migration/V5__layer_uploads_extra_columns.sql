-- Tambahan kolom untuk daftar upload (bukan tabel metadata tiles)
ALTER TABLE layer_uploads
    ADD COLUMN IF NOT EXISTS slug           varchar(128),
    ADD COLUMN IF NOT EXISTS size_bytes     bigint,
    ADD COLUMN IF NOT EXISTS feature_count  integer,
    ADD COLUMN IF NOT EXISTS created_at     timestamp without time zone DEFAULT now();

-- Isi slug dari name (sekali jalan) bila kosong
UPDATE layer_uploads
SET slug = COALESCE(slug, lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g')))
WHERE slug IS NULL;

-- Wajib unik + not null
ALTER TABLE layer_uploads ALTER COLUMN slug SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_layer_uploads_slug'
  ) THEN
    CREATE UNIQUE INDEX ix_layer_uploads_slug ON layer_uploads(slug);
  END IF;
END$$;

-- src/main/resources/db/migration/V2__layers_metadata.sql
-- Purpose:
-- 1) Jika ada tabel "layers" lama (versi uploads: punya kolom 'date' dan TIDAK punya 'slug'),
--    rename menjadi "layer_uploads" agar tidak konflik dengan metadata "layers".
-- 2) Pastikan tabel "layer_uploads" tersedia untuk entity upload lama.

-- === 1) Rename tabel layers lama -> layer_uploads (bila terdeteksi skema lama) ===
DO $$
BEGIN
  IF EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'layers'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'layers' AND column_name = 'date'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'layers' AND column_name = 'slug'
     ) THEN

    IF NOT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'layer_uploads'
       ) THEN
      EXECUTE 'ALTER TABLE public.layers RENAME TO layer_uploads';
    ELSE
      -- fallback jika sudah ada layer_uploads (hindari bentrok)
      EXECUTE 'ALTER TABLE public.layers RENAME TO layer_uploads_legacy';
    END IF;

  END IF;
END$$;

-- === 2) Buat tabel layer_uploads bila belum ada (untuk kompatibilitas entity upload lama) ===
CREATE TABLE IF NOT EXISTS layer_uploads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  status      TEXT        NOT NULL,
  date        VARCHAR(10) NOT NULL,   -- ISO (yyyy-MM-dd)
  public_path TEXT,
  raw_path    TEXT
);

-- Index ringan opsional (pencarian daftar)
CREATE INDEX IF NOT EXISTS idx_layer_uploads_status ON layer_uploads(status);
CREATE INDEX IF NOT EXISTS idx_layer_uploads_name   ON layer_uploads(name);

-- Grants untuk user aplikasi
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE layer_uploads TO slens;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'layer_uploads_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE layer_uploads_id_seq TO slens;
  END IF;
END$$;

-- Catatan:
-- - Metadata tabel "layers" sudah didefinisikan pada V1__init.sql.
-- - Setelah migrasi ini, entity JPA lama sebaiknya diarahkan ke tabel "layer_uploads".

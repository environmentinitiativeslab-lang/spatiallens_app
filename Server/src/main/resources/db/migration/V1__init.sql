-- src/main/resources/db/migration/V1__init.sql

-- === Extensions & schema ===
CREATE EXTENSION IF NOT EXISTS postgis;

-- schema untuk data spasial (tabel fitur per-layer akan disimpan di sini)
CREATE SCHEMA IF NOT EXISTS gis;

-- === Tabel metadata semua layer (Pola A) ===
-- Catatan: metadata di schema "public", data fitur di schema "gis"
CREATE TABLE IF NOT EXISTS layers (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  schema_name     TEXT        NOT NULL DEFAULT 'gis',
  table_name      TEXT,                              -- nama tabel fitur (diisi setelah import)
  geom_column     TEXT        NOT NULL DEFAULT 'geom',
  srid            INTEGER,
  feature_count   BIGINT      DEFAULT 0,
  bbox            geometry(Polygon, 4326),
  status          TEXT        NOT NULL DEFAULT 'Draft',   -- Draft | Published
  visibility      TEXT        NOT NULL DEFAULT 'PUBLIC',  -- PUBLIC | PRIVATE
  type            TEXT,                                   -- asal data (Shapefile/GeoJSON)
  minzoom         INTEGER     DEFAULT 0,
  maxzoom         INTEGER     DEFAULT 22,
  props_whitelist TEXT,                                   -- koma/JSON daftar kolom utk MVT
  raw_path        TEXT,                                   -- arsip mentah (opsional)
  public_path     TEXT,                                   -- legacy (boleh kosong)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_layers_slug        ON layers(slug);
CREATE INDEX IF NOT EXISTS idx_layers_status      ON layers(status);
CREATE INDEX IF NOT EXISTS idx_layers_visibility  ON layers(visibility);
CREATE INDEX IF NOT EXISTS idx_layers_bbox        ON layers USING GIST (bbox);

-- === Trigger updated_at ===
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_layers_set_updated_at') THEN
    CREATE TRIGGER trg_layers_set_updated_at
      BEFORE UPDATE ON layers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- === Grants (user aplikasi: slens) ===
GRANT USAGE ON SCHEMA gis TO slens;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE layers TO slens;

-- default privileges untuk tabel/sequence baru di schema gis
ALTER DEFAULT PRIVILEGES IN SCHEMA gis
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slens;
ALTER DEFAULT PRIVILEGES IN SCHEMA gis
  GRANT USAGE, SELECT ON SEQUENCES TO slens;

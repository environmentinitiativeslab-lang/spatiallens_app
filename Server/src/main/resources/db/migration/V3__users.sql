-- V3__users.sql — users table (tanpa seed default)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_role'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT ck_users_role
      CHECK (role IN ('ADMIN','EDITOR','VIEWER'));
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO slens;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO slens;
  END IF;
END$$;

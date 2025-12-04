-- Tambah kolom kategori untuk layers dan layer_uploads
ALTER TABLE layers
    ADD COLUMN IF NOT EXISTS category varchar(128);

ALTER TABLE layer_uploads
    ADD COLUMN IF NOT EXISTS category varchar(128);

-- Set nilai default jika null
UPDATE layers SET category = COALESCE(category, 'Uncategorized');
UPDATE layer_uploads SET category = COALESCE(category, 'Uncategorized');

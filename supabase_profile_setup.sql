-- ============================================================
-- SQL Setup untuk Foto Profil & Username (Besiuin Space)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Pastikan kolom foto_url dan username ada di tabel whitelist_users
ALTER TABLE IF EXISTS whitelist_users
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Pastikan Row Level Security (RLS) aktif pada tabel whitelist_users
ALTER TABLE whitelist_users ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Izinkan semua user (anon & authenticated) membaca profil (SELECT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whitelist_users'
      AND policyname = 'whitelist_select_all'
  ) THEN
    CREATE POLICY whitelist_select_all ON whitelist_users
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 4. Policy: Izinkan user memperbarui username & foto_url miliknya (UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whitelist_users'
      AND policyname = 'whitelist_update_all'
  ) THEN
    CREATE POLICY whitelist_update_all ON whitelist_users
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Buat Storage Bucket 'avatars' jika belum ada dan set ke PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Policy Storage: Izinkan publik melihat/mengunduh avatar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_public_select'
  ) THEN
    CREATE POLICY avatars_public_select ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 7. Policy Storage: Izinkan upload file ke bucket avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_public_insert'
  ) THEN
    CREATE POLICY avatars_public_insert ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

-- 8. Policy Storage: Izinkan update/overwrite file di bucket avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_public_update'
  ) THEN
    CREATE POLICY avatars_public_update ON storage.objects
      FOR UPDATE
      TO anon, authenticated
      USING (bucket_id = 'avatars')
      WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

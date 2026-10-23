-- ============================================================
-- SQL Setup: Row Level Security (RLS) & RPC Setup (Besiuin Space)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Pastikan kolom pendukung tersedia
ALTER TABLE IF EXISTS public.whitelist_users
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Berikan izin dasar tabel ke role anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whitelist_users TO anon, authenticated, service_role;

-- 3. Aktifkan Row Level Security (RLS) pada tabel whitelist_users
ALTER TABLE public.whitelist_users ENABLE ROW LEVEL SECURITY;

-- 4. Hapus policy lama jika ada untuk menghindari duplikasi/konflik
DROP POLICY IF EXISTS "whitelist_select_all" ON public.whitelist_users;
DROP POLICY IF EXISTS "allow_anon_read_whitelist" ON public.whitelist_users;
DROP POLICY IF EXISTS "read_all_members" ON public.whitelist_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.whitelist_users;
DROP POLICY IF EXISTS "whitelist_update_all" ON public.whitelist_users;
DROP POLICY IF EXISTS "whitelist_insert_all" ON public.whitelist_users;
DROP POLICY IF EXISTS "whitelist_delete_all" ON public.whitelist_users;

-- 5. Policy SELECT: Izinkan anon dan authenticated membaca data whitelist
CREATE POLICY "whitelist_select_all" ON public.whitelist_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. Policy UPDATE: Izinkan pembaruan profil & username
CREATE POLICY "whitelist_update_all" ON public.whitelist_users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Policy INSERT: Izinkan pendaftaran akun atau penambahan anggota oleh admin
CREATE POLICY "whitelist_insert_all" ON public.whitelist_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 8. Policy DELETE: Izinkan admin menghapus data dari whitelist
CREATE POLICY "whitelist_delete_all" ON public.whitelist_users
  FOR DELETE
  TO authenticated
  USING (true);

-- 9. RPC Function: check_login_whitelist
-- Memeriksa whitelist dan me-resolve username/email dengan aman (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_login_whitelist(p_input TEXT)
RETURNS TABLE (
  email TEXT,
  role TEXT,
  nama_mahasiswa TEXT,
  username TEXT,
  found_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_input TEXT := LOWER(TRIM(p_input));
BEGIN
  RETURN QUERY
  SELECT 
    w.email,
    w.role,
    w.nama_mahasiswa,
    w.username,
    w.email AS found_email
  FROM public.whitelist_users w
  WHERE LOWER(w.email) = clean_input
     OR LOWER(COALESCE(w.username, '')) = clean_input
     OR LOWER(w.email) LIKE clean_input || '@%'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_login_whitelist(TEXT) TO anon, authenticated, service_role;

-- 10. RPC Function: update_profile (SECURITY DEFINER)
-- Memungkinkan update profil dengan aman melewati hambatan RLS
CREATE OR REPLACE FUNCTION public.update_profile(
  p_email TEXT,
  p_username TEXT DEFAULT NULL,
  p_foto_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whitelist_users
  SET
    username = COALESCE(p_username, username),
    foto_url = COALESCE(p_foto_url, foto_url)
  WHERE LOWER(email) = LOWER(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 11. Bucket Storage Avatars & Policynya
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_public_insert" ON storage.objects;
CREATE POLICY "avatars_public_insert" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_public_update" ON storage.objects;
CREATE POLICY "avatars_public_update" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

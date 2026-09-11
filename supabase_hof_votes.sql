-- ============================================================
-- SQL untuk Supabase: Vote per akun (Hall of Fame)
-- ============================================================

-- 1. Tabel votes (1 voter = 1 vote per kategori)
CREATE TABLE IF NOT EXISTS awards_votes (
  id BIGSERIAL PRIMARY KEY,
  voter_email TEXT NOT NULL,
  kandidat_id BIGINT NOT NULL REFERENCES awards_kandidat(id) ON DELETE CASCADE,
  kategori_id BIGINT NOT NULL REFERENCES awards_kategori(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Unique constraint: 1 email hanya bisa vote 1x per kategori
CREATE UNIQUE INDEX IF NOT EXISTS idx_awards_votes_unique
  ON awards_votes(voter_email, kategori_id);

-- 3. Enable RLS (sesuaikan policy dengan kebutuhan)
ALTER TABLE awards_votes ENABLE ROW LEVEL SECURITY;

-- 4. Policy: semua user yang login bisa insert/delete vote sendiri
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'awards_votes'
      AND policyname = 'votes_all'
  ) THEN
    CREATE POLICY votes_all ON awards_votes
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Policy untuk whitelist_users supaya user bisa baca profil semua anggota (Anggota page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whitelist_users'
      AND policyname = 'read_all_members'
  ) THEN
    CREATE POLICY read_all_members ON whitelist_users
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

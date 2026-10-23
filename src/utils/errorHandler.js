/**
 * Utilitas untuk sanitasi dan pemetaan pesan error database Supabase/PostgreSQL.
 * Mencegah kebocoran struktur tabel, nama kolom, atau constraint internal ke UI pengguna.
 */

export function getFriendlyErrorMessage(err, fallback = 'Terjadi kesalahan pada sistem. Silakan coba lagi.') {
  if (!err) return fallback

  // Catat detail teknis hanya di console lokal/developer
  console.error('[Database / API Error Detail]:', err)

  // Ambil kode error jika tersedia
  const code = err.code || err.status || ''
  const rawMsg = (err.message || '').toLowerCase()

  // 1. Error Hak Akses / RLS Violation
  if (code === '42501' || rawMsg.includes('permission denied') || rawMsg.includes('row-level security') || rawMsg.includes('policy')) {
    return 'Akses ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini.'
  }

  // 2. Error Duplikasi Data (Unique constraint)
  if (code === '23505' || rawMsg.includes('duplicate key') || rawMsg.includes('already exists') || rawMsg.includes('already registered')) {
    return 'Data ini sudah terdaftar di sistem. Gunakan data atau entitas lain.'
  }

  // 3. Error Relasi Foreign Key / Data Terikat
  if (code === '23503' || rawMsg.includes('violates foreign key constraint')) {
    return 'Tindakan tidak dapat diproses karena data masih terhubung dengan catatan lain.'
  }

  // 4. Error Tabel Belum Dibuat / Migrasi Belum Jalan
  if (code === '42P01' || rawMsg.includes('relation') && rawMsg.includes('does not exist')) {
    return 'Layanan basis data sedang dalam pemeliharaan. Silakan hubungi admin.'
  }

  // 5. Pesan Validasi Khusus Autentikasi yang Aman
  if (rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid credentials')) {
    return 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.'
  }

  if (rawMsg.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Silakan cek kotak masuk email kampus Anda.'
  }

  if (rawMsg.includes('password should be at least')) {
    return 'Kata sandi minimal harus terdiri dari 6 karakter.'
  }

  if (rawMsg.includes('rate limit') || rawMsg.includes('too many requests')) {
    return 'Terlalu banyak permintaan dalam waktu singkat. Harap tunggu beberapa saat.'
  }

  // Jika error adalah string kustom buatan aplikasi (bukan error internal DB)
  if (typeof err === 'string' && !err.includes('SQL') && !err.includes('relation')) {
    return err
  }

  // Kembalikan pesan fallback aman
  return fallback
}

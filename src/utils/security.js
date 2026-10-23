/**
 * Utilitas keamanan untuk validasi URL dan sanitasi query.
 */

/**
 * Memvalidasi dan memastikan skema URL hanya menggunakan http atau https.
 * Mencegah serangan Stored XSS via skema 'javascript:', 'data:', 'vbscript:', dll.
 * 
 * @param {string} url - URL mentah yang akan divalidasi
 * @returns {string|null} - URL yang aman, atau null jika tidak valid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Hanya izinkan protokol http:// atau https://
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Meng-escape karakter wildcard SQL LIKE/ILIKE (%, _, \)
 * Mencegah manipulasi pola query pada pencarian.
 * 
 * @param {string} input - Teks input mentah
 * @returns {string} - Teks dengan wildcard yang telah di-escape
 */
export function escapeLikeWildcards(input) {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[%_\\]/g, '\\$&')
}

import { supabase } from '../config/supabaseClient'
import { uploadToStorage } from './storage'

// Profil disimpan tiga lapis:
// 1. Supabase Storage (foto) + DB (username sebagai nama tampilan)
// 2. Database (whitelist_users.username + foto_url bila kolom tersedia)
// 3. localStorage per-email sebagai fallback/override cepat (foto selalu di sini)

const key = (email) => `besiuin_profile_${(email || '').toLowerCase()}`

export function loadLocalProfile(email) {
  try {
    return JSON.parse(localStorage.getItem(key(email))) || {}
  } catch {
    return {}
  }
}

export function saveLocalProfile(email, patch) {
  const next = { ...loadLocalProfile(email), ...patch }
  localStorage.setItem(key(email), JSON.stringify(next))
  return next
}

// Ambil profil gabungan: DB dulu, timpa dengan localStorage bila ada
export async function fetchProfile(email) {
  const local = loadLocalProfile(email)
  let username = local.username || null
  let foto = local.foto || null

  try {
    const { data, error } = await supabase
      .from('whitelist_users')
      .select('username, foto_url')
      .eq('email', (email || '').toLowerCase())
      .maybeSingle()

    if (!error && data) {
      if (!username) username = data.username || null
      if (!foto) foto = data.foto_url || null
    }
  } catch {
    // abaikan — pakai lokal
  }

  return { username, foto }
}

// Simpan username (nama profil): coba DB, gagal → lokal
export async function updateProfileUsername(email, username) {
  const emailLower = (email || '').toLowerCase()
  const cleanUsername = (username || '').toLowerCase().trim().replace(/\s/g, '')
  try {
    const { data, error } = await supabase
      .from('whitelist_users')
      .update({ username: cleanUsername })
      .eq('email', emailLower)
      .select()

    if (!error && data && data.length > 0) {
      saveLocalProfile(emailLower, { username: cleanUsername })
      return { ok: true, via: 'db' }
    }
    throw error || new Error('Tidak ada baris yang diperbarui (RLS).')
  } catch (err) {
    saveLocalProfile(emailLower, { username: cleanUsername })
    return { ok: true, via: 'local', note: err?.message }
  }
}

// Simpan foto: coba ke Supabase Storage dulu, baru DB & lokal fallback
export async function updateProfilePhoto(email, fotoDataUrl) {
  const emailLower = (email || '').toLowerCase()
  saveLocalProfile(emailLower, { foto: fotoDataUrl })

  let via = 'local'
  try {
    const fileName = `profiles/${emailLower.replace(/[@.]/g, '_')}_${Date.now()}.jpg`
    const publicUrl = await uploadToStorage('avatars', fotoDataUrl, fileName, 'image/jpeg')

    // Update DB juga dengan URL storage
    await supabase
      .from('whitelist_users')
      .update({ foto_url: publicUrl })
      .eq('email', emailLower)

    via = 'db'
    return { ok: true, via, url: publicUrl }
  } catch {
    // Storage/DB gagal — lokal sudah tersimpan di awal
  }
  return { ok: true, via }
}

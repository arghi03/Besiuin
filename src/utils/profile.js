import { supabase } from '../config/supabaseClient'
import { uploadToStorage } from './storage'

// Profil disimpan di Supabase Storage (foto) + DB (username & foto_url)
// Semua data tersimpan di server — tidak ada fallback localStorage.
// Menggunakan Supabase RPC (PostgreSQL Functions) untuk bypass RLS.

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim()
}

// Ambil profil dari database
export async function fetchProfile(email) {
  const emailLower = normalizeEmail(email)
  if (!emailLower) return { username: null, foto: null }

  try {
    const { data, error } = await supabase
      .from('whitelist_users')
      .select('username, foto_url')
      .eq('email', emailLower)
      .maybeSingle()

    if (error) throw error

    return {
      username: data?.username || null,
      foto: data?.foto_url || null,
    }
  } catch (err) {
    console.error('Error fetching profile:', err)
    return { username: null, foto: null }
  }
}

// Simpan username ke database via RPC (bypass RLS)
export async function updateProfileUsername(email, username) {
  const emailLower = normalizeEmail(email)
  if (!emailLower) throw new Error('Email tidak valid.')

  const cleanUsername = (username || '').toLowerCase().trim().replace(/\s/g, '')
  if (!cleanUsername) throw new Error('Username tidak boleh kosong.')

  try {
    const { error } = await supabase.rpc('update_profile', {
      p_email: emailLower,
      p_username: cleanUsername,
    })

    if (error) {
      console.error('updateProfileUsername RPC error:', error)
      // Kalau RPC tidak ada, coba direct update sebagai fallback
      const { error: directError } = await supabase
        .from('whitelist_users')
        .update({ username: cleanUsername })
        .eq('email', emailLower)

      if (directError) {
        throw new Error(
          directError.code === '42501'
            ? 'Gagal menyimpan: hak akses ditolak. Pastikan SQL migration sudah di-run di Supabase.'
            : (directError.message || 'Gagal menyimpan username.')
        )
      }
    }

    return { ok: true, username: cleanUsername }
  } catch (err) {
    throw err
  }
}

// Simpan foto ke Supabase Storage dan update database via RPC (bypass RLS)
export async function updateProfilePhoto(email, fotoDataUrl) {
  const emailLower = normalizeEmail(email)
  if (!emailLower) throw new Error('Email tidak valid.')

  let publicUrl = null

  try {
    // Upload ke Supabase Storage
    const fileName = `profiles/${emailLower.replace(/[@.]/g, '_')}_${Date.now()}.jpg`
    publicUrl = await uploadToStorage('avatars', fotoDataUrl, fileName, 'image/jpeg')
  } catch (storageErr) {
    console.error('Storage upload error:', storageErr)
    throw new Error(
      storageErr.message?.includes('policy') || storageErr.message?.includes('row-level')
        ? 'Gagal upload foto: RLS Storage menolak. Pastikan bucket "avatars" sudah public dan ada policy upload untuk authenticated users di Supabase Dashboard.'
        : (storageErr.message || 'Gagal upload foto ke server.')
    )
  }

  // Update DB via RPC (bypass RLS)
  try {
    const { error } = await supabase.rpc('update_profile', {
      p_email: emailLower,
      p_foto_url: publicUrl,
    })

    if (error) {
      console.error('updateProfilePhoto RPC error:', error)
      // Fallback direct update
      const { error: directError } = await supabase
        .from('whitelist_users')
        .update({ foto_url: publicUrl })
        .eq('email', emailLower)

      if (directError) {
        throw new Error(
          directError.code === '42501'
            ? 'Gagal menyimpan URL foto: hak akses ditolak. Pastikan SQL migration sudah di-run di Supabase.'
            : (directError.message || 'Gagal memperbarui foto di database.')
        )
      }
    }

    return { ok: true, url: publicUrl }
  } catch (err) {
    throw err
  }
}

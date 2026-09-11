import { supabase } from '../config/supabaseClient'

// Upload file ke Supabase Storage dan kembalikan public URL.
// Kalau bucket belum ada / gagal, lempar error agar caller fallback ke base64 lokal.
export async function uploadToStorage(bucket, fileOrDataUrl, fileName, contentType = 'image/jpeg') {
  if (!fileOrDataUrl) throw new Error('Tidak ada file untuk diupload.')

  let blob, finalFileName, finalContentType

  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    // Data URL → Blob
    const res = await fetch(fileOrDataUrl)
    blob = await res.blob()
    finalFileName = fileName || `${Date.now()}.jpg`
    finalContentType = contentType
  } else if (fileOrDataUrl instanceof File) {
    blob = fileOrDataUrl
    finalFileName = fileName || `${Date.now()}_${fileOrDataUrl.name}`
    finalContentType = fileOrDataUrl.type || contentType
  } else {
    throw new Error('Format file tidak dikenali.')
  }

  const { error: uploadError } = await supabase
    .storage
    .from(bucket)
    .upload(finalFileName, blob, { contentType: finalContentType, upsert: true })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(finalFileName)

  if (!publicUrlData?.publicUrl) throw new Error('Gagal mendapatkan public URL.')

  return publicUrlData.publicUrl
}

// Hapus file dari Supabase Storage (opsional, untuk ganti/update foto)
export async function removeFromStorage(bucket, fileName) {
  if (!fileName) return
  await supabase.storage.from(bucket).remove([fileName])
}

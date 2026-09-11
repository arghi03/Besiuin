// Kompresi gambar di sisi klien sebelum disimpan (data URL) atau diupload.
// Menghindari file raksasa masuk ke database / localStorage.

export async function compressImage(file, { maxWidth = 900, quality = 0.72, mimeType = 'image/jpeg' } = {}) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('File bukan gambar.')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Ukuran gambar terlalu besar (maks 15 MB).')
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gagal memuat gambar.'))
    image.src = dataUrl
  })

  const scale = Math.min(1, maxWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))

  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // JPEG tidak mendukung transparansi — isi latar putih dulu
  if (mimeType === 'image/jpeg' && file.type === 'image/png') {
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#11141c'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return canvas.toDataURL(mimeType, quality)
}

// Versi kotak (avatar) — crop tengah lalu kompres
export async function compressAvatar(file, { size = 320, quality = 0.8 } = {}) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('File bukan gambar.')
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gagal memuat gambar.'))
    image.src = dataUrl
  })

  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL('image/jpeg', quality)
}

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { compressImage } from '../utils/image'
import { uploadToStorage } from '../utils/storage'

export default function GalleryPage({ onBack, userRole }) {
  const [gallery, setGallery] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Gallery Form State
  const [judulMomen, setJudulMomen] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [fotoData, setFotoData] = useState(null) // data URL hasil kompresi
  const [fotoFileName, setFotoFileName] = useState('')
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [semester, setSemester] = useState('1')
  const [submittingGallery, setSubmittingGallery] = useState(false)
  const fileInputRef = useRef(null)

  // Gallery Filter State
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('All')

  // Modal State
  const [modalItem, setModalItem] = useState(null)

  // Fetch gallery on mount
  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)

      const { data: galleryData, error: galleryError } = await supabase
        .from('class_gallery')
        .select('*')
        .order('created_at', { ascending: false })

      if (galleryError && galleryError.code === '42P01') {
        console.warn("Class gallery table does not exist in Supabase. Using mock data.")
        setStatusMessage({
          type: 'warning',
          text: 'Tabel "class_gallery" belum terdeteksi di database. Menggunakan data simulasi lokal untuk preview.'
        })
        setGallery([])
      } else {
        if (galleryError) throw galleryError
        setGallery(galleryData || [])
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setProcessingPhoto(true)
      setStatusMessage(null)
      const dataUrl = await compressImage(file, { maxWidth: 1000, quality: 0.75 })
      setFotoData(dataUrl)
      setFotoFileName(file.name)
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memproses foto.' })
    } finally {
      setProcessingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Create new gallery item
  const handleCreateGallery = async (e) => {
    e.preventDefault()
    if (!judulMomen.trim() || !deskripsi.trim() || !fotoData) {
      setStatusMessage({ type: 'error', text: 'Judul, deskripsi, dan foto wajib diisi!' })
      return
    }

    try {
      setSubmittingGallery(true)
      setStatusMessage(null)

      // Upload foto ke Supabase Storage
      let fotoUrl = fotoData
      try {
        const fileName = `gallery/${Date.now()}_${(fotoFileName || 'photo').replace(/\s+/g, '_')}.jpg`
        fotoUrl = await uploadToStorage('gallery', fotoData, fileName, 'image/jpeg')
      } catch (uploadErr) {
        console.warn('Storage upload gagal, fallback ke base64:', uploadErr.message)
      }

      const newMoment = {
        judul_momen: judulMomen.trim(),
        deskripsi: deskripsi.trim(),
        foto_url: fotoUrl,
        semester: semester
      }

      const { error } = await supabase
        .from('class_gallery')
        .insert([newMoment])

      if (error) {
        if (error.code === '42P01') {
          // Local simulate preview
          const mockNew = {
            id: Date.now(),
            ...newMoment,
            created_at: new Date().toISOString()
          }
          setGallery(prev => [mockNew, ...prev])
          setStatusMessage({
            type: 'warning',
            text: 'Momen ditambahkan ke preview lokal (Tabel "class_gallery" belum dibuat di database).'
          })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: 'Momen kenangan berhasil ditambahkan!' })
        await fetchGallery()
      }

      // Reset
      setJudulMomen('')
      setDeskripsi('')
      setFotoData(null)
      setFotoFileName('')
      setSemester('1')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan momen: ${err.message}` })
    } finally {
      setSubmittingGallery(false)
    }
  }

  // Filter gallery items
  const handleDeleteGallery = async (id) => {
    if (!confirm('Hapus momen ini?')) return
    try {
      setStatusMessage(null)
      const { error } = await supabase.from('class_gallery').delete().eq('id', id)
      if (error) throw error
      setGallery(prev => prev.filter(g => g.id !== id))
      setStatusMessage({ type: 'success', text: 'Momen berhasil dihapus.' })
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menghapus: ${err.message}` })
    }
  }

  const filteredGallery = selectedSemesterFilter === 'All'
    ? gallery
    : gallery.filter(item => item.semester.toString() === selectedSemesterFilter)

  const labelCls = "block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5"
  const inputCls = "w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-zinc-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-maroon-700"></span>
              <span>Arsip Visual Kelas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Galeri <span className="text-maroon-600">Kenangan</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Dokumentasi momen kebersamaan kelas Sistem Informasi.
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-500">{filteredGallery.length} foto</span>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`px-4 py-3 rounded border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono ${
            statusMessage.type === 'success'
              ? 'bg-[#10231b] border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              : 'bg-maroon-950/60 border-maroon-800 text-rose-300'
          }`}>
            <span className="leading-relaxed">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer shrink-0">
              Tutup ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Form tambah momen */}
          <section className="lg:col-span-4">
            <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 lg:sticky lg:top-24">
              <div className="mb-4 pb-3 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-maroon-600">add_photo_alternate</span>
                  Tambah Momen
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Bagikan momen kebersamaan kelas — langsung upload foto.
                </p>
              </div>

              <form onSubmit={handleCreateGallery} className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>Judul Momen</label>
                  <input
                    type="text"
                    value={judulMomen}
                    onChange={(e) => setJudulMomen(e.target.value)}
                    placeholder="Contoh: Makrab Kebersamaan"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                {/* Upload foto langsung */}
                <div>
                  <label className={labelCls}>Foto Momen</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFile}
                    className="hidden"
                  />

                  {fotoData ? (
                    <div className="relative rounded border border-white/10 overflow-hidden group">
                      <img src={fotoData} alt="Preview" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[10px] cursor-pointer"
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFotoData(null); setFotoFileName('') }}
                          className="px-3 py-1.5 rounded bg-maroon-900/80 border border-maroon-700 text-rose-200 font-mono text-[10px] cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-[#0b0e14]/85 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded max-w-[80%] truncate">
                        {fotoFileName}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingPhoto}
                      className="w-full border border-dashed border-white/15 hover:border-maroon-700 rounded py-6 flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {processingPhoto ? 'hourglass_top' : 'upload_file'}
                      </span>
                      <span className="font-mono text-[11px]">
                        {processingPhoto ? 'Memproses foto…' : 'Klik untuk pilih foto'}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600">JPG / PNG, otomatis dikompresi</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Deskripsi</label>
                  <textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Ceritakan singkat keseruan momen ini…"
                    rows="3"
                    className={`${inputCls} resize-none leading-relaxed`}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submittingGallery || processingPhoto}
                  className="w-full py-2.5 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  {submittingGallery ? 'Menyimpan…' : 'Simpan Momen'}
                </button>
              </form>
            </div>
          </section>

          {/* Grid galeri */}
          <section className="lg:col-span-8">

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs mb-6">
              {['All', '1', '2', '3', '4', '5'].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemesterFilter(sem)}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                    selectedSemesterFilter === sem
                      ? 'bg-maroon-800 text-white font-semibold shadow-sm'
                      : 'bg-[#161a24] text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {sem === 'All' ? 'Semua' : `Sem. ${sem}`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
                Memuat galeri…
              </div>
            ) : filteredGallery.length === 0 ? (
              <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center">
                <span className="material-symbols-outlined text-3xl text-zinc-600 block mb-2">photo_library</span>
                <p className="text-zinc-400 font-mono text-xs">Belum ada momen untuk filter ini.</p>
                <p className="text-zinc-500 font-mono text-[11px] mt-1">Bagikan momen pertama lewat panel di samping.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredGallery.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => setModalItem(item)}
                    className="bg-[#11141c]/90 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors group cursor-pointer"
                  >
                    <div className="relative h-44 bg-[#0b0e14] overflow-hidden">
                      <img
                        src={item.foto_url}
                        alt={item.judul_momen}
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <span className="absolute top-2.5 left-2.5 bg-[#0b0e14]/85 border border-white/10 text-zinc-200 font-mono text-[10px] px-2 py-0.5 rounded">
                        Sem. {item.semester}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-1.5">
                      <h3 className="text-sm font-semibold text-white leading-snug">{item.judul_momen}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{item.deskripsi}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                        <p className="font-mono text-[10px] text-zinc-500">
                          {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {(userRole === 'owner' || userRole === 'admin') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteGallery(item.id) }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-maroon-950/60 border border-maroon-800/60 text-rose-300 hover:bg-maroon-900 hover:border-maroon-700 transition-colors cursor-pointer font-mono text-[10px]"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>

      </main>

      {/* MODAL PREVIEW FOTO */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setModalItem(null)}
        >
          <div
            className="relative bg-[#11141c] border border-white/10 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white truncate pr-4">{modalItem.judul_momen}</h3>
              <button
                onClick={() => setModalItem(null)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <img
                src={modalItem.foto_url}
                alt={modalItem.judul_momen}
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
            <div className="px-5 py-4 border-t border-white/10 space-y-2">
              <p className="text-sm text-white font-medium">{modalItem.judul_momen}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{modalItem.deskripsi}</p>
              <p className="font-mono text-[10px] text-zinc-500">
                Semester {modalItem.semester} • {new Date(modalItem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-10 w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Galeri Kenangan Kelas Sistem Informasi
      </footer>
    </div>
  )
}

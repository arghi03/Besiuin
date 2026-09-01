import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function GalleryPage({ onBack }) {
  const [gallery, setGallery] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Gallery Form State
  const [judulMomen, setJudulMomen] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [semester, setSemester] = useState('1')
  const [submittingGallery, setSubmittingGallery] = useState(false)

  // Gallery Filter State
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('All')

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

        // Mock gallery
        setGallery([
          {
            id: 1,
            judul_momen: "Buka Bersama Angkatan",
            deskripsi: "Momen hangat buka bersama keluarga besar Sistem Informasi kelas B di awal ramadhan.",
            foto_url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60",
            semester: "1",
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            judul_momen: "Makrab Kebersamaan",
            deskripsi: "Malam keakraban di Kaliurang untuk menjalin persaudaraan antar mahasiswa kelas B.",
            foto_url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=60",
            semester: "2",
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            judul_momen: "Praktikum Basis Data Terakhir",
            deskripsi: "Sesi foto bersama asisten laboratorium setelah menyelesaikan final project.",
            foto_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=60",
            semester: "3",
            created_at: new Date().toISOString()
          }
        ])
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

  // Create new gallery item
  const handleCreateGallery = async (e) => {
    e.preventDefault()
    if (!judulMomen.trim() || !deskripsi.trim() || !fotoUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Semua kolom wajib diisi!' })
      return
    }

    try {
      setSubmittingGallery(true)
      setStatusMessage(null)

      const newMoment = {
        judul_momen: judulMomen.trim(),
        deskripsi: deskripsi.trim(),
        foto_url: fotoUrl.trim(),
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
      setFotoUrl('')
      setSemester('1')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan momen: ${err.message}` })
    } finally {
      setSubmittingGallery(false)
    }
  }

  // Filter gallery items
  const filteredGallery = selectedSemesterFilter === 'All'
    ? gallery
    : gallery.filter(item => item.semester.toString() === selectedSemesterFilter)

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col justify-between selection:bg-brand-maroon selection:text-white relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-brand-navy/35 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[45%] bg-brand-maroon/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/5 bg-brand-dark/60 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button 
                onClick={onBack} 
                className="mr-2 p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white font-bold"
              >
                ← Hub
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-maroon to-red-900 flex items-center justify-center font-bold text-white text-lg shadow-lg">
              📸
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">Galeri Kenangan</h1>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Space
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Status Alert Notification */}
        {statusMessage && (
          <div className="lg:col-span-12 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs">
              <span className="font-bold text-brand-maroon-light">
                {statusMessage.type === 'success' ? '✓ Sukses: ' : statusMessage.type === 'warning' ? '⚠ Notifikasi: ' : '✗ Kesalahan: '}
              </span>
              <span className="text-slate-300 leading-relaxed">{statusMessage.text}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)}
              className="text-slate-500 hover:text-white text-xs font-bold font-mono cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Left Side: Create Memory Form */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <div className="border-b border-white/5 pb-4 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-5 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                Tambah Momen Kenangan
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Bagikan momen kebersamaan kelas, dari foto makrab hingga sesi kelas seru.
              </p>
            </div>

            <form onSubmit={handleCreateGallery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Judul Momen
                </label>
                <input
                  type="text"
                  value={judulMomen}
                  onChange={(e) => setJudulMomen(e.target.value)}
                  placeholder="Contoh: Makrab Kebersamaan Kaliurang"
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Pilih Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  URL Foto / Gambar
                </label>
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Deskripsi Momen
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Tulis deskripsi singkat tentang keseruan di momen ini..."
                  rows="3"
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none resize-none text-white"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingGallery}
                className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {submittingGallery ? 'Menyimpan...' : 'Simpan Momen'}
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: Photo Gallery Grid */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Semester Filter Bar */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="h-6 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                Momen Galeri Foto
              </h2>
              <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-bold">
                {filteredGallery.length} Foto
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', '1', '2', '3', '4'].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemesterFilter(sem)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedSemesterFilter === sem
                      ? 'bg-brand-maroon border-brand-maroon text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {sem === 'All' ? 'Semua Semester' : `Semester ${sem}`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 mt-2">Memuat foto...</p>
            </div>
          ) : filteredGallery.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-2">
              <p className="text-slate-400 text-sm">Tidak ada foto kenangan untuk filter ini.</p>
              <p className="text-xs text-slate-500">Anda dapat membagikan momen pertama di panel kiri!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredGallery.map((item) => (
                <article
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-maroon/30 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between group shadow-lg"
                >
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <img 
                      src={item.foto_url} 
                      alt={item.judul_momen}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=60';
                      }}
                    />
                    <span className="absolute bottom-3 left-3 bg-brand-maroon text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow">
                      Semester {item.semester}
                    </span>
                  </div>

                  {/* Content Container */}
                  <div className="p-5 flex-grow flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-white text-base leading-snug font-serif truncate">
                        {item.judul_momen}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {item.deskripsi}
                      </p>
                    </div>

                    <time className="text-[10px] text-slate-500 font-mono block text-right border-t border-white/5 pt-3">
                      Dibagikan: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-brand-dark/80 py-8 text-center text-xs text-slate-500 mt-12">
        <p>© 2026 Besiuin (Sistem Informasi UIN). All rights reserved.</p>
      </footer>
    </div>
  )
}

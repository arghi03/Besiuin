import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function QuotesPage({ userRole }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')

  // New quote form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [authorText, setAuthorText] = useState('')
  const [contextText, setContextText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categories = ['Semua', 'Dosen', 'Mahasiswa', 'Motivasi', 'Lucu', 'YTTA']

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          // Mock data
          setQuotes([
            { id: 1, quote: "AI TIDAK PUNYA MEMORI", author: "Shidiqi", context: "YTTA", likes: 24 },
            { id: 2, quote: "Kalo bisa dikerjain H-1 kenapa harus H-7?", author: "Anonymous", context: "Lucu", likes: 18 },
            { id: 3, quote: "Metopen itu simpel, yang ribet itu milih judulnya.", author: "Dosen Metopen", context: "Dosen", likes: 31 },
            { id: 4, quote: "Error is just a feature waiting for documentation.", author: "Anak Web", context: "Motivasi", likes: 12 },
          ])
        } else {
          throw error
        }
      } else {
        setQuotes(data || [])
      }
    } catch (err) {
      console.error('Error fetching quotes:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (id, currentLikes = 0) => {
    try {
      const newLikes = currentLikes + 1
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, likes: newLikes } : q))
      
      await supabase.from('quotes').update({ likes: newLikes }).eq('id', id)
    } catch (err) {
      console.error('Error updating likes:', err)
    }
  }

  const handleAddQuote = async (e) => {
    e.preventDefault()
    if (!quoteText.trim() || !authorText.trim()) {
      alert("Kutipan dan Nama Tokoh wajib diisi!")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        quote: quoteText.trim(),
        author: authorText.trim(),
        context: contextText.trim() || 'Umum',
        likes: 0
      }

      const { error } = await supabase.from('quotes').insert([payload])

      if (error && error.code === '42P01') {
        setQuotes(prev => [{ id: Date.now(), ...payload }, ...prev])
      } else {
        await fetchQuotes()
      }

      setQuoteText('')
      setAuthorText('')
      setContextText('')
      setIsModalOpen(false)
    } catch (err) {
      alert(`Gagal menambah quote: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteQuote = async (id) => {
    if (!confirm('Hapus quote ini?')) return
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
      setQuotes(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      alert(`Gagal menghapus quote: ${err.message}`)
    }
  }

  const filteredQuotes = quotes.filter(q => {
    const matchesCategory = selectedCategory === 'Semua' || q.context === selectedCategory
    const matchesSearch = q.quote.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.author.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>


      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-zinc-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-maroon-700"></span>
              <span>Dinding Kutipan Legendaris</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Quotes Wall <span className="text-maroon-600">Besiuin Space</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Kumpulan kata-kata paling memorable, lucu, dan inspiratif dari perkuliahan.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-center"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            <span>Tulis Quote Baru</span>
          </button>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#11141c]/90 p-4 rounded-lg border border-white/10">
          
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-maroon-800 text-white font-semibold shadow-sm'
                    : 'bg-[#161a24] text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-zinc-500">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kutipan / tokoh..."
              className="w-full bg-[#0b0e14] border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
            />
          </div>

        </div>

        {/* QUOTES GRID */}
        {loading ? (
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
            Memuat kutipan...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuotes.map((q) => (
              <div key={q.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg p-6 flex flex-col justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-maroon-600 text-2xl shrink-0">format_quote</span>
                  <div>
                    <p className="text-base sm:text-lg font-semibold font-mono text-white tracking-tight leading-snug">
                      “{q.quote}”
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-medium">{q.author}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase text-zinc-400">
                      {q.context || 'Umum'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(q.id, q.likes)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161a24] hover:bg-[#1d2330] border border-white/10 hover:border-maroon-700 text-zinc-300 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs text-rose-400">favorite</span>
                      <span>{q.likes || 0}</span>
                    </button>
                    {(userRole === 'owner' || userRole === 'admin') && (
                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-maroon-950/60 border border-maroon-800/60 text-rose-300 hover:bg-maroon-900 hover:border-maroon-700 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredQuotes.length === 0 && (
              <div className="md:col-span-2 bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
                Tidak ada kutipan ditemukan untuk kategori ini.
              </div>
            )}
          </div>
        )}

      </main>

      {/* NEW QUOTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#11141c] border border-white/10 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-white font-mono uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-maroon-600">format_quote</span>
                Tulis Quote Baru
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddQuote} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Kutipan / Kata-kata *</label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Contoh: AI TIDAK PUNYA MEMORI..."
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700 resize-none"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Nama Tokoh / Pengucap *</label>
                <input
                  type="text"
                  value={authorText}
                  onChange={(e) => setAuthorText(e.target.value)}
                  placeholder="Contoh: Pak Syopian / Rajif"
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Kategori / Konteks</label>
                <select
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                >
                  {categories.filter(c => c !== 'Semua').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded bg-maroon-800 text-white font-medium hover:bg-maroon-700"
                >
                  {submitting ? 'Menyimpan...' : 'Bagikan Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 relative z-10 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Quotes Wall Kelas Sistem Informasi
      </footer>
    </div>
  )
}

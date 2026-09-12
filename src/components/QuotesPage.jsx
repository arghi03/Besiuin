import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabaseClient'

export default function QuotesPage({ userRole }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [userEmail, setUserEmail] = useState('')

  // New quote form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [authorText, setAuthorText] = useState('')
  const [contextText, setContextText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categories = ['Semua', 'Dosen', 'Mahasiswa', 'Motivasi', 'Lucu', 'YTTA']

  const getUserEmail = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email?.toLowerCase() || ''
    setUserEmail(email)
    return email
  }, [])

  useEffect(() => {
    const init = async () => {
      await getUserEmail()
      await fetchQuotes(true) // true = show loading
    }
    init()

    // Realtime untuk likes
    const channel = supabase
      .channel('realtime-quotes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_likes' }, () => {
        fetchQuotes(false) // false = silent update, no loading
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => {
        fetchQuotes(false)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchQuotes = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      // Fetch quotes + count likes via quote_likes (single query pakai foreign key count)
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (quotesError) {
        if (quotesError.code === '42P01') {
          setQuotes([
            { id: 1, quote: "AI TIDAK PUNYA MEMORI", author: "Shidiqi", context: "YTTA", likes: 24, likedByMe: false },
            { id: 2, quote: "Kalo bisa dikerjain H-1 kenapa harus H-7?", author: "Anonymous", context: "Lucu", likes: 18, likedByMe: false },
            { id: 3, quote: "Metopen itu simpel, yang ribet itu milih judulnya.", author: "Dosen Metopen", context: "Dosen", likes: 31, likedByMe: false },
            { id: 4, quote: "Error is just a feature waiting for documentation.", author: "Anak Web", context: "Motivasi", likes: 12, likedByMe: false },
          ])
          return
        }
        throw quotesError
      }

      // Ambil semua likes untuk hitung count + likedByMe
      const email = userEmail || (await getUserEmail())
      const { data: likesData } = await supabase
        .from('quote_likes')
        .select('quote_id, voter_email')

      const likesMap = {}
      const myLikesSet = new Set()
      if (likesData) {
        for (const like of likesData) {
          likesMap[like.quote_id] = (likesMap[like.quote_id] || 0) + 1
          if (email && like.voter_email === email) {
            myLikesSet.add(like.quote_id)
          }
        }
      }

      let enriched = (quotesData || []).map(q => ({
        ...q,
        likes: likesMap[q.id] || 0,
        likedByMe: myLikesSet.has(q.id),
      }))

      // Sort: paling banyak likes di atas
      enriched.sort((a, b) => b.likes - a.likes)

      setQuotes(enriched)
    } catch (err) {
      console.error('Error fetching quotes:', err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleLike = async (id) => {
    try {
      const email = userEmail || (await getUserEmail())
      if (!email) {
        alert('Harap login terlebih dahulu.')
        return
      }

      // Optimistic update: langsung toggle likedByMe & likes count di UI
      const wasLiked = quotes.find(q => q.id === id)?.likedByMe || false
      setQuotes(prev => prev.map(q => {
        if (q.id !== id) return q
        return {
          ...q,
          likedByMe: !q.likedByMe,
          likes: (q.likes || 0) + (q.likedByMe ? -1 : 1),
        }
      }))

      // Pakai RPC toggle_quote_like (bypass RLS + atomic toggle)
      const { error } = await supabase.rpc('toggle_quote_like', {
        p_quote_id: id,
        p_voter_email: email,
      })

      if (error) {
        // Kalau RPC gagal, rollback optimistic
        console.error('RPC toggle_quote_like error:', error)
        // Rollback
        setQuotes(prev => prev.map(q => {
          if (q.id !== id) return q
          return {
            ...q,
            likedByMe: wasLiked,
            likes: (q.likes || 0) + (wasLiked ? 0 : -1),
          }
        }))

        // Fallback ke direct query kalau RPC belum ada
        if (error.message?.includes('function') || error.message?.includes('toggle_quote_like')) {
          console.warn('RPC toggle_quote_like belum tersedia, pakai direct query...')

          if (wasLiked) {
            // Unlike
            await supabase.from('quote_likes').delete().eq('quote_id', id).eq('voter_email', email)
          } else {
            // Like baru
            await supabase.from('quote_likes').insert([{ quote_id: id, voter_email: email }])
          }
          await fetchQuotes(false)
        } else {
          throw error
        }
      }

      // Jangan await fetchQuotes di sini karena realtime sudah handle update
      // Kalau realtime tidak aktif, lakukan silent refresh
      // await fetchQuotes(false)
    } catch (err) {
      console.error('Error liking quote:', err)
      alert(err.message || 'Gagal memproses like. Pastikan SQL migration sudah di-run di Supabase.')
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
      }

      const { error } = await supabase.from('quotes').insert([payload])

      if (error && error.code === '42P01') {
        setQuotes(prev => [{ id: Date.now(), ...payload, likes: 0, likedByMe: false }, ...prev])
      } else {
        await fetchQuotes(false)
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
      // Hapus likes dulu
      await supabase.from('quote_likes').delete().eq('quote_id', id)
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
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-maroon-800 text-white font-medium'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="material-symbols-outlined text-zinc-500 text-base">search</span>
            <input
              type="text"
              placeholder="Cari quote atau tokoh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 md:w-64 bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
            />
          </div>
        </div>

        {/* QUOTE CARDS */}
        {loading ? (
          <div className="text-center py-16 text-zinc-500 font-mono text-xs animate-pulse">
            <span className="material-symbols-outlined text-4xl mb-2 block">hourglass_top</span>
            Memuat quotes...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-16 bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg">
            <span className="material-symbols-outlined text-4xl text-zinc-600 mb-3 block">sentiment_dissatisfied</span>
            <p className="text-zinc-400 text-sm">Belum ada quote untuk kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotes.map((q) => (
              <div
                key={q.id}
                className="group bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col hover:border-white/20 transition-all hover:-translate-y-0.5"
              >
                {/* QUOTE */}
                <div className="flex-1">
                  <p className="text-lg font-medium text-white leading-relaxed mb-4">
                    &ldquo;{q.quote}&rdquo;
                  </p>
                </div>

                {/* FOOTER */}
                <div className="flex items-end justify-between gap-3 mt-auto pt-4 border-t border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-maroon-500">{q.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                        {q.context}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleLike(q.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all cursor-pointer group/like ${
                        q.likedByMe
                          ? 'bg-rose-950/40 border-rose-500/40 hover:bg-rose-900/50'
                          : 'bg-white/5 hover:bg-maroon-900/40 border-white/10 hover:border-maroon-700'
                      }`}
                      title={q.likedByMe ? 'Batalkan like' : 'Like'}
                    >
                      <span className={`material-symbols-outlined text-base transition-colors ${
                        q.likedByMe ? 'text-rose-400 fill-rose-400' : 'text-rose-400 group-hover/like:text-rose-300'
                      }`}>
                        {q.likedByMe ? 'favorite' : 'favorite_border'}
                      </span>
                      <span className={`text-xs font-mono min-w-[1rem] text-right transition-colors ${
                        q.likedByMe ? 'text-rose-300' : 'text-zinc-400 group-hover/like:text-rose-300'
                      }`}>
                        {q.likes || 0}
                      </span>
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        className="ml-1 p-1.5 rounded hover:bg-maroon-950/60 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL TAMBAH QUOTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#11141c] border border-white/10 rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4 fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-maroon-600 text-sm">edit_note</span>
                Quote Baru
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddQuote} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Kutipan</label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Tuliskan kata-kata legendaris..."
                  className="w-full h-32 bg-[#0b0e14] border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-maroon-700 transition-colors resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Nama Tokoh</label>
                <input
                  type="text"
                  value={authorText}
                  onChange={(e) => setAuthorText(e.target.value)}
                  placeholder="Siapa yang mengucapkan?"
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Konteks</label>
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

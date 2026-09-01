import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function QuotesPage({ onBack }) {
  const [quotes, setQuotes] = useState([])
  const [quoteText, setQuoteText] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [realtimeActive, setRealtimeActive] = useState(false)

  // Fetch initial quotes and setup real-time subscription
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          if (error.code === '42P01') { // Tabel belum ada di database
            console.warn("Table 'quotes' does not exist in Supabase yet.")
            setStatusMessage({
              type: 'warning',
              text: 'Tabel "quotes" belum dibuat di Supabase. Silakan hubungi admin untuk melakukan migrasi skema database.'
            })
            // Mock data untuk preview UI
            setQuotes([
              {
                id: 1,
                quote: "Belajarlah sampai ke negeri Cina, tapi jangan lupa pulang untuk membangun UIN.",
                author: "Bapak Dekan",
                context: "Kuliah Umum Semester Ganjil",
                created_at: new Date().toISOString()
              },
              {
                id: 2,
                quote: "Koding itu seperti shalat, harus khusyuk dan tertib baris-berbaris (indentasi).",
                author: "Dosen Pemrograman",
                context: "Praktikum Web Dasar",
                created_at: new Date(Date.now() - 3600000).toISOString()
              }
            ])
          } else {
            throw error
          }
        } else {
          setQuotes(data || [])
        }
      } catch (err) {
        setStatusMessage({ type: 'error', text: `Gagal memuat quotes: ${err.message}` })
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()

    // Subskripsi postgres_changes untuk pembaruan real-time
    const channel = supabase
      .channel('realtime-quotes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes' },
        (payload) => {
          setRealtimeActive(true)
          if (payload.eventType === 'INSERT') {
            setQuotes((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setQuotes((prev) => prev.filter((q) => q.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setQuotes((prev) =>
              prev.map((q) => (q.id === payload.new.id ? payload.new : q))
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Mengirim quote baru ke database
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quoteText.trim()) {
      setStatusMessage({ type: 'error', text: 'Quote wajib diisi!' })
      return
    }

    try {
      setSubmitting(true)
      setStatusMessage(null)

      const newQuote = {
        quote: quoteText,
        author: 'Anonymous',
        context: context.trim() || 'Tanpa konteks',
      }

      const { data, error } = await supabase
        .from('quotes')
        .insert([newQuote])
        .select()

      if (error) {
        if (error.code === '42P01') {
          // Preview lokal jika tabel belum siap
          const mockNewQuote = {
            id: Date.now(),
            ...newQuote,
            created_at: new Date().toISOString()
          }
          setQuotes((prev) => [mockNewQuote, ...prev])
          setStatusMessage({
            type: 'warning',
            text: 'Quote ditambahkan ke preview lokal (Tabel "quotes" belum terbuat di database Supabase).'
          })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: 'Quote berhasil dibagikan!' })
      }

      setQuoteText('')
      setContext('')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memposting: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (isoString) => {
    const options = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' }
    return new Date(isoString).toLocaleDateString('id-ID', options)
  }

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col justify-between selection:bg-brand-maroon selection:text-white relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-maroon/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-navy/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/5 bg-brand-dark/60 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button 
                onClick={onBack} 
                className="mr-2 p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
                title="Kembali ke Dashboard"
              >
                ← Hub
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-maroon to-red-900 flex items-center justify-center font-bold text-white text-lg shadow-lg">
              Q
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">Quotes Wall</h1>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Space
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-slate-400 font-mono text-[11px]">
                {realtimeActive ? 'Real-time Listening' : 'Real-time Offline'}
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Kolom Kiri: Form Input */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
            <div className="border-b border-white/5 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="h-6 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                Bagikan Quote Hari Ini
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tulis kata-kata mutiara, candaan kelas, atau kutipan dosen terfavorit Anda.
              </p>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs mb-6 border ${
                statusMessage.type === 'success' ? 'bg-emerald-950/45 border-emerald-800 text-emerald-300' :
                statusMessage.type === 'warning' ? 'bg-amber-950/45 border-amber-800 text-amber-300' :
                'bg-rose-950/45 border-rose-800 text-rose-300'
              }`}>
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  {statusMessage.type === 'success' && '✓ Sukses:'}
                  {statusMessage.type === 'warning' && '⚠ Informasi:'}
                  {statusMessage.type === 'error' && '✗ Kesalahan:'}
                </div>
                <p className="leading-relaxed">{statusMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Isi Quote
                </label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="&ldquo;Ketik kutipan menarik di sini...&rdquo;"
                  rows="4"
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm focus:border-brand-maroon focus:bg-brand-dark focus:outline-none transition-all resize-none text-white"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Tokoh
                  </label>
                  <input
                    type="text"
                    value="Anonymous"
                    disabled
                    className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Konteks <span className="text-slate-500 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Misal: Kuliah Basis Data"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm focus:border-brand-maroon focus:bg-brand-dark focus:outline-none transition-all text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-maroon/20 hover:shadow-brand-maroon/30 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin text-xs">↻</span>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Bagikan Quote</span>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Kolom Kanan: Daftar Quotes Terkini */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="h-6 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
              Kutipan Terkini
            </h2>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-bold">
              {quotes.length} Total
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20 space-y-4">
              <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
              <p className="text-sm text-slate-500">Memuat quotes secara real-time...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center shadow-sm space-y-3">
              <div className="text-4xl">✍</div>
              <h3 className="font-bold text-white">Belum ada quote</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Jadilah orang pertama yang menuliskan kata-kata legendaris hari ini di sistem kelas Besiuin!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quotes.map((item) => (
                <article
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/30 hover:bg-white/10 transition-all duration-300 relative group overflow-hidden shadow-lg"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-brand-maroon/5 to-transparent rounded-tr-2xl group-hover:scale-125 transition-transform duration-500"></div>
                  
                  <blockquote className="text-base font-sans italic text-slate-200 leading-relaxed relative z-10 tracking-wide font-medium">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-brand-maroon-light">{item.author}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md font-medium text-[10px]">
                        {item.context}
                      </span>
                    </div>
                    <time className="text-slate-500 font-mono text-[10px]">
                      {formatDate(item.created_at)}
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
        <p>© 2026 Besiuin (Sistem Informasi UIN). Didesain dengan tema Maroon & Navy.</p>
      </footer>
    </div>
  )
}

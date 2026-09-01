import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function HallOfFame({ onBack, userRole }) {
  const [activeTab, setActiveTab] = useState('vote') // 'vote' | 'leaderboard' | 'manage'
  const [categories, setCategories] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Selected category in voting tab
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  // Local storage votes tracking to prevent double voting in the same category
  const [myVotes, setMyVotes] = useState([])

  // Manage form states
  const [newKategori, setNewKategori] = useState('')
  const [submittingKategori, setSubmittingKategori] = useState(false)

  const [newKandidatNama, setNewKandidatNama] = useState('')
  const [newKandidatFoto, setNewKandidatFoto] = useState('')
  const [newKandidatKategoriId, setNewKandidatKategoriId] = useState('')
  const [submittingKandidat, setSubmittingKandidat] = useState(false)

  // Fetch all data
  useEffect(() => {
    fetchData()

    // Load user votes from localStorage
    const savedVotes = localStorage.getItem('besiuin_votes')
    if (savedVotes) {
      try {
        setMyVotes(JSON.parse(savedVotes))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Real-time subscription to kandidat votes
  useEffect(() => {
    const channel = supabase
      .channel('realtime-votes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'awards_kandidat' },
        () => {
          // Re-fetch candidate data to keep vote counts live
          fetchCandidatesOnly()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCandidatesOnly = async () => {
    try {
      const { data, error } = await supabase
        .from('awards_kandidat')
        .select('*')
        .order('nama_kandidat', { ascending: true })

      if (!error && data) {
        setCandidates(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)

      // 1. Fetch categories
      const { data: katData, error: katError } = await supabase
        .from('awards_kategori')
        .select('*')
        .order('nama_kategori', { ascending: true })

      // 2. Fetch candidates
      const { data: kandData, error: kandError } = await supabase
        .from('awards_kandidat')
        .select('*')
        .order('nama_kandidat', { ascending: true })

      let useMock = false
      if ((katError && katError.code === '42P01') || (kandError && kandError.code === '42P01')) {
        useMock = true
        setStatusMessage({
          type: 'warning',
          text: 'Tabel awards_kategori atau awards_kandidat belum dibuat di database. Menggunakan data simulasi lokal.'
        })
      }

      if (useMock) {
        setCategories([
          { id: 1, nama_kategori: 'Mahasiswa Ter-Ambis' },
          { id: 2, nama_kategori: 'Mahasiswa Ter-Gokil' },
          { id: 3, nama_kategori: 'Mahasiswa Ter-Solutif' }
        ])
        setCandidates([
          { id: 101, kategori_id: 1, nama_kandidat: 'Arghi Vianuri', foto_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85', vote_count: 12 },
          { id: 102, kategori_id: 1, nama_kandidat: 'Rajif', foto_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=85', vote_count: 7 },
          { id: 103, kategori_id: 2, nama_kandidat: 'Pais', foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=85', vote_count: 15 },
          { id: 104, kategori_id: 2, nama_kandidat: 'Rapi', foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=85', vote_count: 11 },
          { id: 105, kategori_id: 3, nama_kandidat: 'Diki', foto_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=400&auto=format&fit=crop&q=85', vote_count: 5 },
          { id: 106, kategori_id: 3, nama_kandidat: 'Fajar', foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=85', vote_count: 9 }
        ])
      } else {
        setCategories(katData || [])
        setCandidates(kandData || [])
        
        // Auto select first category if available
        if (katData && katData.length > 0) {
          setSelectedCategoryId(katData[0].id)
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Cast vote for a candidate
  const handleVote = async (candidate) => {
    const catId = candidate.kategori_id
    if (myVotes.includes(catId)) {
      alert('Anda sudah memberikan suara untuk kategori ini!')
      return
    }

    try {
      const currentVote = parseInt(candidate.vote_count) || 0
      const nextVote = currentVote + 1

      // 1. Update database
      const { error } = await supabase
        .from('awards_kandidat')
        .update({ vote_count: nextVote })
        .eq('id', candidate.id)

      if (error) {
        if (error.code === '42P01') {
          // Local preview fallback
          setCandidates(prev =>
            prev.map(c => (c.id === candidate.id ? { ...c, vote_count: nextVote } : c))
          )
          const updatedVotes = [...myVotes, catId]
          setMyVotes(updatedVotes)
          localStorage.setItem('besiuin_votes', JSON.stringify(updatedVotes))
          setStatusMessage({ type: 'success', text: `Vote untuk ${candidate.nama_kandidat} tersimpan di simulasi lokal!` })
        } else {
          throw error
        }
      } else {
        // Successful DB update
        const updatedVotes = [...myVotes, catId]
        setMyVotes(updatedVotes)
        localStorage.setItem('besiuin_votes', JSON.stringify(updatedVotes))
        setStatusMessage({ type: 'success', text: `Berhasil memilih ${candidate.nama_kandidat}!` })
        
        // Re-fetch candidates list
        await fetchCandidatesOnly()
      }
    } catch (err) {
      alert(`Gagal mengirimkan vote: ${err.message}`)
    }
  }

  // Create new category
  const handleCreateKategori = async (e) => {
    e.preventDefault()
    if (!newKategori.trim()) return

    try {
      setSubmittingKategori(true)
      setStatusMessage(null)

      const payload = { nama_kategori: newKategori.trim() }

      const { data, error } = await supabase
        .from('awards_kategori')
        .insert([payload])
        .select()

      if (error) {
        if (error.code === '42P01') {
          const mockNew = { id: Date.now(), nama_kategori: newKategori.trim() }
          setCategories(prev => [...prev, mockNew])
          if (!selectedCategoryId) setSelectedCategoryId(mockNew.id)
          setStatusMessage({ type: 'warning', text: 'Kategori baru disimpan di simulasi lokal.' })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: 'Kategori baru berhasil ditambahkan!' })
        if (data && data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data[0].id)
        }
        await fetchData()
      }

      setNewKategori('')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal membuat kategori: ${err.message}` })
    } finally {
      setSubmittingKategori(false)
    }
  }

  // Create new candidate
  const handleCreateKandidat = async (e) => {
    e.preventDefault()
    if (!newKandidatNama.trim() || !newKandidatKategoriId) {
      alert('Nama kandidat dan Kategori harus dipilih!')
      return
    }

    try {
      setSubmittingKandidat(true)
      setStatusMessage(null)

      const defaultFoto = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85'
      const payload = {
        nama_kandidat: newKandidatNama.trim(),
        kategori_id: parseInt(newKandidatKategoriId),
        foto_url: newKandidatFoto.trim() || defaultFoto,
        vote_count: 0
      }

      const { error } = await supabase
        .from('awards_kandidat')
        .insert([payload])

      if (error) {
        if (error.code === '42P01') {
          const mockNew = { id: Date.now(), ...payload }
          setCandidates(prev => [...prev, mockNew])
          setStatusMessage({ type: 'warning', text: 'Kandidat baru disimpan di simulasi lokal.' })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: 'Kandidat baru berhasil ditambahkan!' })
        await fetchData()
      }

      setNewKandidatNama('')
      setNewKandidatFoto('')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal membuat kandidat: ${err.message}` })
    } finally {
      setSubmittingKandidat(false)
    }
  }

  // Helper: Find winner candidate for a category
  const getCategoryWinner = (catId) => {
    const catCandidates = candidates.filter(c => c.kategori_id === catId)
    if (catCandidates.length === 0) return null

    // Sort descending by vote_count
    const sorted = [...catCandidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    return sorted[0]
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-between text-slate-100 selection:bg-brand-maroon selection:text-white font-sans relative overflow-x-hidden">
      
      {/* Decorative Blob */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-maroon/5 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-navy/10 blur-[100px] pointer-events-none z-0"></div>

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-yellow-500/20">
              🏆
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white font-serif">Hall of Fame</h1>
              <span className="text-[9px] block text-yellow-500 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Awards
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('vote')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vote' ? 'bg-brand-maroon text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Vote
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leaderboard' ? 'bg-brand-maroon text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              👑 Klasemen
            </button>
            {(userRole === 'admin' || userRole === 'owner') && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manage' ? 'bg-brand-maroon text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙ Kelola
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full z-10 relative">
        
        {/* Status Notification Alert */}
        {statusMessage && (
          <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in">
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

        {loading ? (
          <div className="text-center py-32">
            <div className="h-10 w-10 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 mt-3 font-mono">Memuat nominasi penghargaan...</p>
          </div>
        ) : (
          <>
            {/* ================= TAB 1: VOTE ================= */}
            {activeTab === 'vote' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left side: Category Selector List */}
                <div className="lg:col-span-4 space-y-4">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Penghargaan</h2>
                  
                  {categories.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-xs text-slate-400">
                      Belum ada kategori nominasi. Tambahkan di tab Kelola.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => {
                        const hasVoted = myVotes.includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategoryId(cat.id)
                              setStatusMessage(null)
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                              selectedCategoryId === cat.id
                                ? 'bg-gradient-to-r from-brand-maroon/30 to-brand-navy/30 border-brand-maroon shadow-lg'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            <span className="text-sm font-bold text-white">{cat.nama_kategori}</span>
                            {hasVoted && (
                              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                Voted ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right side: Candidate List for Selected Category */}
                <div className="lg:col-span-8 space-y-6">
                  {selectedCategoryId ? (
                    <>
                      {(() => {
                        const selectedCat = categories.find(c => c.id === selectedCategoryId)
                        const categoryCandidates = candidates.filter(c => c.kategori_id === selectedCategoryId)
                        const hasVotedThisCat = myVotes.includes(selectedCategoryId)

                        return (
                          <>
                            <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                              <div>
                                <h2 className="text-2xl font-bold text-white font-serif">{selectedCat?.nama_kategori}</h2>
                                <p className="text-xs text-slate-400 mt-1">Berikan suara Anda pada kandidat terbaik menurut Anda.</p>
                              </div>
                              <span className="text-xs text-slate-500 font-mono">
                                {categoryCandidates.length} Kandidat
                              </span>
                            </div>

                            {categoryCandidates.length === 0 ? (
                              <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 text-sm">
                                Belum ada kandidat di kategori ini. Tambahkan di tab Kelola.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {categoryCandidates.map((cand) => (
                                  <div 
                                    key={cand.id}
                                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-maroon/40 transition-all flex flex-col justify-between group shadow-lg"
                                  >
                                    {/* Image */}
                                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                                      <img 
                                        src={cand.foto_url} 
                                        alt={cand.nama_kandidat}
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                          e.target.onerror = null
                                          e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85'
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                                        <h3 className="font-extrabold text-white text-base leading-tight font-serif truncate">
                                          {cand.nama_kandidat}
                                        </h3>
                                      </div>
                                    </div>

                                    {/* Vote section */}
                                    <div className="p-4 flex items-center justify-between gap-4 border-t border-white/5">
                                      <div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Total Suara</span>
                                        <span className="text-xl font-black text-yellow-500 font-mono">
                                          {cand.vote_count || 0}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() => handleVote(cand)}
                                        disabled={hasVotedThisCat}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                          hasVotedThisCat
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                            : 'bg-brand-maroon hover:bg-brand-maroon-hover text-white shadow shadow-brand-maroon/20'
                                        }`}
                                      >
                                        {hasVotedThisCat ? 'Sudah Vote' : 'Vote Kandidat'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 min-h-[300px] flex flex-col justify-center items-center">
                      <p className="text-sm">Silakan pilih kategori penghargaan di sisi kiri untuk melihat kandidat.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ================= TAB 2: LEADERBOARD ================= */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-8">
                <div className="border-b border-white/10 pb-4 text-center max-w-xl mx-auto">
                  <h2 className="text-3xl font-extrabold text-white font-serif tracking-tight">👑 Pemenang Sementara Klasemen</h2>
                  <p className="text-xs text-slate-400 mt-2">
                    Berikut adalah kandidat dengan perolehan suara terbanyak saat ini pada masing-masing kategori penghargaan.
                  </p>
                </div>

                {categories.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
                    Belum ada kategori nominasi di sistem.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat) => {
                      const winner = getCategoryWinner(cat.id)

                      return (
                        <div 
                          key={cat.id} 
                          className="bg-gradient-to-b from-white/5 to-brand-navy/10 border border-white/10 rounded-2xl p-6 relative flex flex-col justify-between gap-6 hover:border-yellow-500/30 transition-all shadow-xl"
                        >
                          <div className="absolute top-4 right-4 text-2xl" title="Pemenang Teratas">
                            🏆
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] bg-brand-maroon/20 border border-brand-maroon/30 text-brand-maroon-light px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-block">
                              Kategori Penghargaan
                            </span>
                            <h3 className="text-lg font-bold text-white leading-tight font-serif">
                              {cat.nama_kategori}
                            </h3>
                          </div>

                          {winner ? (
                            <div className="flex items-center gap-4 bg-brand-dark/40 border border-white/5 rounded-xl p-3">
                              <img 
                                src={winner.foto_url} 
                                alt={winner.nama_kandidat}
                                className="h-12 w-12 rounded-full object-cover border-2 border-yellow-500 shadow-lg shadow-yellow-500/20"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85'
                                }}
                              />
                              <div>
                                <h4 className="font-bold text-white text-sm truncate max-w-[150px]">{winner.nama_kandidat}</h4>
                                <p className="text-[10px] text-yellow-500 font-mono mt-0.5">
                                  🥇 {winner.vote_count || 0} Suara Terkumpul
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-brand-dark/20 rounded-xl text-xs text-slate-500 font-mono">
                              Belum ada kandidat / vote
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: MANAGE ================= */}
            {activeTab === 'manage' && (userRole === 'admin' || userRole === 'owner') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Form 1: Add New Category */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="h-5 w-1.5 bg-yellow-500 rounded-full"></span>
                      Buat Kategori Baru
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Buat kategori penghargaan baru untuk kelas Anda.</p>
                  </div>

                  <form onSubmit={handleCreateKategori} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Nama Kategori Penghargaan
                      </label>
                      <input
                        type="text"
                        value={newKategori}
                        onChange={(e) => setNewKategori(e.target.value)}
                        placeholder="Contoh: Mahasiswa Ter-Ambis"
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white font-semibold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingKategori}
                      className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {submittingKategori ? 'Membuat...' : 'Buat Kategori'}
                    </button>
                  </form>
                </div>

                {/* Form 2: Add New Candidate */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="h-5 w-1.5 bg-yellow-500 rounded-full"></span>
                      Tambah Nominasi Kandidat
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Daftarkan mahasiswa sebagai kandidat nominasi.</p>
                  </div>

                  <form onSubmit={handleCreateKandidat} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Kategori Penghargaan
                      </label>
                      <select
                        value={newKandidatKategoriId}
                        onChange={(e) => setNewKandidatKategoriId(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                        required
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.nama_kategori}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Nama Lengkap Kandidat
                      </label>
                      <input
                        type="text"
                        value={newKandidatNama}
                        onChange={(e) => setNewKandidatNama(e.target.value)}
                        placeholder="Contoh: Muhamad Arghi"
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                        URL Foto Profil <span className="text-[10px] text-slate-500 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="url"
                        value={newKandidatFoto}
                        onChange={(e) => setNewKandidatFoto(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingKandidat || categories.length === 0}
                      className="w-full bg-brand-navy hover:bg-brand-navy-hover border border-white/5 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {submittingKandidat ? 'Mendaftarkan...' : 'Daftarkan Kandidat'}
                    </button>
                  </form>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-brand-dark/80 py-8 text-center text-xs text-slate-500 mt-12">
        <p>© 2026 Besiuin (Sistem Informasi UIN). All rights reserved.</p>
      </footer>
    </div>
  )
}

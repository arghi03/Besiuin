import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { compressAvatar } from '../utils/image'
import { uploadToStorage } from '../utils/storage'

export default function HallOfFame({ userRole }) {
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
  const [newKandidatFoto, setNewKandidatFoto] = useState(null) // data URL
  const [processingFoto, setProcessingFoto] = useState(false)
  const [newKandidatKategoriId, setNewKandidatKategoriId] = useState('')
  const [submittingKandidat, setSubmittingKandidat] = useState(false)
  const fotoInputRef = useRef(null)

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

      const { data: katData, error: katError } = await supabase
        .from('awards_kategori')
        .select('*')
        .order('nama_kategori', { ascending: true })

      const { data: kandData, error: kandError } = await supabase
        .from('awards_kandidat')
        .select('*')
        .order('nama_kandidat', { ascending: true })

      if ((katError && katError.code === '42P01') || (kandError && kandError.code === '42P01')) {
        setStatusMessage({
          type: 'warning',
          text: 'Tabel awards_kategori atau awards_kandidat belum dibuat di database. Menampilkan data kosong.'
        })
        setCategories([])
        setCandidates([])
      } else {
        setCategories(katData || [])
        setCandidates(kandData || [])

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

  const handleVote = async (candidate) => {
    const catId = candidate.kategori_id
    if (myVotes.includes(catId)) {
      alert('Anda sudah memberikan suara untuk kategori ini!')
      return
    }

    try {
      const currentVote = parseInt(candidate.vote_count) || 0
      const nextVote = currentVote + 1

      const { error } = await supabase
        .from('awards_kandidat')
        .update({ vote_count: nextVote })
        .eq('id', candidate.id)

      if (error) {
        if (error.code === '42P01') {
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
        const updatedVotes = [...myVotes, catId]
        setMyVotes(updatedVotes)
        localStorage.setItem('besiuin_votes', JSON.stringify(updatedVotes))
        setStatusMessage({ type: 'success', text: `Berhasil memilih ${candidate.nama_kandidat}!` })
        await fetchCandidatesOnly()
      }
    } catch (err) {
      alert(`Gagal mengirimkan vote: ${err.message}`)
    }
  }

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

  const handleFotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setProcessingFoto(true)
      const dataUrl = await compressAvatar(file, { size: 400 })
      setNewKandidatFoto(dataUrl)
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memproses foto.' })
    } finally {
      setProcessingFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  const handleCreateKandidat = async (e) => {
    e.preventDefault()
    if (!newKandidatNama.trim() || !newKandidatKategoriId) {
      alert('Nama kandidat dan Kategori harus dipilih!')
      return
    }

    try {
      setSubmittingKandidat(true)
      setStatusMessage(null)

      let fotoUrl = newKandidatFoto || ''
      if (fotoUrl && fotoUrl.startsWith('data:')) {
        try {
          const fileName = `hof/${Date.now()}_${newKandidatNama.replace(/\s+/g, '_')}.jpg`
          fotoUrl = await uploadToStorage('avatars', fotoUrl, fileName, 'image/jpeg')
        } catch (uploadErr) {
          console.warn('Storage upload gagal, fallback ke base64:', uploadErr.message)
        }
      }

      const payload = {
        nama_kandidat: newKandidatNama.trim(),
        kategori_id: parseInt(newKandidatKategoriId),
        foto_url: fotoUrl,
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
      setNewKandidatFoto(null)
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal membuat kandidat: ${err.message}` })
    } finally {
      setSubmittingKandidat(false)
    }
  }

  const getCategoryWinner = (catId) => {
    const catCandidates = candidates.filter(c => c.kategori_id === catId)
    if (catCandidates.length === 0) return null
    const sorted = [...catCandidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    return sorted[0]
  }

  const tabs = [
    { id: 'vote', label: 'Vote', icon: 'how_to_vote' },
    { id: 'leaderboard', label: 'Klasemen', icon: 'emoji_events' },
    ...((userRole === 'admin' || userRole === 'owner') ? [{ id: 'manage', label: 'Kelola', icon: 'settings' }] : []),
  ]

  const labelCls = "block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5"
  const inputCls = "w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"

  const renderFoto = (cand, sizeCls) => {
    if (cand.foto_url) {
      return (
        <img
          src={cand.foto_url}
          alt={cand.nama_kandidat}
          className={`${sizeCls} object-cover`}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )
    }
    return (
      <div className={`${sizeCls} bg-maroon-900/60 border border-maroon-800 flex items-center justify-center font-mono font-bold text-rose-200`}>
        {(cand.nama_kandidat || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-zinc-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Apresiasi Kelas Sistem Informasi</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Hall of <span className="text-maroon-600">Fame</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Nominasi penghargaan mahasiswa teraktif, terambis, dan terlucu sekelas.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#121620] border border-white/10 rounded-md p-1 font-mono text-xs self-start sm:self-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-maroon-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
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

        {loading ? (
          <div className="text-center py-24">
            <div className="h-7 w-7 rounded-full border-2 border-maroon-600 border-t-transparent animate-spin mx-auto mb-3"></div>
            <p className="font-mono text-xs text-zinc-500">Memuat nominasi…</p>
          </div>
        ) : (
          <>
            {/* ================= TAB: VOTE ================= */}
            {activeTab === 'vote' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Kiri: kategori */}
                <div className="lg:col-span-4">
                  <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-sm bg-maroon-700"></span>
                    Pilih Kategori
                  </h2>

                  {categories.length === 0 ? (
                    <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-6 text-center text-xs font-mono text-zinc-400">
                      Belum ada kategori nominasi.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {categories.map((cat) => {
                        const hasVoted = myVotes.includes(cat.id)
                        const isActive = selectedCategoryId === cat.id
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategoryId(cat.id)
                              setStatusMessage(null)
                            }}
                            className={`w-full text-left p-3.5 rounded border transition-colors cursor-pointer flex justify-between items-center gap-2 ${
                              isActive
                                ? 'bg-maroon-900/40 border-maroon-700'
                                : 'bg-[#11141c]/90 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                              {cat.nama_kategori}
                            </span>
                            {hasVoted && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10231b] border border-emerald-500/30 text-emerald-400 shrink-0">
                                Voted ✓
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Kanan: kandidat */}
                <div className="lg:col-span-8">
                  {selectedCategoryId ? (
                    <>
                      {(() => {
                        const selectedCat = categories.find(c => c.id === selectedCategoryId)
                        const categoryCandidates = candidates.filter(c => c.kategori_id === selectedCategoryId)
                        const hasVotedThisCat = myVotes.includes(selectedCategoryId)

                        return (
                          <>
                            <div className="border-b border-white/10 pb-4 mb-6 flex justify-between items-end">
                              <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedCat?.nama_kategori}</h2>
                                <p className="text-xs text-zinc-400 font-mono mt-1">Satu suara per kategori.</p>
                              </div>
                              <span className="font-mono text-xs text-zinc-500">{categoryCandidates.length} Kandidat</span>
                            </div>

                            {categoryCandidates.length === 0 ? (
                              <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center text-xs font-mono text-zinc-400">
                                Belum ada kandidat di kategori ini.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {categoryCandidates.map((cand) => (
                                  <div key={cand.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors">
                                    <div className="relative h-44 bg-[#0b0e14] overflow-hidden">
                                      {cand.foto_url ? (
                                        <img
                                          src={cand.foto_url}
                                          alt={cand.nama_kandidat}
                                          className="h-full w-full object-cover"
                                          onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center font-mono text-3xl font-bold text-rose-200/60 bg-maroon-950/40">
                                          {(cand.nama_kandidat || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent flex items-end p-4">
                                        <h3 className="font-semibold text-white text-base truncate">{cand.nama_kandidat}</h3>
                                      </div>
                                    </div>

                                    <div className="p-4 flex items-center justify-between gap-3 border-t border-white/10">
                                      <div>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">Suara</span>
                                        <span className="text-lg font-bold text-amber-400 font-mono">{cand.vote_count || 0}</span>
                                      </div>
                                      <button
                                        onClick={() => handleVote(cand)}
                                        disabled={hasVotedThisCat}
                                        className={`px-4 py-2 rounded font-mono text-xs font-medium transition-colors cursor-pointer ${
                                          hasVotedThisCat
                                            ? 'bg-[#151922] text-zinc-600 border border-white/5 cursor-not-allowed'
                                            : 'bg-maroon-800 hover:bg-maroon-700 text-white'
                                        }`}
                                      >
                                        {hasVotedThisCat ? 'Sudah Vote' : 'Vote'}
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
                    <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center text-xs font-mono text-zinc-400 min-h-[240px] flex items-center justify-center">
                      Pilih kategori di sisi kiri untuk melihat kandidat.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ================= TAB: LEADERBOARD ================= */}
            {activeTab === 'leaderboard' && (
              <>
                {categories.length === 0 ? (
                  <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center text-xs font-mono text-zinc-400">
                    Belum ada kategori nominasi di sistem.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => {
                      const winner = getCategoryWinner(cat.id)

                      return (
                        <div key={cat.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-amber-500/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">Kategori</span>
                              <h3 className="text-sm font-semibold text-white leading-tight">{cat.nama_kategori}</h3>
                            </div>
                            <span className="material-symbols-outlined text-amber-400 text-xl">trophy</span>
                          </div>

                          {winner ? (
                            <div className="flex items-center gap-3 bg-[#0b0e14] border border-white/10 rounded p-3">
                              {renderFoto(winner, 'w-11 h-11 rounded border border-amber-500/40')}
                              <div className="min-w-0">
                                <h4 className="font-semibold text-white text-sm truncate">{winner.nama_kandidat}</h4>
                                <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                                  {winner.vote_count || 0} suara terkumpul
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-3 bg-[#0b0e14]/60 rounded text-[11px] text-zinc-500 font-mono">
                              Belum ada kandidat / vote
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ================= TAB: MANAGE ================= */}
            {activeTab === 'manage' && (userRole === 'admin' || userRole === 'owner') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* Kategori */}
                <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5">
                  <div className="border-b border-white/10 pb-3 mb-4">
                    <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-maroon-600">category</span>
                      Buat Kategori Baru
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Buat kategori penghargaan baru.</p>
                  </div>

                  <form onSubmit={handleCreateKategori} className="space-y-3">
                    <div>
                      <label className={labelCls}>Nama Kategori</label>
                      <input
                        type="text"
                        value={newKategori}
                        onChange={(e) => setNewKategori(e.target.value)}
                        placeholder="Contoh: Mahasiswa Ter-Ambis"
                        className={inputCls}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingKategori}
                      className="w-full py-2.5 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      {submittingKategori ? 'Membuat…' : 'Buat Kategori'}
                    </button>
                  </form>
                </div>

                {/* Kandidat */}
                <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5">
                  <div className="border-b border-white/10 pb-3 mb-4">
                    <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-maroon-600">person_add</span>
                      Tambah Kandidat
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Daftarkan mahasiswa sebagai nominasi.</p>
                  </div>

                  <form onSubmit={handleCreateKandidat} className="space-y-3">
                    <div>
                      <label className={labelCls}>Kategori</label>
                      <select
                        value={newKandidatKategoriId}
                        onChange={(e) => setNewKandidatKategoriId(e.target.value)}
                        className={`${inputCls} cursor-pointer`}
                        required
                      >
                        <option value="">— Pilih kategori —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.nama_kategori}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Nama Kandidat</label>
                      <input
                        type="text"
                        value={newKandidatNama}
                        onChange={(e) => setNewKandidatNama(e.target.value)}
                        placeholder="Contoh: Muhamad Arghi"
                        className={inputCls}
                        required
                      />
                    </div>

                    {/* Upload foto langsung */}
                    <div>
                      <label className={labelCls}>Foto Kandidat <span className="normal-case tracking-normal text-zinc-600">(opsional)</span></label>
                      <input
                        ref={fotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFotoFile}
                        className="hidden"
                      />

                      {newKandidatFoto ? (
                        <div className="flex items-center gap-3">
                          <img src={newKandidatFoto} alt="Preview" className="w-16 h-16 rounded object-cover border border-white/10" />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fotoInputRef.current?.click()}
                              disabled={processingFoto}
                              className="px-3 py-2 rounded bg-[#161a24] hover:bg-[#1d2330] border border-white/10 text-xs font-mono text-zinc-200 cursor-pointer disabled:opacity-50"
                            >
                              Ganti
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewKandidatFoto(null)}
                              className="px-3 py-2 rounded text-xs font-mono text-rose-400 hover:bg-maroon-950/60 cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fotoInputRef.current?.click()}
                          disabled={processingFoto}
                          className="w-full border border-dashed border-white/15 hover:border-maroon-700 rounded py-4 flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {processingFoto ? 'hourglass_top' : 'upload_file'}
                          </span>
                          <span className="font-mono text-[11px]">
                            {processingFoto ? 'Memproses foto…' : 'Klik untuk pilih foto'}
                          </span>
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingKandidat || categories.length === 0 || processingFoto}
                      className="w-full py-2.5 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 hover:border-maroon-700 text-white font-mono text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      {submittingKandidat ? 'Mendaftarkan…' : 'Daftarkan Kandidat'}
                    </button>
                  </form>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      <footer className="relative z-10 w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Hall of Fame Kelas Sistem Informasi
      </footer>
    </div>
  )
}

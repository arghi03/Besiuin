import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { compressAvatar } from '../utils/image'
import { uploadToStorage } from '../utils/storage'

export default function HallOfFame({ userRole }) {
  const [activeTab, setActiveTab] = useState('vote') // 'vote' | 'leaderboard' | 'manage'
  const [categories, setCategories] = useState([])
  const [candidates, setCandidates] = useState([])
  const [myVotes, setMyVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  const [newKategori, setNewKategori] = useState('')
  const [submittingKategori, setSubmittingKategori] = useState(false)

  const [newKandidatNama, setNewKandidatNama] = useState('')
  const [newKandidatFoto, setNewKandidatFoto] = useState(null)
  const [processingFoto, setProcessingFoto] = useState(false)
  const [newKandidatKategoriId, setNewKandidatKategoriId] = useState('')
  const [submittingKandidat, setSubmittingKandidat] = useState(false)
  const fotoInputRef = useRef(null)

  const getUserEmail = () => {
    const s = supabase.auth.getSession()
    return s?.data?.session?.user?.email?.toLowerCase() || ''
  }

  useEffect(() => {
    fetchData()
    fetchMyVotes()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-hof')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'awards_kandidat' }, () => fetchCandidatesOnly())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'awards_votes' }, () => fetchMyVotes())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchCandidatesOnly = async () => {
    try {
      const { data, error } = await supabase.from('awards_kandidat').select('*').order('nama_kandidat', { ascending: true })
      if (!error && data) setCandidates(data)
    } catch (e) { console.error(e) }
  }

  const fetchMyVotes = async () => {
    const email = (await supabase.auth.getSession())?.data?.session?.user?.email?.toLowerCase()
    if (!email) return
    try {
      const { data, error } = await supabase
        .from('awards_votes')
        .select('kandidat_id, kategori_id')
        .eq('voter_email', email)
      if (!error && data) setMyVotes(data)
    } catch (e) { console.error(e) }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)
      const { data: katData, error: katError } = await supabase.from('awards_kategori').select('*').order('nama_kategori', { ascending: true })
      const { data: kandData, error: kandError } = await supabase.from('awards_kandidat').select('*').order('nama_kandidat', { ascending: true })
      if ((katError && katError.code === '42P01') || (kandError && kandError.code === '42P01')) {
        setStatusMessage({ type: 'warning', text: 'Tabel awards_kategori atau awards_kandidat belum dibuat di database.' })
        setCategories([]); setCandidates([])
      } else {
        setCategories(katData || [])
        setCandidates(kandData || [])
        if (katData && katData.length > 0) setSelectedCategoryId(katData[0].id)
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleVoteToggle = async (candidate) => {
    const catId = candidate.kategori_id
    const candId = candidate.id
    const sessionRes = await supabase.auth.getSession()
    const email = sessionRes?.data?.session?.user?.email?.toLowerCase()
    if (!email) { setStatusMessage({ type: 'error', text: 'Sesi login tidak ditemukan.' }); return }

    const existingVote = myVotes.find(v => v.kategori_id === catId)

    try {
      if (existingVote) {
        // Cancel vote
        if (existingVote.kandidat_id === candId) {
          // Remove own vote
          const { error: delError } = await supabase.from('awards_votes').delete().eq('voter_email', email).eq('kategori_id', catId)
          if (delError) throw delError
          const { error: decError } = await supabase.from('awards_kandidat').update({ vote_count: Math.max(0, (parseInt(candidate.vote_count) || 1) - 1) }).eq('id', candId)
          if (decError) throw decError
          setMyVotes(prev => prev.filter(v => !(v.kategori_id === catId && v.kandidat_id === candId)))
          setStatusMessage({ type: 'success', text: 'Vote dibatalkan.' })
          await fetchCandidatesOnly()
          return
        } else {
          // Switch vote to another candidate in same category
          const oldCandId = existingVote.kandidat_id
          const { error: delError } = await supabase.from('awards_votes').delete().eq('voter_email', email).eq('kategori_id', catId)
          if (delError) throw delError
          const { error: decOld } = await supabase.from('awards_kandidat').update({ vote_count: supabase.rpc('decrement_vote', { row_id: oldCandId }) }).eq('id', oldCandId)
          // fallback manual decrement
          await supabase.from('awards_kandidat').update({ vote_count: Math.max(0, (parseInt(candidates.find(c => c.id === oldCandId)?.vote_count) || 1) - 1) }).eq('id', oldCandId)
          const { error: incNew } = await supabase.from('awards_kandidat').update({ vote_count: (parseInt(candidate.vote_count) || 0) + 1 }).eq('id', candId)
          if (incNew) throw incNew
          await supabase.from('awards_votes').insert([{ voter_email: email, kandidat_id: candId, kategori_id: catId }])
          setMyVotes(prev => prev.map(v => (v.kategori_id === catId ? { ...v, kandidat_id: candId } : v)))
          setStatusMessage({ type: 'success', text: `Vote pindah ke ${candidate.nama_kandidat}!` })
        }
      } else {
        // New vote
        const nextVote = (parseInt(candidate.vote_count) || 0) + 1
        const { error: updError } = await supabase.from('awards_kandidat').update({ vote_count: nextVote }).eq('id', candId)
        if (updError) throw updError
        const { error: insError } = await supabase.from('awards_votes').insert([{ voter_email: email, kandidat_id: candId, kategori_id: catId }])
        if (insError) throw insError
        setMyVotes(prev => [...prev, { voter_email: email, kandidat_id: candId, kategori_id: catId }])
        setStatusMessage({ type: 'success', text: `Berhasil memilih ${candidate.nama_kandidat}!` })
      }
      await fetchCandidatesOnly()
      await fetchMyVotes()
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal vote: ${err.message}` })
    }
  }

  const handleCreateKategori = async (e) => {
    e.preventDefault()
    if (!newKategori.trim()) return
    try {
      setSubmittingKategori(true)
      setStatusMessage(null)
      const { data, error } = await supabase.from('awards_kategori').insert([{ nama_kategori: newKategori.trim() }]).select()
      if (error) {
        if (error.code === '42P01') { setCategories(prev => [...prev, { id: Date.now(), nama_kategori: newKategori.trim() }]); setStatusMessage({ type: 'warning', text: 'Kategori baru disimpan di simulasi lokal.' }) }
        else throw error
      } else {
        setStatusMessage({ type: 'success', text: 'Kategori baru berhasil ditambahkan!' })
        if (data && data.length > 0 && !selectedCategoryId) setSelectedCategoryId(data[0].id)
        await fetchData()
      }
      setNewKategori('')
    } catch (err) { setStatusMessage({ type: 'error', text: `Gagal membuat kategori: ${err.message}` }) }
    finally { setSubmittingKategori(false) }
  }

  const handleFotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setProcessingFoto(true)
      const dataUrl = await compressAvatar(file, { size: 400 })
      setNewKandidatFoto(dataUrl)
    } catch (err) { setStatusMessage({ type: 'error', text: err.message || 'Gagal memproses foto.' }) }
    finally { setProcessingFoto(false); if (fotoInputRef.current) fotoInputRef.current.value = '' }
  }

  const handleCreateKandidat = async (e) => {
    e.preventDefault()
    if (!newKandidatNama.trim() || !newKandidatKategoriId) { alert('Nama kandidat dan Kategori harus dipilih!'); return }
    try {
      setSubmittingKandidat(true)
      setStatusMessage(null)
      let fotoUrl = newKandidatFoto || ''
      if (fotoUrl && fotoUrl.startsWith('data:')) {
        try {
          const fileName = `hof/${Date.now()}_${newKandidatNama.replace(/\s+/g, '_')}.jpg`
          fotoUrl = await uploadToStorage('avatars', fotoUrl, fileName, 'image/jpeg')
        } catch (uploadErr) { console.warn('Storage upload gagal, fallback ke base64:', uploadErr.message) }
      }
      const payload = { nama_kandidat: newKandidatNama.trim(), kategori_id: parseInt(newKandidatKategoriId), foto_url: fotoUrl, vote_count: 0 }
      const { error } = await supabase.from('awards_kandidat').insert([payload])
      if (error) {
        if (error.code === '42P01') { setCandidates(prev => [...prev, { id: Date.now(), ...payload }]); setStatusMessage({ type: 'warning', text: 'Kandidat baru disimpan di simulasi lokal.' }) }
        else throw error
      } else { setStatusMessage({ type: 'success', text: 'Kandidat baru berhasil ditambahkan!' }); await fetchData() }
      setNewKandidatNama(''); setNewKandidatFoto(null)
    } catch (err) { setStatusMessage({ type: 'error', text: `Gagal membuat kandidat: ${err.message}` }) }
    finally { setSubmittingKandidat(false) }
  }

  const getCategoryWinner = (catId) => {
    const catCandidates = candidates.filter(c => c.kategori_id === catId)
    if (catCandidates.length === 0) return null
    const sorted = [...catCandidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    return sorted[0]
  }

  const handleDeleteKategori = async (id) => {
    if (!confirm('Hapus kategori ini beserta semua kandidat di dalamnya?')) return
    try {
      setStatusMessage(null)
      // Hapus votes terkait kandidat di kategori ini
      const { error: voteError } = await supabase.from('awards_votes').delete().in('kandidat_id', candidates.filter(c => c.kategori_id === id).map(c => c.id))
      if (voteError) throw voteError
      const { error } = await supabase.from('awards_kategori').delete().eq('id', id)
      if (error) throw error
      setCategories(prev => prev.filter(c => c.id !== id))
      setCandidates(prev => prev.filter(c => c.kategori_id !== id))
      setMyVotes(prev => prev.filter(v => !candidates.find(c => c.id === v.kandidat_id && c.kategori_id === id)))
      setStatusMessage({ type: 'success', text: 'Kategori berhasil dihapus.' })
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menghapus kategori: ${err.message}` })
    }
  }

  const handleDeleteKandidat = async (id) => {
    if (!confirm('Hapus kandidat ini?')) return
    try {
      setStatusMessage(null)
      const { error: voteError } = await supabase.from('awards_votes').delete().eq('kandidat_id', id)
      if (voteError) throw voteError
      const { error } = await supabase.from('awards_kandidat').delete().eq('id', id)
      if (error) throw error
      setCandidates(prev => prev.filter(c => c.id !== id))
      setMyVotes(prev => prev.filter(v => v.kandidat_id !== id))
      setStatusMessage({ type: 'success', text: 'Kandidat berhasil dihapus.' })
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menghapus kandidat: ${err.message}` })
    }
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
        <img src={cand.foto_url} alt={cand.nama_kandidat} className={`${sizeCls} object-cover`} onError={(e) => { e.target.style.display = 'none' }} />
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
                  activeTab === tab.id ? 'bg-maroon-800 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {statusMessage && (
          <div className={`px-4 py-3 rounded border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono ${
            statusMessage.type === 'success' ? 'bg-[#10231b] border-emerald-500/30 text-emerald-300'
            : statusMessage.type === 'warning' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : 'bg-maroon-950/60 border-maroon-800 text-rose-300'
          }`}>
            <span className="leading-relaxed">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white cursor-pointer shrink-0">Tutup ✕</button>
          </div>
        )}

        {loading ? (
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
            Memuat data Hall of Fame…
          </div>
        ) : (
          <>
            {activeTab === 'vote' && (
              <>
                {categories.length === 0 ? (
                  <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center">
                    <span className="material-symbols-outlined text-3xl text-zinc-600 block mb-2">emoji_events</span>
                    <p className="text-zinc-400 font-mono text-xs">Belum ada kategori nominasi.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* Category selector */}
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            selectedCategoryId === cat.id
                              ? 'bg-maroon-800 border-maroon-700 text-white font-medium'
                              : 'bg-[#11141c] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {cat.nama_kategori}
                          {(userRole === 'owner' || userRole === 'admin') && (
                            <span
                              onClick={(e) => { e.stopPropagation(); handleDeleteKategori(cat.id) }}
                              className="text-rose-400 hover:text-rose-200 ml-1 cursor-pointer"
                              title="Hapus kategori"
                            >
                              <span className="material-symbols-outlined text-[11px]">delete</span>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {selectedCategoryId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {candidates.filter(c => c.kategori_id === selectedCategoryId).map(candidate => {
                          const myVote = myVotes.find(v => v.kandidat_id === candidate.id)
                          const hasVotedThisCategory = myVotes.some(v => v.kategori_id === selectedCategoryId)
                          return (
                            <div key={candidate.id} className={`bg-[#11141c]/90 border rounded-lg overflow-hidden hover:border-white/20 transition-colors ${
                              myVote ? 'border-maroon-700/50' : 'border-white/10'
                            }`}>
                              <div className="flex flex-col items-center gap-3 p-5 relative">
                                {(userRole === 'owner' || userRole === 'admin') && (
                                  <button
                                    onClick={() => handleDeleteKandidat(candidate.id)}
                                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-maroon-950/60 border border-maroon-800/60 text-rose-300 hover:bg-maroon-900 hover:border-maroon-700 transition-colors cursor-pointer font-mono text-[10px]"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">delete</span>
                                  </button>
                                )}
                                <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10">
                                  {renderFoto(candidate, 'w-full h-full')}
                                </div>
                                <div className="text-center">
                                  <h3 className="text-sm font-semibold text-white">{candidate.nama_kandidat}</h3>
                                  <p className="text-xs font-mono text-zinc-500 mt-0.5">{candidate.vote_count || 0} suara</p>
                                </div>
                                <button
                                  onClick={() => handleVoteToggle(candidate)}
                                  disabled={hasVotedThisCategory && !myVote}
                                  className={`w-full py-2 rounded text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                                    myVote
                                      ? 'bg-maroon-800 hover:bg-maroon-700 text-white'
                                      : 'bg-[#161a24] hover:bg-[#1d2330] border border-white/10 text-zinc-300 hover:text-white'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {myVote ? 'how_to_vote' : 'thumb_up'}
                                  </span>
                                  {myVote ? 'Batalkan Vote' : 'Vote'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'leaderboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => {
                  const winner = getCategoryWinner(cat.id)
                  return (
                    <div key={cat.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-amber-500/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-sm text-amber-400">emoji_events</span>
                        <h3 className="text-sm font-semibold text-white font-mono">{cat.nama_kategori}</h3>
                      </div>
                      {winner ? (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-500/30 shrink-0">
                            {renderFoto(winner, 'w-full h-full')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{winner.nama_kandidat}</p>
                            <p className="text-xs font-mono text-amber-400">{winner.vote_count || 0} suara</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 font-mono">Belum ada kandidat.</p>
                      )}
                      <div className="pt-3 border-t border-white/10 space-y-1.5">
                        {candidates.filter(c => c.kategori_id === cat.id).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).map((c, i) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-zinc-600 w-4">{i + 1}</span>
                              <span className="truncate">{c.nama_kandidat}</span>
                            </span>
                            <span className="font-mono text-zinc-500">{c.vote_count || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'manage' && (userRole === 'admin' || userRole === 'owner') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-sm text-maroon-600">add_circle</span>
                    Tambah Kategori
                  </h3>
                  <form onSubmit={handleCreateKategori} className="flex flex-col gap-3">
                    <input type="text" value={newKategori} onChange={(e) => setNewKategori(e.target.value)} placeholder="Nama kategori..." className={inputCls} required />
                    <button type="submit" disabled={submittingKategori} className="w-full py-2.5 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 hover:border-maroon-700 text-white font-mono text-xs font-medium cursor-pointer disabled:opacity-50">{submittingKategori ? 'Menyimpan…' : 'Tambah Kategori'}</button>
                  </form>
                </div>

                <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-sm text-maroon-600">person_add</span>
                    Daftarkan Kandidat
                  </h3>
                  <form onSubmit={handleCreateKandidat} className="flex flex-col gap-3">
                    <div>
                      <label className={labelCls}>Nama Kandidat</label>
                      <input type="text" value={newKandidatNama} onChange={(e) => setNewKandidatNama(e.target.value)} placeholder="Nama lengkap" className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls}>Kategori</label>
                      <select value={newKandidatKategoriId} onChange={(e) => setNewKandidatKategoriId(e.target.value)} className={`${inputCls} cursor-pointer`} required>
                        <option value="">Pilih Kategori</option>
                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Foto (Opsional)</label>
                      <input type="file" accept="image/*" ref={fotoInputRef} onChange={handleFotoFile} className="hidden" />
                      {newKandidatFoto ? (
                        <div className="relative rounded border border-white/10 overflow-hidden">
                          <img src={newKandidatFoto} alt="Preview" className="w-full h-32 object-cover" />
                          <button type="button" onClick={() => { setNewKandidatFoto(null); if (fotoInputRef.current) fotoInputRef.current.value = '' }} className="absolute top-2 right-2 px-2 py-1 rounded bg-maroon-900/80 border border-maroon-700 text-rose-200 font-mono text-[10px] cursor-pointer">Hapus</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fotoInputRef.current?.click()} disabled={processingFoto} className="w-full border border-dashed border-white/15 hover:border-maroon-700 rounded py-4 flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50">
                          <span className="material-symbols-outlined text-xl">{processingFoto ? 'hourglass_top' : 'upload_file'}</span>
                          <span className="font-mono text-[11px]">{processingFoto ? 'Memproses foto…' : 'Klik untuk pilih foto'}</span>
                        </button>
                      )}
                    </div>
                    <button type="submit" disabled={submittingKandidat || categories.length === 0 || processingFoto} className="w-full py-2.5 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 hover:border-maroon-700 text-white font-mono text-xs font-medium cursor-pointer disabled:opacity-50">{submittingKandidat ? 'Mendaftarkan…' : 'Daftarkan Kandidat'}</button>
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

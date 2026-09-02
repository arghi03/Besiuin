import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function GachaPage({ onBack, userRole }) {
  const [pools, setPools] = useState([])
  const [selectedPool, setSelectedPool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Creation State
  const [newTema, setNewTema] = useState('')
  const [newTipe, setNewTipe] = useState('umum')
  const [newItemsText, setNewItemsText] = useState('')
  const [creating, setCreating] = useState(false)

  // Roll / Draw State
  const [rolling, setRolling] = useState(false)
  const [rollerText, setRollerText] = useState('')
  const [rolledResult, setRollerResult] = useState(null)
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false)

  // Group Shuffle State
  const [numGroups, setNumGroups] = useState(3)
  const [shuffledGroups, setShuffledGroups] = useState([])
  const [isShuffling, setIsShuffling] = useState(false)
  const [copiedWA, setCopiedWA] = useState(false)

  // Fetch all pools on mount
  useEffect(() => {
    fetchPools()
  }, [])

  const fetchPools = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gacha_pools')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          console.warn("Table 'gacha_pools' does not exist in Supabase. Using mock data.")
          setStatusMessage({
            type: 'warning',
            text: 'Tabel "gacha_pools" belum terdeteksi di database Supabase Anda. Anda dapat mencoba UI menggunakan data simulasi lokal.'
          })
          // Load Mock Pools
          const mockData = [
            {
              id: 1,
              nama_pool: "Mahasiswa Kelas B",
              tipe_pool: "anggota_kelas",
              list_item: [
                "Arghi Vianuri", "Rajif", "Pais", "Rapi", "Diki", 
                "Fajar", "Ahmad", "Budi", "Cantika", "Dino", 
                "Erwan", "Fiona", "Gilang", "Hana", "Indra"
              ]
            },
            {
              id: 2,
              nama_pool: "Topik Presentasi Web",
              tipe_pool: "topik_tugas",
              list_item: [
                "React State Management", "Supabase Auth & RLS", 
                "Tailwind CSS v4", "REST vs GraphQL", "PWA & Service Worker"
              ]
            }
          ]
          setPools(mockData)
          setSelectedPool(mockData[0])
        } else {
          throw error
        }
      } else {
        setPools(data || [])
        if (data && data.length > 0) {
          setSelectedPool(data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching pools:', err)
      setStatusMessage({ type: 'error', text: `Gagal memuat tema gacha: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Create new pool
  const handleCreatePool = async (e) => {
    e.preventDefault()
    if (!newTema.trim() || !newItemsText.trim()) {
      setStatusMessage({ type: 'error', text: 'Nama tema dan daftar item wajib diisi!' })
      return
    }

    const items = newItemsText
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0)

    if (items.length === 0) {
      setStatusMessage({ type: 'error', text: 'Daftar item tidak boleh kosong!' })
      return
    }

    try {
      setCreating(true)
      setStatusMessage(null)

      const payload = {
        nama_pool: newTema.trim(),
        tipe_pool: newTipe,
        list_item: items
      }

      const { data, error } = await supabase
        .from('gacha_pools')
        .insert([payload])
        .select()

      if (error) {
        if (error.code === '42P01') {
          // Local fallback
          const mockNew = {
            id: Date.now(),
            ...payload
          }
          setPools(prev => [mockNew, ...prev])
          setSelectedPool(mockNew)
          setStatusMessage({
            type: 'warning',
            text: 'Tema gacha ditambahkan ke preview lokal (Tabel "gacha_pools" belum dibuat).'
          })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: 'Tema gacha berhasil ditambahkan!' })
        await fetchPools()
        if (data && data.length > 0) {
          setSelectedPool(data[0])
        }
      }

      // Reset form
      setNewTema('')
      setNewItemsText('')
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menambahkan tema gacha: ${err.message}` })
    } finally {
      setCreating(false)
    }
  }

  // Draw 1 single random winner
  const drawSingleWinner = () => {
    if (!selectedPool || !selectedPool.list_item || selectedPool.list_item.length === 0) return

    setRolling(true)
    setRollerResult(null)
    setShuffledGroups([])

    const items = selectedPool.list_item
    let counter = 0
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * items.length)
      setRollerText(items[randomIndex])
      counter++

      if (counter > 20) {
        clearInterval(interval)
        // Set final winner
        const winnerIndex = Math.floor(Math.random() * items.length)
        const winner = items[winnerIndex]
        setRollerText(winner)
        setRollerResult(winner)
        setRolling(false)
        setIsWinnerModalOpen(true)
      }
    }, 100)
  }

  // Shuffle items into groups
  const shuffleIntoGroups = () => {
    if (!selectedPool || !selectedPool.list_item || selectedPool.list_item.length === 0) return
    if (numGroups < 2) return

    setIsShuffling(true)
    setRollerResult(null)
    setShuffledGroups([])
    setCopiedWA(false)

    setTimeout(() => {
      // Fisher-Yates Shuffle
      const items = [...selectedPool.list_item]
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]]
      }

      // Initialize groups
      const groups = Array.from({ length: numGroups }, () => [])
      
      // Distribute items evenly
      items.forEach((item, index) => {
        const groupIndex = index % numGroups
        groups[groupIndex].push(item)
      })

      setShuffledGroups(groups)
      setIsShuffling(false)
    }, 1000)
  }

  // Handle WhatsApp format copy for shuffled groups
  const handleCopyWAFormat = () => {
    if (!shuffledGroups || shuffledGroups.length === 0) return

    let text = `*HASIL PEMBAGIAN KELOMPOK*\n`
    if (selectedPool?.nama_pool) {
      text += `📌 *Tema:* ${selectedPool.nama_pool}\n`
    }
    text += `👥 *Total Kelompok:* ${shuffledGroups.length}\n`
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`

    shuffledGroups.forEach((group, idx) => {
      text += `*KELOMPOK ${idx + 1}*\n`
      group.forEach((member, mIdx) => {
        text += `${mIdx + 1}. ${member}\n`
      })
      text += `\n`
    })

    text += `━━━━━━━━━━━━━━━━━━━━━\n`
    text += `_Diacak secara adil & otomatis via Besiuin Space_`

    navigator.clipboard.writeText(text)
    setCopiedWA(true)
    setTimeout(() => {
      setCopiedWA(false)
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col justify-between selection:bg-brand-maroon selection:text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-brand-navy/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-brand-maroon/10 rounded-full blur-[120px] pointer-events-none"></div>

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
              G
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">All-Round Gacha</h1>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Space
              </span>
            </div>
          </div>
          <span className="text-xs bg-brand-maroon/10 border border-brand-maroon/30 text-brand-maroon-light px-3 py-1 rounded-full font-mono">
            Sistem Gacha Adil
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left column: Setup & Create Pool */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Select Existing Pool */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="h-5 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
              Pilih Tema Gacha
            </h2>

            {loading ? (
              <div className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
            ) : pools.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada tema gacha. Buat tema gacha di bawah!</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedPool?.id || ''}
                  onChange={(e) => {
                    const pool = pools.find(p => p.id === parseInt(e.target.value))
                    setSelectedPool(pool)
                    setRollerResult(null)
                    setShuffledGroups([])
                  }}
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm text-white focus:border-brand-maroon focus:outline-none cursor-pointer"
                >
                  {pools.map(p => (
                    <option key={p.id} value={p.id} className="bg-brand-dark text-white">
                      {p.nama_tema} ({p.tipe})
                    </option>
                  ))}
                </select>

                {selectedPool && (
                  <div className="bg-white/5 rounded-2xl p-4 mt-3 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Daftar Anggota / Item ({selectedPool.list_item.length}):</span>
                    <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                      {selectedPool.list_item.map((item, idx) => (
                        <span key={idx} className="text-xs bg-brand-navy/60 text-slate-200 border border-white/5 px-2.5 py-1 rounded-lg">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Create New Pool */}
          {(userRole === 'admin' || userRole === 'owner') && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="h-5 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                Buat Tema Gacha Baru
              </h2>

              {statusMessage && (
                <div className={`p-4 rounded-xl text-xs mb-4 border ${
                  statusMessage.type === 'success' ? 'bg-emerald-950/45 border-emerald-800 text-emerald-300' :
                  statusMessage.type === 'warning' ? 'bg-amber-950/45 border-amber-800 text-amber-300' :
                  'bg-rose-950/45 border-rose-800 text-rose-300'
                }`}>
                  <p className="leading-relaxed">{statusMessage.text}</p>
                </div>
              )}

              <form onSubmit={handleCreatePool} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nama Tema
                  </label>
                  <input
                    type="text"
                    value={newTema}
                    onChange={(e) => setNewTema(e.target.value)}
                    placeholder="Contoh: Pembagian Kelompok Sistem Pendukung Keputusan"
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Tipe Gacha
                  </label>
                  <select
                    value={newTipe}
                    onChange={(e) => setNewTipe(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                  >
                    <option value="kelompok">Kelompok / Shuffle</option>
                    <option value="piket">Piket Kelas</option>
                    <option value="umum">Umum / Draw 1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    List Anggota / Item <span className="text-[10px] text-slate-500 font-normal">(pisahkan dengan koma)</span>
                  </label>
                  <textarea
                    value={newItemsText}
                    onChange={(e) => setNewItemsText(e.target.value)}
                    placeholder="Ahmad, Budi, Cantika, Dino, Erwan"
                    rows="3"
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none resize-none text-white"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Membuat...' : 'Simpan Tema Gacha'}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Right column: Action Playground */}
        <section className="lg:col-span-7 space-y-6">
          
          {selectedPool ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-8 min-h-[400px] flex flex-col justify-between">
              
              <div className="border-b border-white/5 pb-4">
                <span className="text-xs bg-brand-maroon/20 border border-brand-maroon/30 text-brand-maroon-light px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[9px]">
                  Tipe: {selectedPool.tipe}
                </span>
                <h3 className="text-2xl font-bold text-white mt-2 font-serif">
                  {selectedPool.nama_tema}
                </h3>
              </div>

              {/* Playground Screens */}
              <div className="flex-grow flex flex-col justify-center items-center py-6">
                
                {/* 1. Rolling screen (Gacha Draw One) */}
                {rolling && (
                  <div className="text-center space-y-4 animate-pulse">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">MEMILIH SECARA ACAK...</div>
                    <div className="text-4xl md:text-5xl font-black text-brand-maroon-light font-serif truncate max-w-md px-4">
                      {rollerText}
                    </div>
                    <div className="h-1 bg-brand-maroon w-32 mx-auto rounded-full overflow-hidden">
                      <div className="h-full bg-brand-maroon-light animate-infinite-scroll w-1/2"></div>
                    </div>
                  </div>
                )}

                {/* 2. Winner Screen (Result Draw One) */}
                {!rolling && rolledResult && (
                  <div className="text-center space-y-4 animate-scale-up">
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">★ HASIL DRAW ★</div>
                    <div className="bg-gradient-to-tr from-brand-maroon/20 to-brand-navy/20 border border-brand-maroon/50 rounded-2xl p-8 max-w-sm mx-auto shadow-2xl relative">
                      <div className="absolute -top-3 -right-3 text-2xl">👑</div>
                      <div className="text-3xl md:text-4xl font-extrabold text-white font-serif truncate">
                        {rolledResult}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Shuffle Groups Results Screen */}
                {!isShuffling && shuffledGroups.length > 0 && (
                  <div className="w-full space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>🎉</span> Hasil Pembagian ({shuffledGroups.length} Kelompok)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {selectedPool ? (selectedPool.nama_pool || selectedPool.nama_tema) : 'Kelompok'} telah selesai diacak secara merata.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyWAFormat}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                          copiedWA
                            ? 'bg-emerald-600 text-white border border-emerald-500 shadow-emerald-950/40'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 hover:border-emerald-500'
                        }`}
                        title="Salin semua daftar kelompok untuk WhatsApp"
                      >
                        <span>{copiedWA ? '✓' : '📋'}</span>
                        {copiedWA ? 'Format WA Tersalin!' : 'Salin Format WA'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {shuffledGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 hover:border-brand-maroon/30 transition-colors">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <h5 className="font-bold text-xs uppercase text-brand-maroon-light">
                              Kelompok {groupIdx + 1}
                            </h5>
                            <span className="text-[10px] font-mono text-slate-500">
                              {group.length} Orang
                            </span>
                          </div>
                          <ul className="space-y-1.5">
                            {group.map((item, itemIdx) => (
                              <li key={itemIdx} className="text-xs text-slate-200 bg-brand-dark/40 px-2 py-1 rounded border border-white/5 flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Shuffling loader screen */}
                {isShuffling && (
                  <div className="text-center space-y-4">
                    <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 font-mono">Mengacak dan membagi anggota...</p>
                  </div>
                )}

                {/* Default Idle Screen */}
                {!rolling && !rolledResult && !isShuffling && shuffledGroups.length === 0 && (
                  <div className="text-center text-slate-400 space-y-3 py-10 max-w-sm">
                    <div className="text-5xl animate-bounce">🎲</div>
                    <h4 className="font-bold text-white text-sm">Mainkan Gacha</h4>
                    <p className="text-xs">
                      Pilih aksi gacha di bawah. Anda dapat melakukan draw tunggal (1 orang) atau mengacak ke dalam beberapa kelompok secara langsung.
                    </p>
                  </div>
                )}

              </div>

              {/* Action Buttons Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                
                {/* Draw 1 Person */}
                <div className="space-y-2">
                  <button
                    onClick={drawSingleWinner}
                    disabled={rolling || isShuffling}
                    className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md shadow-brand-maroon/20 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    Draw 1 Orang Acak
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">Berguna untuk presentasi, piket, atau kuis spontan.</p>
                </div>

                {/* Shuffle Groups */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={numGroups}
                      onChange={(e) => setNumGroups(Math.max(2, parseInt(e.target.value) || 2))}
                      placeholder="Kelompok"
                      className="w-20 rounded-xl border border-white/10 bg-brand-dark p-2 text-center text-sm focus:border-brand-maroon focus:outline-none"
                    />
                    <button
                      onClick={shuffleIntoGroups}
                      disabled={rolling || isShuffling}
                      className="flex-grow bg-brand-navy hover:bg-brand-navy-hover text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md border border-white/5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      Bagi Kelompok
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">Bagi seluruh anggota di atas menjadi kelompok acak.</p>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center min-h-[400px] flex flex-col justify-center items-center">
              <p className="text-slate-400">Tidak ada tema gacha yang aktif.</p>
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

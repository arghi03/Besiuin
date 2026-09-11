import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function GachaPage() {
  const [gachaMode, setGachaMode] = useState('presenter') // 'presenter' | 'groups' | 'custom'
  const [members, setMembers] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [groupSize, setGroupSize] = useState(4)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winnerResult, setWinnerResult] = useState(null)
  const [groupResults, setGroupResults] = useState([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetchClassMembers()
  }, [])

  const fetchClassMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('whitelist_users')
        .select('nama_mahasiswa')
        .order('nama_mahasiswa', { ascending: true })

      if (!error && data && data.length > 0) {
        setMembers(data.map(d => d.nama_mahasiswa))
      } else {
        // Fallback members list
        setMembers([
          "Muhammad Rajif Raditya", "Arghi Vianuri", "Ahmad Fauzi", "Budi Santoso", 
          "Cantika Putri", "Dino Prasetyo", "Erwan Setiawan", "Fiona Maharani", 
          "Gilang Ramadhan", "Hana Pertiwi", "Indra Wijaya", "Khalifa Chairunnisa"
        ])
      }
    } catch (err) {
      console.error('Error loading class members:', err)
    }
  }

  const handleSpinPresenter = () => {
    const list = gachaMode === 'custom' 
      ? customInput.split('\n').filter(s => s.trim()) 
      : members

    if (list.length === 0) {
      alert("Daftar peserta kosong!")
      return
    }

    setIsSpinning(true)
    setWinnerResult(null)

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * list.length)
      const selected = list[randomIndex]
      setWinnerResult(selected)
      setIsSpinning(false)

      setHistory(prev => [{
        id: Date.now(),
        type: gachaMode === 'presenter' ? 'Presenter Pick' : 'Custom Draw',
        result: selected,
        timestamp: new Date().toLocaleTimeString('id-ID')
      }, ...prev])
    }, 2000)
  }

  const handleGenerateGroups = () => {
    const list = [...members].sort(() => Math.random() - 0.5)
    if (list.length === 0) return

    setIsSpinning(true)
    setGroupResults([])

    setTimeout(() => {
      const resultGroups = []
      for (let i = 0; i < list.length; i += groupSize) {
        resultGroups.push(list.slice(i, i + groupSize))
      }
      setGroupResults(resultGroups)
      setIsSpinning(false)

      setHistory(prev => [{
        id: Date.now(),
        type: `Pembagian ${resultGroups.length} Kelompok`,
        result: `${resultGroups.length} Kelompok Terbentuk`,
        timestamp: new Date().toLocaleTimeString('id-ID')
      }, ...prev])
    }, 2000)
  }

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
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Sistem Undian Acak & Adil</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              All-Round Gacha <span className="text-maroon-600">Besiuin Space</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Gacha acak untuk pembagian kelompok atau giliran presentasi.
            </p>
          </div>
        </div>

        {/* MODE SELECTOR */}
        <div className="grid grid-cols-3 gap-3 bg-[#11141c]/90 p-2 rounded-lg border border-white/10 font-mono text-xs">
          <button
            onClick={() => { setGachaMode('presenter'); setWinnerResult(null); setGroupResults([]); }}
            className={`py-2.5 px-3 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              gachaMode === 'presenter' ? 'bg-maroon-800 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">person_search</span>
            <span>Presenter Pick</span>
          </button>

          <button
            onClick={() => { setGachaMode('groups'); setWinnerResult(null); setGroupResults([]); }}
            className={`py-2.5 px-3 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              gachaMode === 'groups' ? 'bg-maroon-800 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            <span>Kelompok Tugas</span>
          </button>

          <button
            onClick={() => { setGachaMode('custom'); setWinnerResult(null); setGroupResults([]); }}
            className={`py-2.5 px-3 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              gachaMode === 'custom' ? 'bg-maroon-800 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            <span>Custom List</span>
          </button>
        </div>

        {/* MAIN INTERACTIVE DISPLAY AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Spin Wheel / Slot Display (8 cols) */}
          <div className="lg:col-span-8 bg-[#11141c]/90 border border-white/10 rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-6">
            
            {/* Slot Box */}
            <div className="w-full max-w-lg bg-[#0b0e14] border-2 border-white/10 rounded-xl p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden shadow-2xl">
              
              {isSpinning ? (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-mono text-sm text-zinc-300">Mengacak nama secara adil...</p>
                </div>
              ) : winnerResult ? (
                <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest bg-[#10231b] px-3 py-1 rounded border border-emerald-500/30">
                    Hasil Undian
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                    {winnerResult}
                  </h2>
                  <span className="text-xs font-mono text-zinc-500">🎉 Selamat & Semoga Berhasil!</span>
                </div>
              ) : groupResults.length > 0 ? (
                <div className="w-full text-left font-mono text-xs space-y-4 max-h-[300px] overflow-y-auto">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest bg-[#10231b] px-3 py-1 rounded border border-emerald-500/30 inline-block mb-2">
                    Hasil Pembagian {groupResults.length} Kelompok
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groupResults.map((grp, idx) => (
                      <div key={idx} className="bg-[#151922] p-3 rounded border border-white/10 space-y-1">
                        <div className="font-bold text-rose-300">Kelompok {idx + 1}</div>
                        <ul className="text-zinc-300 list-disc list-inside space-y-0.5">
                          {grp.map((m, mIdx) => (
                            <li key={mIdx} className="truncate">{m}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500 font-mono">
                  <span className="material-symbols-outlined text-4xl">casino</span>
                  <p className="text-xs">Klik tombol di bawah untuk memulai acakan gacha.</p>
                </div>
              )}

            </div>

            {/* Controls */}
            {gachaMode === 'groups' ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg font-mono text-xs">
                <div className="flex items-center gap-2 bg-[#0b0e14] px-3 py-2 rounded border border-white/10 w-full sm:w-auto">
                  <span className="text-zinc-400">Ukuran Kelompok:</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 2)}
                    className="w-12 bg-[#151922] border border-white/10 rounded text-center text-white py-0.5"
                  />
                  <span className="text-zinc-500">Orang</span>
                </div>
                <button
                  onClick={handleGenerateGroups}
                  disabled={isSpinning}
                  className="flex-1 w-full py-3 px-6 rounded bg-[#991b1b] hover:bg-[#7f1d1d] active:bg-[#680007] text-white font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">casino</span>
                  <span>Acak Pembagian Kelompok</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSpinPresenter}
                disabled={isSpinning}
                className="w-full max-w-lg py-3 px-6 rounded bg-[#991b1b] hover:bg-[#7f1d1d] active:bg-[#680007] text-white font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-sm">casino</span>
                <span>Mulai Gacha {gachaMode === 'presenter' ? 'Presenter' : 'Custom'}</span>
              </button>
            )}

          </div>

          {/* Right Column: Custom Input / History (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {gachaMode === 'custom' && (
              <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col gap-2 font-mono text-xs">
                <span className="font-semibold text-white uppercase tracking-wider">Daftar Kandidat (Custom)</span>
                <p className="text-[11px] text-zinc-400">Tulis satu nama per baris:</p>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Nama 1&#10;Nama 2&#10;Nama 3"
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 resize-none"
                  rows="6"
                ></textarea>
              </div>
            )}

            {/* History Log */}
            <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 font-mono text-xs">
                <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-maroon-600">history</span>
                  Riwayat Gacha
                </span>
                <span className="text-[10px] text-zinc-500">{history.length} Sesi</span>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto font-mono text-xs">
                {history.length === 0 ? (
                  <p className="text-zinc-500 text-center py-4 text-[11px]">Belum ada riwayat undian.</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-2.5 rounded bg-[#0b0e14] border border-white/10 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="text-rose-300 font-semibold">{item.type}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <span className="text-white font-medium truncate">{item.result}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 relative z-10 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • All-Round Gacha System
      </footer>
    </div>
  )
}

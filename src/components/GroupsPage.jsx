export default function GroupsPage({ onBack, onNavigateToGacha }) {
  const handleGoToGacha = () => {
    if (onNavigateToGacha) {
      onNavigateToGacha()
    } else if (onBack) {
      onBack()
    }
  }

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
                className="mr-2 p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white font-bold text-xs"
              >
                ← Hub
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-maroon to-red-950 flex items-center justify-center font-bold text-white text-lg shadow-lg">
              📂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">Kelompok Tugas</h1>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  ⏳ Freeze
                </span>
              </div>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Space
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 py-16 flex-grow w-full flex flex-col items-center justify-center relative z-10 text-center space-y-8">
        
        {/* Central Card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden">
          
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-brand-maroon/20 border border-amber-500/30 flex items-center justify-center text-4xl mx-auto shadow-inner">
            🎲
          </div>

          <div className="space-y-3">
            <span className="inline-block text-[11px] font-mono uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
              Fitur Sedang Di-Freeze
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pembagian Kelompok Tersedia di Halaman Gacha
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              Halaman ini sementara dibekukan. Untuk melakukan <strong className="text-white">pembagian kelompok tugas kuliah secara acak, adil, dan otomatis</strong>, silakan gunakan fitur yang sudah lengkap tersedia di halaman <strong className="text-brand-maroon-light">All-Round Gacha</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleGoToGacha}
              className="w-full sm:w-auto bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-brand-maroon/25 hover:shadow-brand-maroon/40 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🎲</span> Buka All-Round Gacha
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-3.5 px-6 rounded-2xl text-sm transition-all cursor-pointer"
              >
                ← Kembali ke Hub
              </button>
            )}
          </div>

          {/* Upcoming preview info */}
          <div className="mt-8 pt-6 border-t border-white/5 text-left bg-brand-dark/30 rounded-2xl p-4 sm:p-6 border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <span>🚀</span> Rencana Pembaruan Halaman Ini:
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Penyimpanan daftar kelompok tugas per mata kuliah secara permanen</li>
              <li>Generator format teks WhatsApp untuk koordinasi ketua kelompok</li>
              <li>Integrasi link repo GitHub dan drive dokumen projek kelompok</li>
            </ul>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-brand-dark/80 py-8 text-center text-xs text-slate-500 mt-12">
        <p>© 2026 Besiuin (Sistem Informasi UIN). All rights reserved.</p>
      </footer>
    </div>
  )
}

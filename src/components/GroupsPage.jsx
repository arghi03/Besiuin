export default function GroupsPage({ onBack, onNavigateToGacha }) {
  const handleGoToGacha = () => {
    if (onNavigateToGacha) {
      onNavigateToGacha()
    } else if (onBack) {
      onBack()
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      <main className="relative z-10 pt-24 pb-20 max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-8">

        <div className="text-center space-y-3 fade-up">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-xs">lock</span>
            Fitur Dibekukan
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Kelompok <span className="text-maroon-600">Tugas</span>
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
            Halaman ini sementara dibekukan. Pembagian kelompok tugas secara{' '}
            <span className="text-white font-medium">acak, adil, dan otomatis</span> dapat dilakukan
            langsung di halaman <span className="text-rose-300 font-medium">All-Round Gacha</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleGoToGacha}
            className="w-full sm:w-auto px-6 py-3 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">casino</span>
            Buka All-Round Gacha
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-xs transition-colors cursor-pointer"
            >
              ← Kembali ke Beranda
            </button>
          )}
        </div>

        {/* Roadmap */}
        <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-sm text-maroon-600">rocket_launch</span>
            Rencana Pembaruan
          </h3>
          <ul className="space-y-2.5">
            {[
              'Penyimpanan daftar kelompok tugas per mata kuliah secara permanen',
              'Generator format teks WhatsApp untuk koordinasi ketua kelompok',
              'Integrasi link repo GitHub dan drive dokumen projek kelompok',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-zinc-400 leading-relaxed">
                <span className="font-mono text-[10px] text-zinc-500 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </main>

      <footer className="relative z-10 w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Kelompok Tugas
      </footer>
    </div>
  )
}

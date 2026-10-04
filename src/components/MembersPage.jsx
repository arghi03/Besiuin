import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function MembersPage({ onBack }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('whitelist_users')
          .select('nama_mahasiswa, username, foto_url, role')
          .order('nama_mahasiswa', { ascending: true })

        if (error) throw error
        setMembers(data || [])
      } catch (err) {
        console.error('Error fetching members:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [])

  const initials = (name) =>
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-zinc-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-maroon-700"></span>
              <span>Anggota Terdaftar</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Daftar <span className="text-maroon-600">Anggota</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Direktori mahasiswa dan anggota aktif Kelas B Sistem Informasi.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded bg-[#11141c]/90 border border-white/10 text-zinc-300 font-mono text-xs hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2 self-start"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Kembali
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
            Memuat data anggota…
          </div>
        ) : members.length === 0 ? (
          <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center">
            <span className="material-symbols-outlined text-3xl text-zinc-600 block mb-2">group</span>
            <p className="text-zinc-400 font-mono text-xs">Belum ada anggota terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m, idx) => {
              const displayName = m.nama_mahasiswa || m.username || 'Mahasiswa'
              const roleColor =
                m.role === 'owner'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : m.role === 'admin'
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30'

              return (
                <div
                  key={m.username || m.nama_mahasiswa || idx}
                  className="bg-[#11141c]/90 border border-white/10 rounded-lg p-4 flex items-center gap-4 hover:border-white/20 transition-colors"
                >
                  {m.foto_url ? (
                    <img
                      src={m.foto_url}
                      alt={displayName}
                      className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-maroon-900/60 border border-maroon-800 flex items-center justify-center font-mono font-bold text-rose-200 shrink-0 text-lg">
                      {initials(displayName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white truncate" title={displayName}>
                        {displayName}
                      </p>
                      {m.role && m.role !== 'member' && (
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${roleColor}`}>
                          {m.role}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                      {m.username ? `@${m.username}` : 'Anggota Kelas'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="relative z-10 w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Direktori Anggota Kelas Sistem Informasi
      </footer>
    </div>
  )
}

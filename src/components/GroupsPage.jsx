import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function GroupsPage({ onBack, userRole }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Groups Form State
  const [namaMatkul, setNamaMatkul] = useState('')
  const [formGroups, setFormGroups] = useState([
    { id: Date.now(), nama_kelompok: '', anggotaText: '', tema: '', link_projek: '' }
  ])
  const [submittingGroup, setSubmittingGroup] = useState(false)

  const addFormGroup = () => {
    setFormGroups(prev => [
      ...prev,
      { id: Date.now() + Math.random(), nama_kelompok: '', anggotaText: '', tema: '', link_projek: '' }
    ])
  }

  const removeFormGroup = (id) => {
    if (formGroups.length > 1) {
      setFormGroups(prev => prev.filter(g => g.id !== id))
    }
  }

  const updateFormGroup = (id, field, value) => {
    setFormGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, [field]: value } : g))
    )
  }

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)

      const { data: groupsData, error: groupsError } = await supabase
        .from('class_groups')
        .select('*')
        .order('nama_matkul', { ascending: true })

      if (groupsError && groupsError.code === '42P01') {
        console.warn("Class groups table does not exist in Supabase. Using mock data.")
        setStatusMessage({
          type: 'warning',
          text: 'Tabel "class_groups" belum terdeteksi di database. Menggunakan data simulasi lokal untuk preview.'
        })

        // Mock groups
        setGroups([
          {
            id: 1,
            nama_matkul: "Pemrograman Web",
            nama_kelompok: "Kelompok Coder UIN",
            anggota: ["Arghi Vianuri", "Rajif", "Pais"],
            tema: "Portal Kelas Interaktif (Besiuin)",
            link_projek: "https://github.com/arghi/besiuin"
          },
          {
            id: 2,
            nama_matkul: "Pemrograman Web",
            nama_kelompok: "Group React-G",
            anggota: ["Rapi", "Diki", "Fajar"],
            tema: "E-Commerce Mahasiswa UIN",
            link_projek: ""
          },
          {
            id: 3,
            nama_matkul: "Basis Data",
            nama_kelompok: "SQL Master B",
            anggota: ["Arghi Vianuri", "Rapi", "Diki"],
            tema: "Sistem Manajemen Perpustakaan",
            link_projek: "https://supabase.com"
          }
        ])
      } else {
        if (groupsError) throw groupsError
        setGroups(groupsData || [])
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat data: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Handle WhatsApp format copy
  const copyWAFormat = (group) => {
    const membersList = group.anggota
      .map((name, index) => `${index + 1}. ${name}`)
      .join('\n')

    const waText = `*Kelompok ${group.nama_kelompok} - ${group.nama_matkul}*\n${group.tema ? `*Tema: ${group.tema}*\n` : ''}\nAnggota:\n${membersList}\n\n${group.link_projek ? `Link Projek: ${group.link_projek}` : ''}`

    navigator.clipboard.writeText(waText.trim())
    setCopiedId(group.id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  // Create new group
  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!namaMatkul.trim()) {
      setStatusMessage({ type: 'error', text: 'Nama Mata Kuliah wajib diisi!' })
      return
    }

    // Validate all formGroups
    const invalidGroup = formGroups.find(
      g => !g.nama_kelompok.trim() || !g.anggotaText.trim()
    )
    if (invalidGroup) {
      setStatusMessage({ type: 'error', text: 'Semua kelompok harus memiliki Nama Kelompok dan minimal 1 Anggota!' })
      return
    }

    // Map groups for bulk insertion
    const groupsToInsert = formGroups.map(g => {
      const members = g.anggotaText
        .split(',')
        .map(m => m.trim())
        .filter(Boolean)
      return {
        nama_matkul: namaMatkul.trim(),
        nama_kelompok: g.nama_kelompok.trim(),
        anggota: members,
        tema: g.tema?.trim() || '',
        link_projek: g.link_projek.trim() || ''
      }
    })

    try {
      setSubmittingGroup(true)
      setStatusMessage(null)

      const { error } = await supabase
        .from('class_groups')
        .insert(groupsToInsert)

      if (error) {
        if (error.code === '42P01') {
          // Local simulate preview
          const mockNews = groupsToInsert.map((g, idx) => ({
            id: Date.now() + idx,
            ...g
          }))
          setGroups(prev => [...prev, ...mockNews])
          setStatusMessage({
            type: 'warning',
            text: `${groupsToInsert.length} kelompok ditambahkan ke preview lokal (Tabel "class_groups" belum dibuat di database).`
          })
        } else {
          throw error
        }
      } else {
        setStatusMessage({ type: 'success', text: `Berhasil menambahkan ${groupsToInsert.length} kelompok tugas sekaligus!` })
        await fetchGroups()
      }

      // Reset
      setNamaMatkul('')
      setFormGroups([{ id: Date.now(), nama_kelompok: '', anggotaText: '', tema: '', link_projek: '' }])
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan kelompok: ${err.message}` })
    } finally {
      setSubmittingGroup(false)
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
                className="mr-2 p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white font-bold"
              >
                ← Hub
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-maroon to-red-900 flex items-center justify-center font-bold text-white text-lg shadow-lg">
              📂
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">Kelompok Tugas</h1>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase mt-0.5">
                Besiuin Space
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Status Alert Notification */}
        {statusMessage && (
          <div className="lg:col-span-12 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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

        {/* Left Side: Create Group Form */}
        {(userRole === 'admin' || userRole === 'owner') && (
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <div className="border-b border-white/5 pb-4 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="h-5 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                  Tambah Kelompok
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  PJ Kelas atau mahasiswa dapat mengunggah daftar beberapa kelompok sekaligus untuk mata kuliah tertentu.
                </p>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nama Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={namaMatkul}
                    onChange={(e) => setNamaMatkul(e.target.value)}
                    placeholder="Contoh: Pemrograman Web"
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white font-semibold"
                    required
                  />
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Daftar Kelompok:</span>
                  {formGroups.map((group, index) => (
                    <div key={group.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative group">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-brand-maroon-light">Kelompok #{index + 1}</span>
                        {formGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFormGroup(group.id)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={group.nama_kelompok}
                          onChange={(e) => updateFormGroup(group.id, 'nama_kelompok', e.target.value)}
                          placeholder="Nama Kelompok (misal: Kelompok 1)"
                          className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-xs focus:border-brand-maroon focus:outline-none text-white font-medium"
                          required
                        />
                      </div>

                      <div>
                        <textarea
                          value={group.anggotaText}
                          onChange={(e) => updateFormGroup(group.id, 'anggotaText', e.target.value)}
                          placeholder="Anggota (pisahkan dengan koma: Budi, Wati, Andi)"
                          rows="2"
                          className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-xs focus:border-brand-maroon focus:outline-none resize-none text-white"
                          required
                        ></textarea>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={group.tema}
                          onChange={(e) => updateFormGroup(group.id, 'tema', e.target.value)}
                          placeholder="Tema Proyek / Judul Tugas (Opsional)"
                          className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-xs focus:border-brand-maroon focus:outline-none text-white font-medium"
                        />
                      </div>

                      <div>
                        <input
                          type="url"
                          value={group.link_projek}
                          onChange={(e) => updateFormGroup(group.id, 'link_projek', e.target.value)}
                          placeholder="Link Projek / Repository (Opsional)"
                          className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-xs focus:border-brand-maroon focus:outline-none text-white font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addFormGroup}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Tambah Kelompok Lain
                </button>

                <button
                  type="submit"
                  disabled={submittingGroup}
                  className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {submittingGroup ? 'Menyimpan Semua...' : `Simpan Semua Kelompok (${formGroups.length})`}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Right Side: Groups List */}
        <section className={`${userRole === 'member' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="h-6 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
              Daftar Kelompok Tugas
            </h2>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-bold">
              {groups.length} Kelompok
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 mt-2">Memuat kelompok...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <p className="text-slate-400 text-sm">Belum ada kelompok tugas yang didaftarkan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div 
                  key={group.id} 
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/30 transition-all shadow-lg flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-brand-maroon-light bg-brand-maroon/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[9px]">
                        {group.nama_matkul}
                      </span>
                      {group.link_projek && (
                        <a 
                          href={group.link_projek} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-slate-400 hover:text-white underline font-mono text-[10px]"
                        >
                          🔗 Link Projek
                        </a>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white">{group.nama_kelompok}</h3>

                    {group.tema && (
                      <div className="text-xs text-slate-300 font-medium">
                        <span className="text-slate-500 font-normal">Tema:</span> {group.tema}
                      </div>
                    )}

                    <div className="space-y-1 pt-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Anggota Kelompok:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {group.anggota.map((name, idx) => (
                          <span key={idx} className="text-xs bg-brand-dark border border-white/5 px-2.5 py-1 rounded-lg text-slate-300">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-2 flex justify-end">
                    <button
                      onClick={() => copyWAFormat(group)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      {copiedId === group.id ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span>Format WA Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Salin Format WA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
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

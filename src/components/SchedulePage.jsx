import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function SchedulePage({ onBack, userRole }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)

  // Filters
  const [selectedSemester, setSelectedSemester] = useState('5')
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [namaMatkul, setNamaMatkul] = useState('')
  const [hari, setHari] = useState('Senin')
  const [jamMulai, setJamMulai] = useState('')
  const [jamSelesai, setJamSelesai] = useState('')
  const [ruangan, setRuangan] = useState('')
  const [namaDosen, setNamaDosen] = useState('')
  const [semesterInput, setSemesterInput] = useState('5')
  const [linkKelas, setLinkKelas] = useState('')
  const [pjMatkul, setPjMatkul] = useState('')
  const [editingScheduleId, setEditingScheduleId] = useState(null)
  const [students, setStudents] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  useEffect(() => {
    fetchSchedules()
    fetchStudents()
  }, [])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)

      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .order('hari')
        .order('jam_mulai', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          // Mock data
          setSchedules([
            { id: 1, nama_matkul: "Manajemen Proyek Teknologi Informasi", hari: "Selasa", jam_mulai: "10:10", jam_selesai: "12:40", ruangan: "A.501", nama_dosen: "Prof. Dr. Syopiansyah Jaya Putra, M.Si.", semester: 5, link_kelas: "https://classroom.google.com", pj_matkul: "Muhammad Ilham Akbar" },
            { id: 2, nama_matkul: "Metodologi Penelitian", hari: "Selasa", jam_mulai: "13:30", jam_selesai: "16:00", ruangan: "A.413", nama_dosen: "A'ang Subiyakto, M.Kom., Ph.D", semester: 5, link_kelas: "https://classroom.google.com", pj_matkul: "Khalifa Chairunnisa" },
            { id: 3, nama_matkul: "Pemrograman Web", hari: "Senin", jam_mulai: "08:00", jam_selesai: "09:40", ruangan: "Lab 3", nama_dosen: "Dr. Arghi Vianuri", semester: 5, link_kelas: "", pj_matkul: "Arghi Vianuri" },
            { id: 4, nama_matkul: "Pengantar Teknologi Informasi", hari: "Senin", jam_mulai: "08:00", jam_selesai: "09:40", ruangan: "102", nama_dosen: "Dr. Suharjo", semester: 1, link_kelas: "", pj_matkul: "Erwan" },
          ])
        } else {
          throw error
        }
      } else {
        setSchedules(data || [])
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal memuat jadwal: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase.from('whitelist_users').select('nama_mahasiswa').order('nama_mahasiswa', { ascending: true })
      if (!error && data) setStudents(data)
    } catch (err) {
      console.error('Error loading students list:', err.message)
    }
  }

  const handleSaveSchedule = async (e) => {
    e.preventDefault()
    if (!namaMatkul.trim() || !hari || !jamMulai || !jamSelesai || !namaDosen.trim() || !pjMatkul.trim()) {
      setStatusMessage({ type: 'error', text: 'Kolom Matkul, Hari, Jam Mulai/Selesai, Dosen, dan PJ wajib diisi!' })
      return
    }

    try {
      setSubmitting(true)
      setStatusMessage(null)

      const schedulePayload = {
        nama_matkul: namaMatkul.trim(),
        hari: hari,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        ruangan: ruangan.trim() || 'TBA',
        nama_dosen: namaDosen.trim(),
        semester: parseInt(semesterInput),
        link_kelas: linkKelas.trim() || null,
        pj_matkul: pjMatkul.trim()
      }

      if (editingScheduleId) {
        const { error } = await supabase.from('class_schedules').update(schedulePayload).eq('id', editingScheduleId)
        if (error && error.code === '42P01') {
          setSchedules(prev => prev.map(s => s.id === editingScheduleId ? { ...s, ...schedulePayload } : s))
        } else {
          await fetchSchedules()
        }
      } else {
        const { error } = await supabase.from('class_schedules').insert([schedulePayload])
        if (error && error.code === '42P01') {
          setSchedules(prev => [...prev, { id: Date.now(), ...schedulePayload }])
        } else {
          await fetchSchedules()
        }
      }

      // Reset
      setNamaMatkul('')
      setHari('Senin')
      setJamMulai('')
      setJamSelesai('')
      setRuangan('')
      setNamaDosen('')
      setLinkKelas('')
      setPjMatkul('')
      setEditingScheduleId(null)
      setIsFormModalOpen(false)
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan jadwal: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSchedule = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jadwal mata kuliah "${name}"?`)) return
    try {
      setStatusMessage(null)
      const { error } = await supabase.from('class_schedules').delete().eq('id', id)
      if (error && error.code === '42P01') {
        setSchedules(prev => prev.filter(s => s.id !== id))
      } else {
        await fetchSchedules()
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menghapus jadwal: ${err.message}` })
    }
  }

  const handleEditClick = (schedule) => {
    setNamaMatkul(schedule.nama_matkul)
    setHari(schedule.hari)
    setSemesterInput(schedule.semester.toString())
    setJamMulai(schedule.jam_mulai ? schedule.jam_mulai.substring(0, 5) : '')
    setJamSelesai(schedule.jam_selesai ? schedule.jam_selesai.substring(0, 5) : '')
    setRuangan(schedule.ruangan === 'TBA' ? '' : schedule.ruangan)
    setNamaDosen(schedule.nama_dosen)
    setLinkKelas(schedule.link_kelas || '')
    setPjMatkul(schedule.pj_matkul || '')
    setEditingScheduleId(schedule.id)
    setIsFormModalOpen(true)
  }

  const filteredSchedules = schedules.filter(s => {
    const matchesSemester = s.semester.toString() === selectedSemester
    const matchesQuery = s.nama_matkul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.nama_dosen.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSemester && matchesQuery
  })

  const getSchedulesForDay = (dayName) => {
    return filteredSchedules
      .filter(s => s.hari.toLowerCase() === dayName.toLowerCase())
      .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai))
  }

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">
      
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>


      {/* MAIN CONTENT */}
      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        
        {/* HEADER TITLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-xs text-zinc-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Arsip Jadwal Kuliah</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Jadwal Perkuliahan <span className="text-maroon-600">Semester {selectedSemester}</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Jadwal harian kelas per semester, ruangan, dosen pengampu, dan link kelas online.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(userRole === 'admin' || userRole === 'owner') && (
              <button
                onClick={() => {
                  setEditingScheduleId(null)
                  setIsFormModalOpen(true)
                }}
                className="px-4 py-2 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Tambah Jadwal</span>
              </button>
            )}
          </div>
        </div>

        {/* SEMESTER FILTER TABS & SEARCH BAR */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#11141c]/90 p-4 rounded-lg border border-white/10">
          
          {/* Semester Selector */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="text-zinc-400 mr-2">Semester:</span>
            {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedSemester === sem
                    ? 'bg-maroon-800 text-white font-semibold shadow-sm'
                    : 'bg-[#161a24] text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                S{sem}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-zinc-500">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari matkul / dosen..."
              className="w-full bg-[#0b0e14] border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
            />
          </div>

        </div>

        {/* SCHEDULE LIST BY DAYS */}
        {loading ? (
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
            Memuat jadwal kuliah...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {daysOfWeek.map((day) => {
              const daySchedules = getSchedulesForDay(day)
              if (daySchedules.length === 0) return null

              return (
                <div key={day} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <span className="w-2 h-2 rounded-sm bg-maroon-600"></span>
                    <h2 className="text-base font-mono font-semibold text-white uppercase tracking-wider">
                      {day}
                    </h2>
                    <span className="text-xs font-mono text-zinc-500">({daySchedules.length} Matkul)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daySchedules.map((cls) => (
                      <div key={cls.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <span className="font-mono text-xs text-zinc-300 font-medium">
                                {cls.jam_mulai} - {cls.jam_selesai} WIB
                              </span>
                            </div>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-maroon-900/60 border border-maroon-800 text-rose-200">
                              Ruang: {cls.ruangan}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                            {cls.nama_matkul}
                          </h3>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex flex-col gap-2 font-mono text-xs text-zinc-400">
                          <div className="flex items-center justify-between">
                            <span>Dosen:</span>
                            <span className="text-zinc-200 truncate max-w-[220px]">{cls.nama_dosen}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>PJ Matkul:</span>
                            <span className="text-zinc-200">{cls.pj_matkul || '—'}</span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            {cls.link_kelas ? (
                              <a
                                href={cls.link_kelas}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <span className="material-symbols-outlined text-xs">link</span>
                                <span>Link Kelas</span>
                              </a>
                            ) : (
                              <span className="text-zinc-600">Offline</span>
                            )}

                            {(userRole === 'admin' || userRole === 'owner') && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditClick(cls)}
                                  className="text-zinc-400 hover:text-white transition-colors"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(cls.id, cls.nama_matkul)}
                                  className="text-rose-400 hover:text-rose-200 transition-colors"
                                  title="Hapus"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            )}
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
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredSchedules.length === 0 && (
              <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-12 text-center text-zinc-400 font-mono text-xs">
                Tidak ada jadwal ditemukan untuk Semester {selectedSemester}.
              </div>
            )}
          </div>
        )}

      </main>

      {/* ADD/EDIT SCHEDULE MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#11141c] border border-white/10 rounded-lg p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-white font-mono uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-maroon-600">calendar_month</span>
                {editingScheduleId ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSchedule} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Nama Mata Kuliah *</label>
                <input
                  type="text"
                  value={namaMatkul}
                  onChange={(e) => setNamaMatkul(e.target.value)}
                  placeholder="Contoh: Pemrograman Web"
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Hari *</label>
                  <select
                    value={hari}
                    onChange={(e) => setHari(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  >
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Semester *</label>
                  <select
                    value={semesterInput}
                    onChange={(e) => setSemesterInput(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Ruangan</label>
                  <input
                    type="text"
                    value={ruangan}
                    onChange={(e) => setRuangan(e.target.value)}
                    placeholder="Contoh: A.501"
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">PJ Matkul *</label>
                  <input
                    type="text"
                    value={pjMatkul}
                    onChange={(e) => setPjMatkul(e.target.value)}
                    placeholder="Nama PJ"
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Dosen Pengampu *</label>
                <input
                  type="text"
                  value={namaDosen}
                  onChange={(e) => setNamaDosen(e.target.value)}
                  placeholder="Nama Dosen"
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Link Kelas Online</label>
                <input
                  type="url"
                  value={linkKelas}
                  onChange={(e) => setLinkKelas(e.target.value)}
                  placeholder="https://classroom..."
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 py-2 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded bg-maroon-800 text-white font-medium hover:bg-maroon-700"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 relative z-10 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Arsip Jadwal Kelas Sistem Informasi
      </footer>
    </div>
  )
}

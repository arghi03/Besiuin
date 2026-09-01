import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function SchedulePage({ onBack, userRole }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState(null)
  
  // Semester Filter State
  const [selectedSemester, setSelectedSemester] = useState('5') // Default active semester

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

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  // Fetch schedules & class list
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
          console.warn("Table 'class_schedules' does not exist in Supabase. Using mock data.")
          setStatusMessage({
            type: 'warning',
            text: 'Tabel "class_schedules" belum terdeteksi di database. Menggunakan data simulasi lokal untuk preview.'
          })

          // Mock schedules covering multiple semesters
          setSchedules([
            // Semester 5
            {
              id: 1,
              nama_matkul: "Pemrograman Web",
              hari: "Senin",
              jam_mulai: "08:00",
              jam_selesai: "09:40",
              ruangan: "Lab Komputer 3",
              nama_dosen: "Dr. Arghi Vianuri",
              semester: 5,
              link_kelas: "https://classroom.google.com",
              pj_matkul: "Arghi Vianuri"
            },
            {
              id: 2,
              nama_matkul: "Basis Data",
              hari: "Senin",
              jam_mulai: "10:00",
              jam_selesai: "11:40",
              ruangan: "Ruang 405",
              nama_dosen: "Ibu Nurul Hidayati",
              semester: 5,
              link_kelas: "",
              pj_matkul: "Ahmad"
            },
            {
              id: 3,
              nama_matkul: "Sistem Pendukung Keputusan",
              hari: "Selasa",
              jam_mulai: "08:00",
              jam_selesai: "09:40",
              ruangan: "Ruang 302",
              nama_dosen: "Bpk. Hermawan Prasetyo",
              semester: 5,
              link_kelas: "",
              pj_matkul: "Budi"
            },
            {
              id: 4,
              nama_matkul: "Praktikum Jaringan Komputer",
              hari: "Rabu",
              jam_mulai: "13:00",
              jam_selesai: "15:30",
              ruangan: "Lab Jaringan",
              nama_dosen: "Bpk. Rajif",
              semester: 5,
              link_kelas: "",
              pj_matkul: "Cantika"
            },
            {
              id: 5,
              nama_matkul: "Analisis Desain Sistem",
              hari: "Kamis",
              jam_mulai: "08:00",
              jam_selesai: "10:30",
              ruangan: "Ruang 402",
              nama_dosen: "Bpk. Fajar Ramadhan",
              semester: 5,
              link_kelas: "https://zoom.us",
              pj_matkul: "Dino"
            },
            // Semester 1
            {
              id: 11,
              nama_matkul: "Pengantar Teknologi Informasi",
              hari: "Senin",
              jam_mulai: "08:00",
              jam_selesai: "09:40",
              ruangan: "Ruang 102",
              nama_dosen: "Dr. Suharjo",
              semester: 1,
              link_kelas: "",
              pj_matkul: "Erwan"
            },
            {
              id: 12,
              nama_matkul: "Aljabar Linier",
              hari: "Selasa",
              jam_mulai: "10:00",
              jam_selesai: "11:40",
              ruangan: "Ruang 104",
              nama_dosen: "Dr. Rosyid",
              semester: 1,
              link_kelas: "",
              pj_matkul: "Fiona"
            },
            {
              id: 13,
              nama_matkul: "Pancasila",
              hari: "Jumat",
              jam_mulai: "09:00",
              jam_selesai: "10:40",
              ruangan: "Ruang Teater",
              nama_dosen: "Drs. Mulyono",
              semester: 1,
              link_kelas: "",
              pj_matkul: "Gilang"
            },
            // Semester 2
            {
              id: 21,
              nama_matkul: "Struktur Data",
              hari: "Rabu",
              jam_mulai: "08:00",
              jam_selesai: "10:30",
              ruangan: "Lab Komputer 1",
              nama_dosen: "Bpk. Diki Prasetya",
              semester: 2,
              link_kelas: "",
              pj_matkul: "Hana"
            },
            {
              id: 22,
              nama_matkul: "Kewirausahaan",
              hari: "Kamis",
              jam_mulai: "13:00",
              jam_selesai: "14:40",
              ruangan: "Ruang 203",
              nama_dosen: "Ibu Rina Wijayanti",
              semester: 2,
              link_kelas: "",
              pj_matkul: "Indra"
            }
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

  // Fetch classmates list for PJ autocomplete
  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('whitelist_users')
        .select('nama_mahasiswa')
        .order('nama_mahasiswa', { ascending: true })

      if (!error && data) {
        setStudents(data)
      } else {
        // Fallback local students suggestions
        setStudents([
          { nama_mahasiswa: "Arghi Vianuri" },
          { nama_mahasiswa: "Ahmad" },
          { nama_mahasiswa: "Budi" },
          { nama_mahasiswa: "Cantika" },
          { nama_mahasiswa: "Dino" },
          { nama_mahasiswa: "Erwan" },
          { nama_mahasiswa: "Fiona" },
          { nama_mahasiswa: "Gilang" },
          { nama_mahasiswa: "Hana" },
          { nama_mahasiswa: "Indra" }
        ])
      }
    } catch (err) {
      console.error('Error loading students list:', err.message)
    }
  }

  // Save schedule entry (Create or Update)
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
        // Mode Edit (Update)
        const { data, error } = await supabase
          .from('class_schedules')
          .update(schedulePayload)
          .eq('id', editingScheduleId)
          .select()

        if (error) {
          if (error.code === '42P01') {
            // Local fallback edit
            setSchedules(prev =>
              prev.map(s => s.id === editingScheduleId ? { ...s, ...schedulePayload } : s)
            )
            setStatusMessage({
              type: 'warning',
              text: 'Perubahan jadwal disimpan di simulasi lokal (Tabel "class_schedules" belum dibuat).'
            })
          } else {
            throw error
          }
        } else if (!data || data.length === 0) {
          // If RLS blocked it or row didn't exist in Supabase (e.g. mock item)
          setSchedules(prev =>
            prev.map(s => s.id === editingScheduleId ? { ...s, ...schedulePayload } : s)
          )
          setStatusMessage({
            type: 'warning',
            text: 'Perubahan jadwal disimpan secara lokal. Pastikan RLS di database Supabase mengizinkan UPDATE.'
          })
        } else {
          setStatusMessage({ type: 'success', text: 'Jadwal kuliah berhasil diperbarui!' })
          await fetchSchedules()
        }
      } else {
        // Mode Tambah (Insert)
        const { error } = await supabase
          .from('class_schedules')
          .insert([schedulePayload])

        if (error) {
          if (error.code === '42P01') {
            // Local fallback insert
            const mockNew = {
              id: Date.now(),
              ...schedulePayload
            }
            setSchedules(prev => [...prev, mockNew])
            setStatusMessage({
              type: 'warning',
              text: 'Jadwal ditambahkan ke preview lokal (Tabel "class_schedules" belum dibuat).'
            })
          } else {
            throw error
          }
        } else {
          setStatusMessage({ type: 'success', text: 'Jadwal kuliah berhasil ditambahkan!' })
          await fetchSchedules()
        }
      }

      // Reset Form
      setNamaMatkul('')
      setHari('Senin')
      setJamMulai('')
      setJamSelesai('')
      setRuangan('')
      setNamaDosen('')
      setLinkKelas('')
      setPjMatkul('')
      setEditingScheduleId(null)
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan jadwal: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete a schedule entry
  const handleDeleteSchedule = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus jadwal mata kuliah "${name}"?`)) return
    try {
      setStatusMessage(null)
      const { data, error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id)
        .select()

      if (error) {
        if (error.code === '42P01') {
          // Local fallback delete
          setSchedules(prev => prev.filter(s => s.id !== id))
          setStatusMessage({
            type: 'warning',
            text: 'Jadwal dihapus dari preview lokal (Tabel "class_schedules" belum dibuat).'
          })
        } else {
          throw error
        }
      } else if (!data || data.length === 0) {
        // RLS blocked or mock item delete
        setSchedules(prev => prev.filter(s => s.id !== id))
        setStatusMessage({
          type: 'warning',
          text: 'Jadwal dihapus secara lokal. Pastikan RLS di database Supabase mengizinkan DELETE.'
        })
      } else {
        setStatusMessage({ type: 'success', text: 'Jadwal kuliah berhasil dihapus!' })
        await fetchSchedules()
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Gagal menghapus jadwal: ${err.message}` })
    }
  }

  // Set form into edit mode
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
    // Scroll to form on mobile/tablet
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Cancel edit mode
  const handleCancelEdit = () => {
    setNamaMatkul('')
    setHari('Senin')
    setJamMulai('')
    setJamSelesai('')
    setRuangan('')
    setNamaDosen('')
    setLinkKelas('')
    setPjMatkul('')
    setEditingScheduleId(null)
  }

  // Helper to format time (remove seconds if present)
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const parts = timeStr.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return timeStr
  }

  // Filter schedules by active semester
  const semesterSchedules = schedules.filter(
    s => s.semester.toString() === selectedSemester
  )

  // Sort and group semester schedules by day
  const getSchedulesForDay = (dayName) => {
    return semesterSchedules
      .filter(s => s.hari.toLowerCase() === dayName.toLowerCase())
      .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai))
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
              📅
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-white">Jadwal Kuliah</h1>
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

        {/* Left Side: Create/Edit Schedule Form */}
        {(userRole === 'admin' || userRole === 'owner') && (
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <div className="border-b border-white/5 pb-4 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="h-5 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                  {editingScheduleId ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {editingScheduleId ? 'Perbarui data mata kuliah, jam, dosen, ruangan, dan PJ kelas.' : 'Masukkan mata kuliah, hari perkuliahan, jam, dosen pengampu, dan ruangan kelas.'}
                </p>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nama Mata Kuliah <span className="text-rose-500 font-bold">*</span>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Hari
                    </label>
                    <select
                      value={hari}
                      onChange={(e) => setHari(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                    >
                      {daysOfWeek.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Semester
                    </label>
                    <select
                      value={semesterInput}
                      onChange={(e) => setSemesterInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                    >
                      {['1', '2', '3', '4', '5', '6', '7', '8'].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Jam Mulai <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Jam Selesai <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="time"
                      value={jamSelesai}
                      onChange={(e) => setJamSelesai(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Dosen Pengampu <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={namaDosen}
                    onChange={(e) => setNamaDosen(e.target.value)}
                    placeholder="Contoh: Bpk. Rajif, M.T."
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Ruangan
                    </label>
                    <input
                      type="text"
                      value={ruangan}
                      onChange={(e) => setRuangan(e.target.value)}
                      placeholder="Contoh: Lab Komputer 3"
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Link Kelas <span className="text-[10px] text-slate-500 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="url"
                      value={linkKelas}
                      onChange={(e) => setLinkKelas(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Penanggung Jawab (PJ) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    list="class-students"
                    value={pjMatkul}
                    onChange={(e) => setPjMatkul(e.target.value)}
                    placeholder="Pilih atau ketik nama PJ..."
                    className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white font-semibold"
                    required
                  />
                  <datalist id="class-students">
                    {students.map((student, idx) => (
                      <option key={idx} value={student.nama_mahasiswa} />
                    ))}
                  </datalist>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingScheduleId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer text-center active:scale-95"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-grow bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 text-center active:scale-95 shadow"
                  >
                    {submitting ? 'Menyimpan...' : editingScheduleId ? 'Simpan Perubahan' : 'Simpan Jadwal Kuliah'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
        <section className={`${userRole === 'member' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
          
          {/* Semester Selector tabs */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="h-6 w-1.5 rounded-full bg-brand-maroon inline-block"></span>
                Jadwal Kuliah
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedSemester === sem
                      ? 'bg-brand-maroon border-brand-maroon text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Semester {sem}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 mt-2">Memuat jadwal...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {daysOfWeek.map((day) => {
                const daySchedules = getSchedulesForDay(day)
                if (daySchedules.length === 0) return null

                return (
                  <div key={day} className="space-y-3">
                    <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-1">
                      <span>📌</span> {day}
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {daySchedules.map((schedule) => (
                        <div 
                          key={schedule.id}
                          className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-brand-maroon/30 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 group"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-brand-maroon-light">
                                🕒 {formatTime(schedule.jam_mulai)} - {formatTime(schedule.jam_selesai)}
                              </span>
                              <span className="text-[10px] font-bold bg-brand-navy/60 border border-brand-navy-light/10 px-2.5 py-0.5 rounded-full text-slate-300">
                                🏫 Ruang: {schedule.ruangan}
                              </span>
                            </div>
                            
                            <h4 className="text-base font-bold text-white leading-snug">{schedule.nama_matkul}</h4>
                            
                            <p className="text-xs text-slate-400">
                              Dosen: <span className="font-semibold text-slate-300">{schedule.nama_dosen}</span>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              PJ Matkul: <span className="font-semibold text-slate-300">{schedule.pj_matkul || 'Belum ditentukan'}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                            {schedule.link_kelas && (
                              <a
                                href={schedule.link_kelas}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-brand-maroon/20 hover:bg-brand-maroon/30 border border-brand-maroon/30 text-brand-maroon-light text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer text-center inline-block active:scale-95 whitespace-nowrap"
                              >
                                🔗 Link Kelas
                              </a>
                            )}

                            {(userRole === 'admin' || userRole === 'owner') && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditClick(schedule)}
                                  className="p-2 bg-white/5 hover:bg-brand-maroon/20 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer text-xs"
                                  title="Edit Jadwal"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(schedule.id, schedule.nama_matkul)}
                                  className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-white/10 rounded-xl transition-all cursor-pointer text-xs"
                                  title="Hapus Jadwal"
                                >
                                  🗑
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {semesterSchedules.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 text-sm">
                  📭 Belum ada jadwal kuliah yang ditambahkan untuk Semester {selectedSemester}.
                </div>
              )}
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

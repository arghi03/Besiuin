import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabaseClient'

export default function Dashboard({ onNavigate, userRole, userName, profilePhoto, isWhitelistOpen, setIsWhitelistOpen }) {
  const [randomQuote, setRandomQuote] = useState(null)


  // Today's classes state
  const [todayClasses, setTodayClasses] = useState([])
  const [loadingTodayClasses, setLoadingTodayClasses] = useState(true)

  // Fetch today's classes
  useEffect(() => {
    const fetchTodayClasses = async () => {
      try {
        setLoadingTodayClasses(true)
        const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const currentDayIndex = new Date().getDay()
        const todayName = indonesianDays[currentDayIndex]

        const { data, error } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('hari', todayName)
          .order('jam_mulai', { ascending: true })

        if (error) {
          if (error.code === '42P01') {
            // Mock fallback
            const mockSchedules = [
              { id: 1, nama_matkul: "Manajemen Proyek Teknologi Informasi", hari: "Selasa", jam_mulai: "10:10", jam_selesai: "12:40", ruangan: "A.501", nama_dosen: "Prof. Dr. Syopiansyah Jaya Putra, M.Si.", semester: 5, link_kelas: "https://classroom.google.com", pj_matkul: "Muhammad Ilham Akbar" },
              { id: 2, nama_matkul: "Metodologi Penelitian", hari: "Selasa", jam_mulai: "13:30", jam_selesai: "16:00", ruangan: "A.413", nama_dosen: "A'ang Subiyakto, M.Kom., Ph.D", semester: 5, link_kelas: "https://classroom.google.com", pj_matkul: "Khalifa Chairunnisa" },
              { id: 3, nama_matkul: "Pemrograman Web", hari: "Senin", jam_mulai: "08:00", jam_selesai: "09:40", ruangan: "Lab 3", nama_dosen: "Dr. Arghi Vianuri", semester: 5, link_kelas: "", pj_matkul: "Arghi Vianuri" },
            ]
            const filtered = mockSchedules.filter(
              s => s.hari.toLowerCase() === todayName.toLowerCase()
            )
            setTodayClasses(filtered.length > 0 ? filtered : mockSchedules.slice(0, 2))
          } else {
            throw error
          }
        } else {
          setTodayClasses(data || [])
        }
      } catch (err) {
        console.error('Error loading today classes:', err.message)
      } finally {
        setLoadingTodayClasses(false)
      }
    }
    fetchTodayClasses()
  }, [])

  // Agenda State
  const [agenda, setAgenda] = useState({
    id: null,
    title: 'Pekan Ujian & Proyek Akhir',
    description: 'Tidak ada deskripsi agenda terjadwal minggu ini. Bersiaplah untuk sesi perkuliahan normal.',
    target_date: '2026-07-20T09:00:00'
  })

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Edit Agenda modal states
  const [isEditAgendaOpen, setIsEditAgendaOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [savingAgenda, setSavingAgenda] = useState(false)

  // Fetch Agenda and subscribe to updates
  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const { data, error } = await supabase
          .from('class_agendas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== '42P01') throw error
        if (data) setAgenda(data)
      } catch (err) {
        console.error('Error loading agenda:', err.message)
      }
    }

    fetchAgenda()

    const channel = supabase
      .channel('realtime-agenda')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_agendas' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setAgenda(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Countdown Calculation
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(agenda.target_date) - +new Date()
      let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 }

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        }
      }
      setTimeLeft(newTimeLeft)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [agenda.target_date])

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSaveAgenda = async (e) => {
    e.preventDefault()
    if (!editTitle.trim() || !editTargetDate) {
      alert('Judul agenda dan Target Waktu wajib diisi!')
      return
    }

    try {
      setSavingAgenda(true)
      const targetUtc = new Date(editTargetDate).toISOString()
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        target_date: targetUtc
      }

      let error = null
      if (agenda.id) {
        const { error: err } = await supabase.from('class_agendas').update(payload).eq('id', agenda.id)
        error = err
      } else {
        const { data, error: err } = await supabase.from('class_agendas').insert([payload]).select().maybeSingle()
        error = err
        if (!error && data) setAgenda(data)
      }

      if (error) {
        setAgenda({ id: Date.now(), ...payload })
      } else {
        const { data } = await supabase.from('class_agendas').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (data) setAgenda(data)
      }

      setIsEditAgendaOpen(false)
    } catch (err) {
      alert(`Gagal menyimpan agenda: ${err.message}`)
    } finally {
      setSavingAgenda(false)
    }
  }

  // Fetch a random quote
  useEffect(() => {
    const fetchRandomQuote = async () => {
      try {
        const { data, error } = await supabase.from('quotes').select('*')
        if (!error && data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length)
          setRandomQuote(data[randomIndex])
        } else {
          setRandomQuote({
            quote: "AI TIDAK PUNYA MEMORI",
            author: "Shidiqi",
            context: "YTTA"
          })
        }
      } catch (err) {
        setRandomQuote({
          quote: "Kutipan seru perkuliahan mahasiswa Sistem Informasi",
          author: "Sistem Informasi",
          context: "Informasi"
        })
      } finally {
      }
    }
    fetchRandomQuote()
  }, [])

  // Deadlines state & handling
  const [deadlines, setDeadlines] = useState([])
  const [loadingDeadlines, setLoadingDeadlines] = useState(true)
  const [submittingDeadline, setSubmittingDeadline] = useState(false)
  const [newMatkul, setNewMatkul] = useState('')
  const [newDeskripsi, setNewDeskripsi] = useState('')
  const [newTanggalDeadline, setNewTanggalDeadline] = useState('')
  const [newLinkPengumpulan, setNewLinkPengumpulan] = useState('')
  const [, setTick] = useState(0)

  // Whitelist modal states (modal dibuka via menu profil di navbar)
  const [whitelistUsers, setWhitelistUsers] = useState([])
  const [loadingWhitelist, setLoadingWhitelist] = useState(false)
  const [whitelistEmail, setWhitelistEmail] = useState('')
  const [whitelistName, setWhitelistName] = useState('')
  const [whitelistRole, setWhitelistRole] = useState('member')
  const [whitelistStatus, setWhitelistStatus] = useState(null)

  const fetchWhitelistUsers = useCallback(async () => {
    if (userRole !== 'owner') return
    try {
      setLoadingWhitelist(true)
      const { data, error } = await supabase.from('whitelist_users').select('*').order('nama_mahasiswa', { ascending: true })
      if (!error && data) setWhitelistUsers(data)
    } catch (err) {
      console.error('Error fetching whitelist:', err)
    } finally {
      setLoadingWhitelist(false)
    }
  }, [userRole])

  const handleAddWhitelist = async (e) => {
    e.preventDefault()
    if (!whitelistEmail.trim() || !whitelistName.trim()) return
    setWhitelistStatus(null)

    try {
      const emailLower = whitelistEmail.trim().toLowerCase()
      if (!emailLower.endsWith('@mhs.uinjkt.ac.id')) {
        setWhitelistStatus({ type: 'error', text: 'Domain email harus @mhs.uinjkt.ac.id' })
        return
      }

      const { error } = await supabase.from('whitelist_users').insert([{
        email: emailLower,
        nama_mahasiswa: whitelistName.trim(),
        role: whitelistRole
      }])

      if (error) throw error

      setWhitelistStatus({ type: 'success', text: `Berhasil menambahkan ${whitelistName}!` })
      setWhitelistEmail('')
      setWhitelistName('')
      setWhitelistRole('member')
      await fetchWhitelistUsers()
    } catch (err) {
      setWhitelistStatus({ type: 'error', text: `Gagal menambahkan: ${err.message}` })
    }
  }

  const handleUpdateRole = async (email, newRole) => {
    try {
      const { error } = await supabase.from('whitelist_users').update({ role: newRole }).eq('email', email)
      if (error) throw error
      await fetchWhitelistUsers()
      setWhitelistStatus({ type: 'success', text: `Role berhasil diperbarui menjadi ${newRole}!` })
    } catch (err) {
      setWhitelistStatus({ type: 'error', text: `Gagal memperbarui role: ${err.message}` })
    }
  }

  const handleDeleteWhitelist = async (email, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${name} dari whitelist?`)) return
    try {
      const { error } = await supabase.from('whitelist_users').delete().eq('email', email)
      if (error) throw error
      await fetchWhitelistUsers()
      setWhitelistStatus({ type: 'success', text: `Berhasil menghapus ${name}!` })
    } catch (err) {
      setWhitelistStatus({ type: 'error', text: `Gagal menghapus: ${err.message}` })
    }
  }

  useEffect(() => {
    if (isWhitelistOpen) fetchWhitelistUsers()
  }, [isWhitelistOpen, fetchWhitelistUsers])

  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true)
      const nowStr = new Date().toISOString()
      const { data, error } = await supabase
        .from('class_deadlines')
        .select('*')
        .gt('tanggal_deadline', nowStr)
        .order('tanggal_deadline', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          setDeadlines([
            {
              id: 1,
              nama_matkul: "METOPEN",
              deskripsi_tugas: "Penyusunan bab 1 dan tinjauan pustaka metodologi penelitian kualitatif.",
              tanggal_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
              link_pengumpulan: "https://classroom.google.com"
            }
          ])
        }
      } else {
        setDeadlines(data || [])
      }
    } catch (err) {
      console.error("Error fetching deadlines:", err.message)
    } finally {
      setLoadingDeadlines(false)
    }
  }

  useEffect(() => {
    fetchDeadlines()
    const channel = supabase.channel('realtime-deadlines').on('postgres_changes', { event: '*', schema: 'public', table: 'class_deadlines' }, fetchDeadlines).subscribe()
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const handleCreateDeadline = async (e) => {
    e.preventDefault()
    if (!newMatkul.trim() || !newDeskripsi.trim() || !newTanggalDeadline) {
      alert("Kolom Matkul, Deskripsi, dan Tanggal Tenggat wajib diisi!")
      return
    }

    try {
      setSubmittingDeadline(true)
      const targetUtc = new Date(newTanggalDeadline).toISOString()
      const newDeadline = {
        nama_matkul: newMatkul.trim(),
        deskripsi_tugas: newDeskripsi.trim(),
        tanggal_deadline: targetUtc,
        link_pengumpulan: newLinkPengumpulan.trim() || null
      }

      const { error } = await supabase.from('class_deadlines').insert([newDeadline])

      if (error && error.code === '42P01') {
        setDeadlines(prev => [...prev, { id: Date.now(), ...newDeadline }])
      } else {
        await fetchDeadlines()
      }

      setNewMatkul('')
      setNewDeskripsi('')
      setNewTanggalDeadline('')
      setNewLinkPengumpulan('')
    } catch (err) {
      alert(`Gagal membuat deadline: ${err.message}`)
    } finally {
      setSubmittingDeadline(false)
    }
  }

  const getDeadlineTimeInfo = (targetDateStr) => {
    const diff = new Date(targetDateStr) - new Date()
    if (diff <= 0) return { expired: true, text: 'Sudah lewat', panicLevel: 'expired' }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((diff / 1000 / 60) % 60)

    let text = ''
    if (days > 0) text += `${days} Hari `
    if (hours > 0 || days > 0) text += `${hours} Jam `
    text += `${minutes} Menit`

    let panicLevel = 'green'
    if (diff < 1000 * 60 * 60 * 24) panicLevel = 'red'
    else if (diff < 1000 * 60 * 60 * 24 * 3) panicLevel = 'yellow'

    return { expired: false, text, panicLevel }
  }

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative">

      {/* Background Overlay */}
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="relative z-10 pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">

        {/* HERO SECTION */}
        <section className="flex flex-col sm:flex-row items-center gap-6 pt-2 pb-4 fade-up">
          <div className="shrink-0">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Foto profil" className="w-20 h-20 rounded-lg object-cover border border-white/15 shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-maroon-900/60 border border-maroon-800 flex items-center justify-center font-mono text-2xl font-bold text-rose-200">
                {(userName || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left min-w-0">
            <p className="text-zinc-400 font-mono text-xs sm:text-sm mb-1">
              Halo, <span className="text-white font-medium">{userName || 'Mahasiswa SI-B'}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Welcome To <span className="text-maroon-600">Besiuin Space</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed mt-2">
              Tempat berkeluh kesah, seru-seruan, dan pengingat deadline akademik kelas Sistem Informasi dalam satu atap.
            </p>
          </div>
        </section>

        {/* SECTION 1: AGENDA TERDEKAT & COUNTDOWN */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-maroon-700"></span>
              Agenda Terdekat & Countdown
            </h2>
            {(userRole === 'admin' || userRole === 'owner') && (
              <button
                onClick={() => {
                  setEditTitle(agenda.title)
                  setEditDescription(agenda.description || '')
                  setEditTargetDate(formatDateForInput(agenda.target_date))
                  setIsEditAgendaOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161a24] hover:bg-[#1d2330] border border-white/10 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-zinc-400">edit_calendar</span>
                <span>Atur Agenda</span>
              </button>
            )}
          </div>

          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              <div className="lg:col-span-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Agenda Kelas
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-[#2b1f0d] px-2 py-0.5 rounded border border-amber-500/30">
                    STANDBY
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                  {agenda.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {agenda.description}
                </p>
              </div>

              {/* Flat Solid Countdown Boxes */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-zinc-500">D-0</span>
                  <span className="font-mono text-3xl font-bold text-white tracking-tight">{pad(timeLeft.days)}</span>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 uppercase">Hari</span>
                </div>
                <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-zinc-500">HRS</span>
                  <span className="font-mono text-3xl font-bold text-white tracking-tight">{pad(timeLeft.hours)}</span>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 uppercase">Jam</span>
                </div>
                <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-zinc-500">MIN</span>
                  <span className="font-mono text-3xl font-bold text-white tracking-tight">{pad(timeLeft.minutes)}</span>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 uppercase">Menit</span>
                </div>
                <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono text-zinc-500">SEC</span>
                  <span className="font-mono text-3xl font-bold text-maroon-600 tracking-tight">{pad(timeLeft.seconds)}</span>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 uppercase">Detik</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 2: JADWAL KULIAH HARI INI */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-emerald-500"></span>
              Jadwal Kuliah Hari Ini <span class="text-zinc-500 font-normal">({new Date().toLocaleDateString('id-ID', { weekday: 'long' })})</span>
            </h2>
            <button 
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Lihat Semua Jadwal</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {loadingTodayClasses ? (
            <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-6 text-center text-zinc-400 font-mono text-xs">
              Memuat jadwal kuliah...
            </div>
          ) : todayClasses.length === 0 ? (
            <div className="bg-[#11141c]/50 border border-dashed border-white/10 rounded-lg p-8 text-center text-zinc-400 font-mono text-xs">
              Libur — Tidak ada perkuliahan aktif hari ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayClasses.map((cls) => (
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
                    <p className="text-xs font-mono text-zinc-400 mt-1">SKS: 3</p>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex flex-col gap-1 text-xs font-mono text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Dosen:</span>
                      <span className="text-zinc-200 truncate max-w-[240px]">{cls.nama_dosen}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PJ Matkul:</span>
                      <span className="text-zinc-200">{cls.pj_matkul || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: QUOTE OF THE DAY */}
        <section className="flex flex-col gap-3">
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-[#161a24] border border-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-maroon-600 text-xl">format_quote</span>
              </div>
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Quote Hari Ini</div>
                <p className="text-xl sm:text-2xl font-semibold font-mono text-white tracking-tight mt-1">
                  “{randomQuote?.quote || 'AI TIDAK PUNYA MEMORI'}”
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-zinc-400">
                  <span className="text-zinc-200">{randomQuote?.author || 'Shidiqi'}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
                    {randomQuote?.context || 'YTTA'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('quotes')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161a24] hover:bg-[#1d2330] border border-white/10 text-xs font-mono text-zinc-300 transition-colors shrink-0 cursor-pointer"
            >
              <span>Lihat Dinding Quote</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* SECTION 4: DEADLINE TRACKER */}
        <section className="flex flex-col gap-3" id="deadlines">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-maroon-700"></span>
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              Deadline Tracker
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Active Tasks List */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {loadingDeadlines ? (
                <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-6 text-center font-mono text-xs text-zinc-400">
                  Memuat data deadline...
                </div>
              ) : deadlines.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#11141c]/50 border border-dashed border-white/10 flex items-center justify-center gap-2 text-center">
                  <span className="material-symbols-outlined text-zinc-500 text-base">task_alt</span>
                  <span className="text-xs font-mono text-zinc-400">Semua tugas terorganisir dengan rapi. Tetap fokus dan santai!</span>
                </div>
              ) : (
                deadlines.map((item) => {
                  const timeInfo = getDeadlineTimeInfo(item.tanggal_deadline)
                  return (
                    <div key={item.id} className="bg-[#11141c]/90 border border-white/10 rounded-lg p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-zinc-200">
                            {item.nama_matkul}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] uppercase ${
                            timeInfo.panicLevel === 'red' 
                              ? 'bg-maroon-950/80 border border-maroon-700 text-rose-300' 
                              : 'bg-[#10231b] border border-emerald-500/30 text-emerald-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${timeInfo.panicLevel === 'red' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`}></span>
                            {timeInfo.panicLevel === 'red' ? 'MENDESAK' : 'AMAN'}
                          </span>
                        </div>
                        {item.link_pengumpulan && (
                          <a 
                            href={item.link_pengumpulan} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#161a24] hover:bg-[#1d2330] border border-white/10 text-xs font-mono text-zinc-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">link</span>
                            <span>Kumpulkan</span>
                          </a>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {item.deskripsi_tugas}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="material-symbols-outlined text-sm text-maroon-600">timer</span>
                          <span>Sisa Waktu:</span>
                          <span className="text-rose-300 font-medium">{timeInfo.text}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">Google Classroom</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Add Task Form */}
            <div className="lg:col-span-5 bg-[#11141c]/90 border border-white/10 rounded-lg p-5">
              <div className="mb-4 pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-mono uppercase">
                  <span className="material-symbols-outlined text-sm text-maroon-600">add_task</span>
                  Tambah Deadline Baru
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  PJ atau anggota kelas dapat mengunggah tugas baru.
                </p>
              </div>

              <form onSubmit={handleCreateDeadline} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Nama Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={newMatkul}
                    onChange={(e) => setNewMatkul(e.target.value)}
                    placeholder="Contoh: Pemrograman Web"
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Deskripsi Tugas
                  </label>
                  <textarea
                    value={newDeskripsi}
                    onChange={(e) => setNewDeskripsi(e.target.value)}
                    placeholder="Contoh: Tugas Individu 4 - Menghubungkan client side ke Supabase"
                    rows="2"
                    className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors resize-none"
                    required
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Tenggat Waktu
                    </label>
                    <input
                      type="datetime-local"
                      value={newTanggalDeadline}
                      onChange={(e) => setNewTanggalDeadline(e.target.value)}
                      className="w-full bg-[#0b0e14] border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-maroon-700 transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Link Pengumpulan
                    </label>
                    <input
                      type="url"
                      value={newLinkPengumpulan}
                      onChange={(e) => setNewLinkPengumpulan(e.target.value)}
                      placeholder="https://classroom..."
                      className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingDeadline}
                  className="mt-2 w-full py-2 px-4 rounded bg-[#991b1b] hover:bg-[#7f1d1d] active:bg-[#680007] text-white font-mono text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>{submittingDeadline ? 'Menyimpan...' : 'Tambah Tugas'}</span>
                </button>
              </form>
            </div>

          </div>
        </section>

        {/* SECTION 5: NAVIGASI FITUR KELAS */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-maroon-700"></span>
              Navigasi Fitur Kelas
            </h2>
            <span className="text-xs font-mono text-zinc-500">6 Fitur Utama</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1: Quotes Wall */}
            <button
              onClick={() => onNavigate('quotes')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center mb-3 group-hover:border-maroon-700 transition-colors">
                  <span className="material-symbols-outlined text-zinc-300 text-lg">campaign</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Quotes Wall
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tulis, baca, dan bagikan kata-kata legendaris kelas secara real-time.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                <span>Buka Aplikasi</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </button>

            {/* Card 2: All-Round Gacha */}
            <button
              onClick={() => onNavigate('gacha')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center mb-3 group-hover:border-maroon-700 transition-colors">
                  <span className="material-symbols-outlined text-zinc-300 text-lg">casino</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  All-Round Gacha
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gacha pembagian kelompok, atau presentasi secara acak dan adil.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                <span>Buka Aplikasi</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </button>

            {/* Card 3: Hall of Fame */}
            <button
              onClick={() => onNavigate('hall-of-fame')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center mb-3 group-hover:border-maroon-700 transition-colors">
                  <span className="material-symbols-outlined text-zinc-300 text-lg">emoji_events</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Hall of Fame
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Nominasi penghargaan mahasiswa teraktif, terambis, dan terlucu sekelas.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                <span>Buka Aplikasi</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </button>

            {/* Card 4: Kelompok Tugas */}
            <button
              onClick={() => onNavigate('groups')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-zinc-300 text-lg">folder_shared</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase">
                    SEGERA HADIR
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Kelompok Tugas
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fitur rekap kelompok sedang di-freeze. Pembagian kelompok dapat dilakukan langsung di All-Round Gacha.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-500 text-[11px]">Gunakan Gacha Kelompok</span>
                <span className="text-rose-300 hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>Buka Gacha</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </div>
            </button>

            {/* Card 5: Galeri Kenangan */}
            <button
              onClick={() => onNavigate('gallery')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center mb-3 group-hover:border-maroon-700 transition-colors">
                  <span className="material-symbols-outlined text-zinc-300 text-lg">photo_camera</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Galeri Kenangan
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dokumentasi foto dan kenangan momen-momen kebersamaan seru kelas Sistem Informasi.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                <span>Buka Aplikasi</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </button>

            {/* Card 6: Jadwal Kuliah */}
            <button
              onClick={() => onNavigate('schedule')}
              className="group text-left flex flex-col justify-between p-5 rounded-lg bg-[#11141c]/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded bg-[#161a24] border border-white/10 flex items-center justify-center mb-3 group-hover:border-maroon-700 transition-colors">
                  <span className="material-symbols-outlined text-zinc-300 text-lg">calendar_month</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Jadwal Kuliah
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Lihat jadwal harian kelas per semester, ruangan, dosen pengampu, dan link kelas online.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                <span>Buka Aplikasi</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </button>

          </div>
        </section>

      </main>

      {/* EDIT AGENDA MODAL */}
      {isEditAgendaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#11141c] border border-white/10 rounded-lg p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-white font-mono uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-maroon-600">edit_calendar</span>
                Atur Agenda Terdekat
              </h3>
              <button onClick={() => setIsEditAgendaOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveAgenda} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Judul Agenda</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Deskripsi Agenda</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700 resize-none"
                  rows="3"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Target Waktu (Countdown)</label>
                <input
                  type="datetime-local"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditAgendaOpen(false)}
                  className="flex-1 py-2 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAgenda}
                  className="flex-1 py-2 rounded bg-maroon-800 text-white font-medium hover:bg-maroon-700"
                >
                  {savingAgenda ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHITELIST MANAGEMENT MODAL (OWNER ONLY) */}
      {isWhitelistOpen && userRole === 'owner' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#11141c] border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                  <span className="material-symbols-outlined text-amber-400">admin_panel_settings</span>
                  Manajemen Whitelist & Role Akses
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Khusus Owner untuk mengontrol siapa saja yang boleh masuk portal.</p>
              </div>
              <button onClick={() => setIsWhitelistOpen(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
            </div>

            {whitelistStatus && (
              <div className={`p-3 rounded text-xs font-mono ${whitelistStatus.type === 'success' ? 'bg-[#10231b] border border-emerald-500/30 text-emerald-300' : 'bg-maroon-950/80 border border-maroon-700 text-rose-200'}`}>
                {whitelistStatus.text}
              </div>
            )}

            {/* Add Whitelist Form */}
            <form onSubmit={handleAddWhitelist} className="bg-[#0b0e14] p-4 rounded border border-white/10 flex flex-col gap-3 font-mono text-xs">
              <span className="font-semibold text-white uppercase tracking-wider">Tambah Anggota Whitelist</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="email"
                  placeholder="email@mhs.uinjkt.ac.id"
                  value={whitelistEmail}
                  onChange={(e) => setWhitelistEmail(e.target.value)}
                  className="bg-[#151922] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
                <input
                  type="text"
                  placeholder="Nama Mahasiswa"
                  value={whitelistName}
                  onChange={(e) => setWhitelistName(e.target.value)}
                  className="bg-[#151922] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                  required
                />
                <select
                  value={whitelistRole}
                  onChange={(e) => setWhitelistRole(e.target.value)}
                  className="bg-[#151922] border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-maroon-700"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button type="submit" className="py-2 px-4 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-medium transition-colors self-end">
                + Tambah Anggota
              </button>
            </form>

            {/* Whitelist Table */}
            <div className="border border-white/10 rounded overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#0b0e14] text-zinc-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Nama</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-zinc-300">
                  {loadingWhitelist ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-zinc-500">Memuat whitelist...</td>
                    </tr>
                  ) : whitelistUsers.map((u) => (
                    <tr key={u.email} className="hover:bg-white/5">
                      <td className="p-3 font-semibold text-white">{u.nama_mahasiswa}</td>
                      <td className="p-3 text-zinc-400">{u.email}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.email, e.target.value)}
                          className="bg-[#151922] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteWhitelist(u.email, u.nama_mahasiswa)}
                          className="px-2 py-1 rounded bg-maroon-900/60 text-rose-300 hover:bg-maroon-800 transition-colors text-[11px]"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#0b0e14]/90 border-t border-white/10 py-8 relative z-10 text-xs font-mono">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-white">Besiuin Space • Kelas Sistem Informasi</span>
            <span className="text-zinc-500 hidden sm:inline">|</span>
            <span className="text-zinc-400 font-sans">Program Studi Sistem Informasi, Universitas Islam Negeri</span>
          </div>
          <div className="text-zinc-500 text-center sm:text-right">
            © 2026 Besiuin Space. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>
    </div>
  )
}

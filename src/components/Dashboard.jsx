import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../config/supabaseClient'

export default function Dashboard({ onNavigate, userRole }) {
  const [randomQuote, setRandomQuote] = useState(null)
  const [loadingQuote, setLoadingQuote] = useState(true)
  const [activeToast, setActiveToast] = useState(null)
  const [userName, setUserName] = useState('')

  // Fetch logged-in user name from whitelist_users
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          const { data, error } = await supabase
            .from('whitelist_users')
            .select('nama_mahasiswa')
            .eq('email', user.email)
            .maybeSingle()

          if (!error && data) {
            setUserName(data.nama_mahasiswa)
          } else {
            const namePart = user.email.split('@')[0]
            setUserName(namePart)
          }
        }
      } catch (err) {
        console.error('Error fetching user name:', err)
      }
    }
    fetchUserName()
  }, [])

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
              { id: 1, nama_matkul: "Pemrograman Web", hari: "Senin", jam_mulai: "08:00", jam_selesai: "09:40", ruangan: "Lab Komputer 3", nama_dosen: "Dr. Arghi Vianuri", semester: 5, link_kelas: "https://classroom.google.com", pj_matkul: "Arghi Vianuri" },
              { id: 2, nama_matkul: "Basis Data", hari: "Senin", jam_mulai: "10:00", jam_selesai: "11:40", ruangan: "Ruang 405", nama_dosen: "Ibu Nurul Hidayati", semester: 5, link_kelas: "", pj_matkul: "Ahmad" },
              { id: 3, nama_matkul: "Sistem Pendukung Keputusan", hari: "Selasa", jam_mulai: "08:00", jam_selesai: "09:40", ruangan: "Ruang 302", nama_dosen: "Bpk. Hermawan Prasetyo", semester: 5, link_kelas: "", pj_matkul: "Budi" },
              { id: 4, nama_matkul: "Praktikum Jaringan Komputer", hari: "Rabu", jam_mulai: "13:00", jam_selesai: "15:30", ruangan: "Lab Jaringan", nama_dosen: "Bpk. Rajif", semester: 5, link_kelas: "", pj_matkul: "Cantika" },
              { id: 5, nama_matkul: "Analisis Desain Sistem", hari: "Kamis", jam_mulai: "08:00", jam_selesai: "10:30", ruangan: "Ruang 402", nama_dosen: "Bpk. Fajar Ramadhan", semester: 5, link_kelas: "https://zoom.us", pj_matkul: "Dino" }
            ]
            const filtered = mockSchedules.filter(
              s => s.hari.toLowerCase() === todayName.toLowerCase() && s.semester === 5
            )
            setTodayClasses(filtered)
          } else {
            throw error
          }
        } else {
          // Default active semester is Semester 5 for the dashboard summary
          const filtered = data ? data.filter(s => s.semester === 5) : []
          setTodayClasses(filtered)
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
    title: 'UAS & Akhir Semester Ganjil',
    description: 'Persiapkan diri Anda untuk menghadapi pekan ujian akhir semester ganjil.',
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

        if (error) {
          if (error.code === '42P01') {
            console.warn("Table 'class_agendas' does not exist in Supabase.")
          } else {
            throw error
          }
        } else if (data) {
          setAgenda(data)
        }
      } catch (err) {
        console.error('Error loading agenda:', err.message)
      }
    }

    fetchAgenda()

    // Subscribe to Postgres changes on class_agendas
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

  // Calculate Countdown based on dynamic target date
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

  // Helper to format date for datetime-local input
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

  // Save new agenda setting
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
        // Update existing row
        const { error: err } = await supabase
          .from('class_agendas')
          .update(payload)
          .eq('id', agenda.id)
        error = err
      } else {
        // Insert new row
        const { data, error: err } = await supabase
          .from('class_agendas')
          .insert([payload])
          .select()
          .maybeSingle()

        error = err
        if (!error && data) {
          setAgenda(data)
        }
      }

      if (error) {
        if (error.code === '42P01') {
          // Local simulation
          const simulatedData = {
            id: Date.now(),
            ...payload
          }
          setAgenda(simulatedData)
          alert('Agenda disimpan ke preview lokal (Tabel "class_agendas" belum ada di Supabase database Anda).')
        } else {
          throw error
        }
      } else {
        // Fetch fresh data
        const { data } = await supabase
          .from('class_agendas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) {
          setAgenda(data)
        }
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
        setLoadingQuote(true)
        const { data, error } = await supabase
          .from('quotes')
          .select('*')

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length)
          setRandomQuote(data[randomIndex])
        } else {
          // Fallback quote
          setRandomQuote({
            quote: "Pendidikan adalah senjata paling mematikan di dunia, karena dengan itu Anda bisa mengubah dunia.",
            author: "Nelson Mandela",
            context: "Umum"
          })
        }
      } catch (err) {
        console.error('Error loading random quote:', err.message)
        setRandomQuote({
          quote: "Berbagi inspirasi setiap hari melalui kutipan-kutipan terbaik mahasiswa UIN.",
          author: "Tim Besiuin",
          context: "Sistem Informasi"
        })
      } finally {
        setLoadingQuote(false)
      }
    }

    fetchRandomQuote()
  }, [])

  // Deadline Tracking States
  const [deadlines, setDeadlines] = useState([])
  const [loadingDeadlines, setLoadingDeadlines] = useState(true)
  const [submittingDeadline, setSubmittingDeadline] = useState(false)
  const [newMatkul, setNewMatkul] = useState('')
  const [newDeskripsi, setNewDeskripsi] = useState('')
  const [newTanggalDeadline, setNewTanggalDeadline] = useState('')
  const [newLinkPengumpulan, setNewLinkPengumpulan] = useState('')
  const [tick, setTick] = useState(0)

  // Whitelist & Role Management States (Owner Only)
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false)
  const [whitelistUsers, setWhitelistUsers] = useState([])
  const [loadingWhitelist, setLoadingWhitelist] = useState(false)
  const [whitelistEmail, setWhitelistEmail] = useState('')
  const [whitelistName, setWhitelistName] = useState('')
  const [whitelistRole, setWhitelistRole] = useState('member')
  const [whitelistStatus, setWhitelistStatus] = useState(null)

  // Fetch Whitelist Users (Owner Only)
  const fetchWhitelistUsers = useCallback(async () => {
    if (userRole !== 'owner') return
    try {
      setLoadingWhitelist(true)
      const { data, error } = await supabase
        .from('whitelist_users')
        .select('*')
        .order('nama_mahasiswa', { ascending: true })

      if (!error && data) {
        setWhitelistUsers(data)
      }
    } catch (err) {
      console.error('Error fetching whitelist:', err)
    } finally {
      setLoadingWhitelist(false)
    }
  }, [userRole])

  // Add User to Whitelist
  const handleAddWhitelist = async (e) => {
    e.preventDefault()
    if (!whitelistEmail.trim() || !whitelistName.trim()) return
    setWhitelistStatus(null)

    try {
      const emailLower = whitelistEmail.trim().toLowerCase()
      // Basic domain check
      if (!emailLower.endsWith('@mhs.uinjkt.ac.id')) {
        setWhitelistStatus({ type: 'error', text: 'Domain email harus @mhs.uinjkt.ac.id' })
        return
      }

      const { error } = await supabase
        .from('whitelist_users')
        .insert([{
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

  // Update User Role
  const handleUpdateRole = async (email, newRole) => {
    try {
      const { error } = await supabase
        .from('whitelist_users')
        .update({ role: newRole })
        .eq('email', email)

      if (error) throw error
      await fetchWhitelistUsers()
      setWhitelistStatus({ type: 'success', text: `Role berhasil diperbarui menjadi ${newRole}!` })
    } catch (err) {
      setWhitelistStatus({ type: 'error', text: `Gagal memperbarui role: ${err.message}` })
    }
  }

  // Delete User from Whitelist
  const handleDeleteWhitelist = async (email, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${name} dari whitelist?`)) return
    try {
      const { error } = await supabase
        .from('whitelist_users')
        .delete()
        .eq('email', email)

      if (error) throw error
      await fetchWhitelistUsers()
      setWhitelistStatus({ type: 'success', text: `Berhasil menghapus ${name}!` })
    } catch (err) {
      setWhitelistStatus({ type: 'error', text: `Gagal menghapus: ${err.message}` })
    }
  }

  // Fetch Whitelist Users on modal open
  useEffect(() => {
    if (isWhitelistModalOpen) {
      fetchWhitelistUsers()
    }
  }, [isWhitelistModalOpen, fetchWhitelistUsers])

  // Fetch deadlines from Supabase
  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true)
      const nowStr = new Date().toISOString()
      const { data, error } = await supabase
        .from('class_deadlines')
        .select('*')
        .gt('tanggal_deadline', nowStr) // Only active deadlines
        .order('tanggal_deadline', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          console.warn("Table 'class_deadlines' does not exist in Supabase. Using mock data.")
          // Load default mock deadlines
          setDeadlines([
            {
              id: 1,
              nama_matkul: "Pemrograman Web",
              deskripsi_tugas: "Tugas Akhir: Membuat Website Kelas Besiuin Hub menggunakan React & Supabase",
              tanggal_deadline: new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(), // 25 hours (Yellow / Warning)
              link_pengumpulan: "https://classroom.google.com"
            },
            {
              id: 2,
              nama_matkul: "Basis Data",
              deskripsi_tugas: "Laporan Praktikum: Optimasi Query dan Rencana Keamanan RLS",
              tanggal_deadline: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // 2 hours (Red Pulsing / Panic)
              link_pengumpulan: "https://classroom.google.com"
            },
            {
              id: 3,
              nama_matkul: "Sistem Pendukung Keputusan",
              deskripsi_tugas: "Tugas Kelompok: Implementasi Metode AHP/TOPSIS dengan Excel",
              tanggal_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days (Green / Safe)
              link_pengumpulan: ""
            }
          ])
        } else {
          throw error
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

    // Real-time listener for class_deadlines
    const channel = supabase
      .channel('realtime-deadlines')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_deadlines' },
        () => {
          fetchDeadlines()
        }
      )
      .subscribe()

    // Timer tick to update countdown strings every second
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  // Create new deadline
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

      const { error } = await supabase
        .from('class_deadlines')
        .insert([newDeadline])

      if (error) {
        if (error.code === '42P01') {
          // Fallback simulation
          const mockNew = {
            id: Date.now(),
            ...newDeadline
          }
          setDeadlines(prev => [...prev, mockNew].sort((a, b) => new Date(a.tanggal_deadline) - new Date(b.tanggal_deadline)))
          alert("Deadline disimpan di preview lokal (Tabel 'class_deadlines' belum dibuat di database).")
        } else {
          throw error
        }
      } else {
        await fetchDeadlines()
      }

      // Reset Form
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

  // Helper to calculate countdown and panic levels
  const getDeadlineTimeInfo = (targetDateStr) => {
    const diff = new Date(targetDateStr) - new Date()
    if (diff <= 0) return { expired: true, text: 'Sudah lewat', panicLevel: 'expired' }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((diff / 1000 / 60) % 60)
    const seconds = Math.floor((diff / 1000) % 60)

    let text = 'Sisa '
    if (days > 0) text += `${days} Hari `
    if (hours > 0 || days > 0) text += `${hours} Jam `
    if (days === 0) text += `${minutes} Menit ${seconds} Detik`
    else text += `${minutes} Menit`

    let panicLevel = 'green' // safe (>3 days)
    if (diff < 1000 * 60 * 60 * 24) {
      panicLevel = 'red' // < 24 hours (1 day)
    } else if (diff < 1000 * 60 * 60 * 24 * 3) {
      panicLevel = 'yellow' // 1-3 days
    }

    return { expired: false, text, panicLevel, diff }
  }

  // Show coming soon toast
  const triggerComingSoon = (featureName) => {
    setActiveToast(`Fitur "${featureName}" sedang dipersiapkan oleh tim pengembang Besiuin!`)
    setTimeout(() => {
      setActiveToast(null)
    }, 4000)
  }

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 font-sans relative overflow-x-hidden selection:bg-brand-maroon selection:text-white">
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-maroon/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-brand-navy/35 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] bg-slate-900/40 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-brand-dark/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-maroon to-red-900 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-brand-maroon/20">
              B
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-red-200 to-slate-200 bg-clip-text text-transparent">
                Besiuin Hub
              </span>
              <span className="text-[9px] block text-brand-maroon-light/60 font-mono tracking-widest uppercase -mt-0.5">SISTEM INFORMASI UIN</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400 font-mono hidden sm:inline-block">
              Portal Kelas Aktif
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-brand-maroon/20 hover:bg-brand-maroon/30 border border-brand-maroon/30 text-brand-maroon-light hover:text-white text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-navy border border-brand-maroon text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce flex items-center gap-3 max-w-sm">
          <span className="text-brand-maroon text-lg">⚙</span>
          <p className="text-xs font-medium leading-relaxed">{activeToast}</p>
        </div>
      )}

      {/* Main Hero & Hub Content */}
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-12 relative z-10">

        {/* Welcome Hero Banner */}
        <section className="text-center py-8 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-brand-maroon/10 border border-brand-maroon/30 px-3.5 py-1.5 rounded-full text-xs text-brand-maroon-light">
            <span className="w-2 h-2 rounded-full bg-brand-maroon animate-ping"></span>
            <span>Besiuin Hub v1.0</span>
          </div>

          {userName && (
            <div className="text-base md:text-lg text-slate-300 font-medium tracking-wide animate-fade-in -mb-1">
              Halo, <span className="text-brand-maroon-light font-extrabold">{userName}</span>! 👋
            </div>
          )}

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-white">
            Welcome To <br />
            <span className="bg-gradient-to-r from-brand-maroon via-red-500 to-brand-navy-light bg-clip-text text-transparent">
              Besiuin Space
            </span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Tempat berkeluh kesah, seru-seruan, dan pengingat deadline.
          </p>
        </section>

        {/* Central Widgets Stack */}
        <section className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

          {/* Widget: Countdown Agenda (Centered & Bigger) */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 md:p-12 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-brand-maroon/30 relative text-center">
            {(userRole === 'admin' || userRole === 'owner') && (
              <button
                onClick={() => {
                  setEditTitle(agenda.title)
                  setEditDescription(agenda.description || '')
                  setEditTargetDate(formatDateForInput(agenda.target_date))
                  setIsEditAgendaOpen(true)
                }}
                className="absolute top-6 right-6 text-[10px] bg-white/5 hover:bg-brand-maroon/20 hover:text-white border border-white/10 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Atur Agenda"
              >
                ✎ Atur
              </button>
            )}

            <div className="space-y-4">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-brand-maroon-light/60">
                Agenda Terdekat Kelas
              </span>
              <h3 className="text-2xl md:text-4xl font-black text-white leading-snug tracking-tight">
                {agenda.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
                {agenda.description || 'Tidak ada deskripsi agenda.'}
              </p>
            </div>

            {/* Live Timer Grid (Centered & Enlarged) */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 mt-8 pt-8 border-t border-white/5 text-center max-w-md mx-auto w-full">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-md">
                <span className="block text-3xl md:text-4xl font-black text-white font-mono">{timeLeft.days}</span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Hari</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-md">
                <span className="block text-3xl md:text-4xl font-black text-white font-mono">{timeLeft.hours}</span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Jam</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-md">
                <span className="block text-3xl md:text-4xl font-black text-white font-mono">{timeLeft.minutes}</span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Menit</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-md animate-pulse">
                <span className="block text-3xl md:text-4xl font-black text-brand-maroon-light font-mono">{timeLeft.seconds}</span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Detik</span>
              </div>
            </div>
          </div>

          {/* Widget: Jadwal Kuliah Hari Ini */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:border-brand-maroon/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-brand-maroon-light/60">
                  Jadwal Kuliah Hari Ini ({new Date().toLocaleDateString('id-ID', { weekday: 'long' })})
                </span>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="text-[10px] bg-white/5 hover:bg-brand-maroon/20 hover:text-white border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Lihat Semua Jadwal →
                </button>
              </div>

              {loadingTodayClasses ? (
                <div className="space-y-3 py-4 text-center">
                  <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse mx-auto"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse mx-auto"></div>
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-xs font-medium">Hore! Hari ini tidak ada jadwal kuliah aktif (Semester 5).</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 mt-2">
                  {todayClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-brand-dark/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors hover:bg-brand-dark/60"
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-brand-maroon/20 border border-brand-maroon/30 px-2 py-0.5 rounded text-brand-maroon-light">
                            🕒 {cls.jam_mulai ? cls.jam_mulai.split(':').slice(0, 2).join(':') : ''} - {cls.jam_selesai ? cls.jam_selesai.split(':').slice(0, 2).join(':') : ''}
                          </span>
                          <span className="text-[10px] font-bold bg-brand-navy/60 px-2 py-0.5 rounded text-slate-300">
                            Ruang: {cls.ruangan}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">{cls.nama_matkul}</h4>
                        <p className="text-[11px] text-slate-400">
                          Dosen: <span className="font-semibold text-slate-300">{cls.nama_dosen}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          PJ Matkul: <span className="font-semibold text-slate-300">{cls.pj_matkul || 'Belum ditentukan'}</span>
                        </p>
                      </div>

                      {cls.link_kelas && (
                        <a
                          href={cls.link_kelas}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-brand-maroon/20 hover:bg-brand-maroon/30 border border-brand-maroon/30 text-brand-maroon-light text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center inline-block active:scale-95 self-start sm:self-center"
                        >
                          Masuk Kelas
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Widget: Quote Terbaik Hari Ini */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:border-brand-maroon/30">
            <div className="absolute top-0 right-0 p-6 text-2xl text-white/10 select-none group-hover:scale-110 transition-transform">
              “
            </div>

            <div className="space-y-4 text-center">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-brand-maroon-light/60 block">
                Quote Terbaik Hari Ini
              </span>

              {loadingQuote ? (
                <div className="space-y-2 py-4">
                  <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse mx-auto"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse mx-auto"></div>
                </div>
              ) : (
                <blockquote className="text-base md:text-lg font-sans italic text-slate-200 leading-relaxed font-medium tracking-wide max-w-xl mx-auto">
                  &ldquo;{randomQuote?.quote}&rdquo;
                </blockquote>
              )}
            </div>

            <div className="border-t border-white/5 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">{randomQuote?.author}</span>
                <span>•</span>
                <span className="text-brand-maroon-light bg-brand-maroon/20 px-2 py-0.5 rounded text-[10px]">
                  {randomQuote?.context}
                </span>
              </div>
              <button
                onClick={() => onNavigate('quotes')}
                className="text-brand-maroon-light hover:underline font-semibold cursor-pointer"
              >
                Lihat Dinding Quote →
              </button>
            </div>
          </div>

        </section>

        {/* Section: Penyelamat Tugas (Deadline Tracking) */}
        <section className="space-y-6 pt-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-brand-maroon"></span>
            🎯 Penyelamat Tugas (Deadline Tracker)
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List Active Deadlines */}
            <div className={`${userRole === 'member' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
              {loadingDeadlines ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400">
                  <div className="h-6 w-6 rounded-full border-2 border-brand-maroon border-t-transparent animate-spin mx-auto mb-2"></div>
                  <p className="text-xs font-mono">Memuat tenggat tugas...</p>
                </div>
              ) : deadlines.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-slate-400 text-sm">
                  🎉 Hore! Tidak ada deadline tugas aktif saat ini.
                </div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {deadlines.map((task) => {
                    const timeInfo = getDeadlineTimeInfo(task.tanggal_deadline)

                    // Panic color indicator variables
                    let cardBorderClass = 'border-white/10'
                    let badgeColorClass = 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                    let badgeLabel = 'Aman'
                    let pulseClass = ''

                    if (timeInfo.panicLevel === 'red') {
                      cardBorderClass = 'border-rose-500 shadow-lg shadow-rose-950/20'
                      badgeColorClass = 'bg-rose-950/50 border-rose-800 text-rose-400'
                      badgeLabel = 'PANIK KAU DEK!'
                      pulseClass = 'animate-pulse'
                    } else if (timeInfo.panicLevel === 'yellow') {
                      cardBorderClass = 'border-amber-500/50'
                      badgeColorClass = 'bg-amber-950/50 border-amber-800 text-amber-400'
                      badgeLabel = 'Peringatan'
                    }

                    return (
                      <div
                        key={task.id}
                        className={`bg-white/5 border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white/10 ${cardBorderClass} ${pulseClass}`}
                      >
                        <div className="space-y-2 flex-grow">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs bg-brand-maroon/20 text-brand-maroon-light px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                              {task.nama_matkul}
                            </span>
                            <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeColorClass}`}>
                              {badgeLabel}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white leading-snug">{task.deskripsi_tugas}</h4>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <span>⏱ Sisa Waktu:</span>
                            <span className={`font-bold ${timeInfo.panicLevel === 'red' ? 'text-rose-400' : timeInfo.panicLevel === 'yellow' ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {timeInfo.text}
                            </span>
                          </div>
                        </div>

                        {task.link_pengumpulan && (
                          <a
                            href={task.link_pengumpulan}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-brand-navy hover:bg-brand-navy-hover border border-white/5 text-white font-bold py-2 px-4 rounded-xl text-xs text-center transition-all cursor-pointer inline-block whitespace-nowrap active:scale-95 shadow"
                          >
                            🔗 Kumpulkan
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Input Form for New Deadline */}
            {(userRole === 'admin' || userRole === 'owner') && (
              <div className="lg:col-span-5">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-4">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-base font-bold text-white">Tambah Deadline Baru</h3>
                    <p className="text-xs text-slate-400 mt-0.5">PJ atau anggota kelas dapat mengunggah tugas baru.</p>
                  </div>

                  <form onSubmit={handleCreateDeadline} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        Nama Mata Kuliah
                      </label>
                      <input
                        type="text"
                        value={newMatkul}
                        onChange={(e) => setNewMatkul(e.target.value)}
                        placeholder="Contoh: Pemrograman Web"
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        Deskripsi Tugas
                      </label>
                      <textarea
                        value={newDeskripsi}
                        onChange={(e) => setNewDeskripsi(e.target.value)}
                        placeholder="Contoh: Tugas Individu 4 - Menghubungkan client side ke Supabase dengan RLS."
                        rows="2"
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white leading-relaxed resize-none"
                        required
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                          Tenggat Waktu
                        </label>
                        <input
                          type="datetime-local"
                          value={newTanggalDeadline}
                          onChange={(e) => setNewTanggalDeadline(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white cursor-pointer font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                          Link Pengumpulan <span className="text-[9px] text-slate-500 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="url"
                          value={newLinkPengumpulan}
                          onChange={(e) => setNewLinkPengumpulan(e.target.value)}
                          placeholder="https://classroom.google.com"
                          className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingDeadline}
                      className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-brand-maroon/20 cursor-pointer active:scale-95 disabled:opacity-50 mt-1"
                    >
                      {submittingDeadline ? "Menyimpan..." : "Tambah Tugas"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Widget 3: Navigation Menu Cards */}
        <section className="space-y-6 pt-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-brand-maroon"></span>
            Navigasi Fitur Kelas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

            {/* Card 1: Quotes Wall (Active) */}
            <div
              onClick={() => onNavigate('quotes')}
              className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/10"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                  ✍
                </div>
                <h3 className="font-bold text-lg text-white">Quotes Wall</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tulis, baca, dan bagikan kata-kata legendaris kelas secara real-time.
                </p>
              </div>
              <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                Buka Aplikasi <span>→</span>
              </span>
            </div>

            {/* Card 2: All-Round Gacha (Active) */}
            <div
              onClick={() => onNavigate('gacha')}
              className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/10"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                  🎲
                </div>
                <h3 className="font-bold text-lg text-white">All-Round Gacha</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gacha pembagian kelompok, piket kelas, atau presentasi secara acak dan adil.
                </p>
              </div>
              <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                Buka Aplikasi <span>→</span>
              </span>
            </div>

            {/* Card 3: Hall of Fame (Active) */}
            <div
              onClick={() => onNavigate('hall-of-fame')}
              className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/10"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                  👑
                </div>
                <h3 className="font-bold text-lg text-white">Hall of Fame</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nominasi penghargaan mahasiswa teraktif, terambis, terlucu sekelas.
                </p>
              </div>
              <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                Buka Aplikasi <span>→</span>
              </span>
            </div>

            {/* Card 4: Kelompok Tugas (Freeze / Coming Soon) */}
            <div
              onClick={() => onNavigate('groups')}
              className="bg-gradient-to-br from-brand-maroon/10 to-brand-navy/10 border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl text-slate-400 group-hover:bg-amber-500/10 group-hover:text-amber-300 transition-colors">
                    📂
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    ⏳ Freeze / Segera Hadir
                  </span>
                </div>
                <h3 className="font-bold text-lg text-white">Kelompok Tugas</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fitur rekap kelompok sedang di-freeze. Pembagian kelompok dapat dilakukan langsung di halaman <span className="text-brand-maroon-light font-bold">All-Round Gacha</span>.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/5">
                <span className="text-[11px] text-slate-500 font-mono">
                  Gunakan Gacha Kelompok
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onNavigate('gacha')
                  }}
                  className="text-xs text-brand-maroon-light font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Buka Gacha <span>→</span>
                </button>
              </div>
            </div>

            {/* Card 5: Galeri Kenangan (Active) */}
            <div
              onClick={() => onNavigate('gallery')}
              className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/10"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                  📸
                </div>
                <h3 className="font-bold text-lg text-white">Galeri Kenangan</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dokumentasi foto dan kenangan momen-momen kebersamaan seru kelas.
                </p>
              </div>
              <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                Buka Aplikasi <span>→</span>
              </span>
            </div>

            {/* Card 6: Jadwal Kuliah (Active) */}
            <div
              onClick={() => onNavigate('schedule')}
              className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-white/10 rounded-2xl p-6 hover:border-brand-maroon/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/10"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                  📅
                </div>
                <h3 className="font-bold text-lg text-white">Jadwal Kuliah</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lihat jadwal harian kelas per semester, ruangan, dosen, dan link kelas online.
                </p>
              </div>
              <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                Buka Aplikasi <span>→</span>
              </span>
            </div>

            {/* Card 7: Kelola Whitelist (Owner Only) */}
            {userRole === 'owner' && (
              <div
                onClick={() => setIsWhitelistModalOpen(true)}
                className="bg-gradient-to-br from-brand-maroon/20 to-brand-navy/20 border border-brand-maroon/30 rounded-2xl p-6 hover:border-brand-maroon hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-brand-maroon/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-maroon/20 flex items-center justify-center text-xl text-brand-maroon-light group-hover:bg-brand-maroon/30 transition-colors">
                    👥
                  </div>
                  <h3 className="font-bold text-lg text-white">Kelola Whitelist & Role</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Panel Owner khusus untuk menambah email mahasiswa, menghapus akses, atau mengubah level hak akses.
                  </p>
                </div>
                <span className="text-xs text-brand-maroon-light font-bold flex items-center gap-1 mt-4">
                  Buka Panel Manager <span>→</span>
                </span>
              </div>
            )}

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-brand-dark/80 py-8 text-center text-xs text-slate-500 mt-16">
        <p>© 2026 Besiuin Hub. Sistem Informasi UIN. All rights reserved.</p>
        <p className="mt-1 text-slate-600 font-mono">Handcrafted with React, Vite, Tailwind CSS v4 & Supabase</p>
      </footer>
      {/* Edit Agenda Modal */}
      {isEditAgendaOpen && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white">Atur Agenda Countdown</h3>
              <p className="text-xs text-slate-400 mt-1">Ubah judul, detail deskripsi, dan waktu target hitung mundur.</p>
            </div>

            <form onSubmit={handleSaveAgenda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Judul Agenda
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: UAS Semester Ganjil"
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Target Waktu & Tanggal
                </label>
                <input
                  type="datetime-local"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white cursor-pointer font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Deskripsi Singkat
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Tulis instruksi atau catatan kecil untuk agenda ini..."
                  rows="3"
                  className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none resize-none text-white leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditAgendaOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-3 rounded-xl text-sm transition-all cursor-pointer active:scale-95 text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAgenda}
                  className="flex-1 bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-brand-maroon/20 cursor-pointer active:scale-95 disabled:opacity-50 text-center"
                >
                  {savingAgenda ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Whitelist Manager Modal (Owner Only) */}
      {isWhitelistModalOpen && userRole === 'owner' && (
        <div className="fixed inset-0 z-50 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden space-y-6">
            
            {/* Header */}
            <div className="border-b border-white/5 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>👥</span> Kelola Whitelist & Hak Akses
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tambah mahasiswa baru ke portal kelas atau sesuaikan level kewenangan.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsWhitelistModalOpen(false)
                  setWhitelistStatus(null)
                }}
                className="text-slate-400 hover:text-white text-lg font-bold font-mono p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notification alert */}
            {whitelistStatus && (
              <div className={`p-4 rounded-xl text-xs border ${
                whitelistStatus.type === 'success' ? 'bg-emerald-950/45 border-emerald-800 text-emerald-300' : 'bg-rose-950/45 border-rose-800 text-rose-300'
              }`}>
                <p className="leading-relaxed font-medium">{whitelistStatus.text}</p>
              </div>
            )}

            {/* Content Container (Scrollable) */}
            <div className="flex-grow overflow-y-auto space-y-6 pr-2">
              
              {/* Form Add User */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-brand-maroon-light uppercase tracking-wider">Tambah User Baru</h4>
                <form onSubmit={handleAddWhitelist} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nama Lengkap</label>
                    <input
                      type="text"
                      value={whitelistName}
                      onChange={(e) => setWhitelistName(e.target.value)}
                      placeholder="Contoh: Arghi Vianuri"
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white font-semibold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email UIN</label>
                    <input
                      type="email"
                      value={whitelistEmail}
                      onChange={(e) => setWhitelistEmail(e.target.value)}
                      placeholder="user@mhs.uinjkt.ac.id"
                      className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white font-mono"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Role</label>
                      <select
                        value={whitelistRole}
                        onChange={(e) => setWhitelistRole(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-brand-dark p-2.5 text-xs focus:border-brand-maroon focus:outline-none text-white cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold p-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow active:scale-95 whitespace-nowrap h-[38px] flex items-center justify-center animate-fade-in"
                    >
                      + Tambah
                    </button>
                  </div>
                </form>
              </div>

              {/* Whitelist Users Table/List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Pengguna Saat Ini ({whitelistUsers.length})</h4>
                {loadingWhitelist ? (
                  <div className="text-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-brand-maroon border-t-transparent animate-spin mx-auto mb-2"></div>
                    <p className="text-[10px] text-slate-500 font-mono">Memuat database pengguna...</p>
                  </div>
                ) : whitelistUsers.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-500">Tidak ada data whitelist ditemukan.</p>
                ) : (
                  <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-brand-dark/20">
                    {whitelistUsers.map((user) => (
                      <div key={user.email} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors hover:bg-white/5">
                        <div className="space-y-0.5 text-left">
                          <h5 className="text-sm font-bold text-white">{user.nama_mahasiswa}</h5>
                          <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <select
                            value={user.role || 'member'}
                            onChange={(e) => handleUpdateRole(user.email, e.target.value)}
                            className="bg-brand-dark border border-white/10 rounded-lg p-1.5 text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                          <button
                            onClick={() => handleDeleteWhitelist(user.email, user.nama_mahasiswa)}
                            className="text-xs font-bold text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-white/5 pt-4 flex justify-end">
              <button
                onClick={() => {
                  setIsWhitelistModalOpen(false)
                  setWhitelistStatus(null)
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

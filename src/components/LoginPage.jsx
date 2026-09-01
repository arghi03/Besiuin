import { useState } from 'react'
import { supabase } from '../config/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)
    setAuthSuccess(null)

    const trimmedEmail = email.trim().toLowerCase()

    try {
      // Lapis 1: Validasi Domain Email Kampus UIN Jakarta
      if (!trimmedEmail.endsWith('@mhs.uinjkt.ac.id')) {
        throw new Error('Akses Ditolak! Anda harus menggunakan email resmi mahasiswa UIN Jakarta (@mhs.uinjkt.ac.id).')
      }

      // Lapis 2: Validasi Whitelist Kelas B (Cek Database)
      const { data: whitelist, error: whitelistError } = await supabase
        .from('whitelist_users')
        .select('email')
        .eq('email', trimmedEmail)
        .maybeSingle()

      if (whitelistError) {
        throw new Error(`Gagal memverifikasi whitelist: ${whitelistError.message}`)
      }

      if (!whitelist) {
        throw new Error('Email Anda tidak terdaftar sebagai anggota Kelas B.')
      }

      // Lapis 3: Lakukan Autentikasi Supabase Auth Sesuai Mode
      if (authMode === 'forgot') {
        // Send Password Reset Email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: window.location.origin,
        })
        if (resetError) throw resetError
        
        setAuthSuccess('Tautan pemulihan kata sandi telah dikirim ke email kampus Anda! Silakan periksa Kotak Masuk atau folder Spam.')
      } else if (authMode === 'signup') {
        // Sign Up new user
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        })
        if (error) throw error
        
        if (data.user && data.session === null) {
          setAuthSuccess('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi (atau langsung login jika konfirmasi email dinonaktifkan).')
        } else {
          setAuthSuccess('Pendaftaran berhasil dan Anda telah otomatis login!')
        }
      } else {
        // Log In existing user
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setAuthError(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex items-center justify-center relative overflow-hidden font-sans px-6 selection:bg-brand-maroon selection:text-white">
      {/* Glow Effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand-maroon/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-brand-navy/35 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-maroon to-red-950 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-brand-maroon/20 mx-auto">
            B
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white font-serif">Besiuin Space</h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">Sistem Informasi UIN</p>
          </div>
        </div>

        {/* Auth Mode Description */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-300">
            {authMode === 'forgot'
              ? 'Atur Ulang Kata Sandi'
              : authMode === 'signup'
              ? 'Daftar Akun Mahasiswa Baru'
              : 'Masuk ke Portal Kelas'}
          </h2>
          {authMode === 'forgot' && (
            <p className="text-xs text-slate-400 mt-1">
              Masukkan email kampus Anda untuk menerima tautan pemulihan.
            </p>
          )}
        </div>

        {/* Error / Success Notifications */}
        {authError && (
          <div className="p-4 bg-rose-950/45 border border-rose-800 text-rose-300 text-xs rounded-xl leading-relaxed">
            <strong>Gagal:</strong> {authError}
          </div>
        )}

        {authSuccess && (
          <div className="p-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 text-xs rounded-xl leading-relaxed">
            <strong>Sukses:</strong> {authSuccess}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Alamat Email Kampus
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@mhs.uinjkt.ac.id"
              className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white transition-colors"
              required
            />
          </div>

          {authMode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Kata Sandi
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot')
                      setAuthError(null)
                      setAuthSuccess(null)
                    }}
                    className="text-[11px] text-brand-maroon-light/75 hover:text-white transition-colors cursor-pointer hover:underline"
                  >
                    Lupa kata sandi?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white transition-colors"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-brand-maroon/20 hover:shadow-brand-maroon/30 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? 'Memproses...'
              : authMode === 'forgot'
              ? 'Kirim Tautan Reset'
              : authMode === 'signup'
              ? 'Daftar Sekarang'
              : 'Masuk Sekarang'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2">
          {authMode === 'forgot' ? (
            <button
              onClick={() => {
                setAuthMode('login')
                setAuthError(null)
                setAuthSuccess(null)
              }}
              className="text-xs text-brand-maroon-light/75 hover:text-white transition-colors cursor-pointer hover:underline"
            >
              ← Kembali ke Halaman Masuk
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
                setAuthError(null)
                setAuthSuccess(null)
              }}
              className="text-xs text-brand-maroon-light/75 hover:text-white transition-colors cursor-pointer hover:underline"
            >
              {authMode === 'signup'
                ? 'Sudah punya akun? Masuk di sini'
                : 'Belum punya akun? Daftar di sini'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

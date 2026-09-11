import { useState } from 'react'
import { supabase } from '../config/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(null)

  // Signup fields
  const [signupUsername, setSignupUsername] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)
    setAuthSuccess(null)

    const rawInput = email.trim()
    let trimmedEmail = rawInput.toLowerCase()
    let resolvedUsername = ''

    try {
      // Allow username login: if input doesn't contain '@', treat as username
      if (!trimmedEmail.includes('@')) {
        resolvedUsername = trimmedEmail

        // 1) Look up email by username
        const { data: byUsername } = await supabase
          .from('whitelist_users')
          .select('email')
          .eq('username', resolvedUsername)
          .maybeSingle()

        if (byUsername?.email) {
          trimmedEmail = byUsername.email
        } else {
          // 2) Fallback: look up by email prefix
          const usernamePrefix = resolvedUsername
          trimmedEmail = `${usernamePrefix}@mhs.uinjkt.ac.id`

          const { data: whitelistUser } = await supabase
            .from('whitelist_users')
            .select('email')
            .ilike('email', `${usernamePrefix}@%`)
            .maybeSingle()

          if (whitelistUser?.email) {
            trimmedEmail = whitelistUser.email
          }
        }
      }

      // 1. Check UIN Jakarta Student Email Domain
      if (!trimmedEmail.endsWith('@mhs.uinjkt.ac.id')) {
        throw new Error('Akses Ditolak! Anda harus menggunakan email resmi mahasiswa UIN Jakarta (@mhs.uinjkt.ac.id) atau username terdaftar.')
      }

      // 2. Check Whitelist Table
      const { data: whitelist, error: whitelistError } = await supabase
        .from('whitelist_users')
        .select('email, role, nama_mahasiswa, username')
        .eq('email', trimmedEmail)
        .maybeSingle()

      if (whitelistError) {
        throw new Error(`Gagal memverifikasi whitelist: ${whitelistError.message}`)
      }

      if (!whitelist) {
        throw new Error('Username / Email Anda tidak terdaftar sebagai anggota Kelas Sistem Informasi.')
      }

      if (authMode === 'login' || authMode === 'forgot') {
        if (authMode === 'forgot') {
          // Send Password Reset Email
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo: `${window.location.origin}/`,
          })
          if (resetError) {
            throw new Error(resetError.message || 'Gagal mengirim tautan reset.')
          }
          setAuthSuccess('Tautan reset kata sandi telah dikirim ke email kampus Anda.')
        } else {
          // Login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: password,
          })
          if (loginError) {
            if (loginError.message.toLowerCase().includes('invalid login credentials')) {
              throw new Error('Kata sandi salah. Jika lupa, klik "Lupa kata sandi?".')
            }
            throw new Error(loginError.message)
          }
          if (!loginData.session) {
            throw new Error('Gagal membuat sesi login.')
          }
        }
      } else if (authMode === 'signup') {
        // Prevent duplicate registrations
        const { data: existingUser } = await supabase.auth.admin?.listUsers
        // Use auth.getUser with the email to check if user already exists (simpler approach: try signUp and catch error)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
            throw new Error('Email ini sudah terdaftar. Silakan login atau gunakan lupa kata sandi.')
          }
          throw new Error(signUpError.message)
        }

        // Update whitelist username on signup
        const updatePayload = {}
        if (signupUsername.trim()) updatePayload.username = signupUsername.trim().toLowerCase()

        if (Object.keys(updatePayload).length > 0) {
          await supabase
            .from('whitelist_users')
            .update(updatePayload)
            .eq('email', trimmedEmail)
        }

        setAuthSuccess('Akun berhasil dibuat! Silakan verifikasi email kampus Anda untuk mengaktifkan akun.')
      }
    } catch (err) {
      setAuthError(err.message || 'Terjadi kesalahan tak terduga.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0e]/60 text-zinc-200 font-sans antialiased relative flex flex-col justify-between">

      {/* Background Overlay */}
      <div className="fixed inset-0 bg-[#090b0e]/60 pointer-events-none z-0"></div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 bg-[#0b0e14]/90 backdrop-blur-md py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#161a23] border border-white/10 flex items-center justify-center p-1 shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo Besiuin Space"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sm text-white">Besiuin Space</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Sistem Informasi</span>
              </div>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">

          {/* Form Panel */}
          <div className="bg-[#11141c]/90 border border-white/10 rounded-lg p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">

            {/* Mode Switcher Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {authMode === 'forgot' ? 'Pemulihan Akses' : authMode === 'signup' ? 'Pendaftaran Anggota' : 'Masuk'}
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  {authMode === 'forgot'
                    ? 'Masukkan email kampus untuk mereset kata sandi'
                    : authMode === 'signup'
                    ? 'Buat akun baru anggota kelas'
                    : 'Masuk menggunakan email atau username'}
                </p>
              </div>
              <span className="material-symbols-outlined text-maroon-600 text-2xl">lock</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 bg-[#0b0e14] p-1 rounded-md border border-white/10 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError(null)
                  setAuthSuccess(null)
                }}
                className={`py-1.5 rounded transition-colors ${authMode === 'login' ? 'bg-maroon-800 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup')
                  setAuthError(null)
                  setAuthSuccess(null)
                }}
                className={`py-1.5 rounded transition-colors ${authMode === 'signup' ? 'bg-maroon-800 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Daftar
              </button>
            </div>

            {/* Notifications */}
            {authError && (
              <div className="p-3 rounded bg-maroon-950/80 border border-maroon-700 text-xs font-mono text-rose-200 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-rose-400 shrink-0 mt-0.5">error</span>
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="p-3 rounded bg-[#10231b] border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-emerald-400 shrink-0 mt-0.5">check_circle</span>
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Email atau Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-zinc-500">mail</span>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email atau username"
                    className="w-full bg-[#0b0e14] border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
                    required
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Username
                    </label>
                    <input
                      type="text"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="username_unik"
                      className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
                      required
                    />
                  </div>
                </>
              )}

              {authMode !== 'forgot' && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
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
                        className="text-[11px] font-mono text-zinc-400 hover:text-maroon-400 transition-colors"
                      >
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-sm text-zinc-500">key</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0b0e14] border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-maroon-700 transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-2.5 px-4 rounded bg-[#991b1b] hover:bg-[#7f1d1d] active:bg-[#680007] text-white font-mono text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Memproses…</span>
                  </>
                ) : (
                  <>
                    <span>
                      {authMode === 'forgot' ? 'Kirim Tautan Reset' : authMode === 'signup' ? 'Daftar Sekarang' : 'Masuk'}
                    </span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Back to Login link when in Forgot mode */}
            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError(null)
                  setAuthSuccess(null)
                }}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors text-center"
              >
                ← Kembali ke Halaman Masuk
              </button>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full bg-[#0b0e14]/90 border-t border-white/10 py-4 text-xs font-mono text-zinc-500 text-center">
        Besiuin Space • Kelas Sistem Informasi UIN Syarif Hidayatullah Jakarta
      </footer>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { compressAvatar } from '../utils/image'
import { fetchProfile, updateProfileUsername, updateProfilePhoto } from '../utils/profile'

export default function ProfileModal({ userEmail, onClose, onProfileUpdated }) {
  const [username, setUsername] = useState('')
  const [foto, setFoto] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Password states (hidden by default)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true)
        const profile = await fetchProfile(userEmail)
        setUsername(profile.username || (userEmail || '').split('@')[0])
        setFoto(profile.foto || null)
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [userEmail])

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingPhoto(true)
      setErrorMsg(null)
      const dataUrl = await compressAvatar(file)
      const result = await updateProfilePhoto(userEmail, dataUrl)
      setFoto(result.url)
      onProfileUpdated?.({ foto: result.url })
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengunggah foto ke server.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setSavingUsername(true)
    setErrorMsg(null)
    try {
      await updateProfileUsername(userEmail, username.trim())
      onProfileUpdated?.({ username: username.trim() })
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan username ke server.')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setSavingPassword(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui kata sandi.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-[#11141c] border border-white/10 rounded-lg shadow-2xl w-full max-w-md sm:max-w-lg flex flex-col overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-maroon-600">manage_accounts</span>
            Profil Saya
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 -mr-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="px-3 py-2.5 rounded text-xs font-mono flex items-start gap-2 border bg-maroon-950/60 border-maroon-800 text-rose-300">
              <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingProfile ? (
            <div className="text-center py-8 sm:py-10">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-mono text-zinc-500">Memuat profil...</p>
            </div>
          ) : (
            <>
              {/* Photo + Username — stacked on mobile, horizontal on sm+ */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                <div className="shrink-0">
                  {foto ? (
                    <img
                      src={foto}
                      alt="Foto profil"
                      className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg object-cover border border-white/15"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg bg-maroon-900/60 border border-maroon-800 flex items-center justify-center font-mono text-xl sm:text-lg font-bold text-rose-200">
                      {(username || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 w-full space-y-3 sm:space-y-3">
                  <div>
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Username</p>
                    <form onSubmit={handleSaveUsername} className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className="flex-1 bg-[#0b0e14] border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-maroon-700 transition-colors min-w-0"
                        placeholder="username_unik"
                      />
                      <button
                        type="submit"
                        disabled={savingUsername || !username.trim()}
                        className="px-3 py-2.5 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 hover:border-maroon-700 text-zinc-300 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {savingUsername ? '...' : 'Simpan'}
                      </button>
                    </form>
                  </div>

                  <div>
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">Foto Profil</p>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {uploadingPhoto ? 'hourglass_top' : 'add_a_photo'}
                      </span>
                      {uploadingPhoto ? 'Mengunggah ke server…' : 'Ganti foto'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Info */}
              <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-zinc-500 text-sm shrink-0">mail</span>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{userEmail}</p>
                  <p className="text-[10px] font-mono text-zinc-500">Email terdaftar di kelas</p>
                </div>
              </div>

              {/* Password Section — Hidden toggle */}
              <div className="border-t border-white/10 pt-4">
                {!showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(true)
                      setErrorMsg(null)
                    }}
                    className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">vpn_key</span>
                    Ubah kata sandi
                  </button>
                ) : (
                  <form onSubmit={handleUpdatePassword} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Ubah Kata Sandi</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setNewPassword('')
                          setConfirmPassword('')
                          setErrorMsg(null)
                        }}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                        Kata Sandi Baru
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-maroon-700 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                        Konfirmasi Kata Sandi
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full bg-[#0b0e14] border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-maroon-700 transition-colors"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="w-full py-2.5 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {savingPassword ? 'Menyimpan…' : 'Perbarui Kata Sandi'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

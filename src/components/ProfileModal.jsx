import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabaseClient'
import { compressAvatar } from '../utils/image'
import { fetchProfile, updateProfileName, updateProfilePhoto } from '../utils/profile'

export default function ProfileModal({ userEmail, onClose, onProfileUpdated }) {
  const [nama, setNama] = useState('')
  const [foto, setFoto] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', text }

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
        setNama(profile.nama || (userEmail || '').split('@')[0])
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
      setStatus(null)
      const dataUrl = await compressAvatar(file)
      const result = await updateProfilePhoto(userEmail, dataUrl)
      const newFoto = result.url || dataUrl
      setFoto(newFoto)
      setStatus({
        type: 'success',
        text: result.via === 'db'
          ? 'Foto profil berhasil diperbarui.'
          : 'Foto profil tersimpan di perangkat ini.',
      })
      onProfileUpdated?.({ foto: newFoto })
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Gagal memproses foto.' })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveName = async (e) => {
    e.preventDefault()
    if (!nama.trim()) return
    setSavingName(true)
    setStatus(null)
    try {
      const res = await updateProfileName(userEmail, nama.trim())
      setStatus({
        type: 'success',
        text: res.via === 'db'
          ? 'Nama berhasil diperbarui di server.'
          : 'Nama tersimpan sementara di perangkat ini.',
      })
      onProfileUpdated?.({ nama: nama.trim() })
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Gagal menyimpan nama.' })
    } finally {
      setSavingName(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setStatus({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' })
      return
    }

    setSavingPassword(true)
    setStatus(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
      setStatus({ type: 'success', text: 'Kata sandi berhasil diperbarui.' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Gagal memperbarui kata sandi.' })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-[#11141c] border border-white/10 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-maroon-600">manage_accounts</span>
            Profil Saya
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {status && (
            <div
              className={`px-3 py-2 rounded text-xs font-mono flex items-start gap-2 border ${
                status.type === 'success'
                  ? 'bg-[#10231b] border-emerald-500/30 text-emerald-300'
                  : 'bg-maroon-950/60 border-maroon-800 text-rose-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">
                {status.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{status.text}</span>
            </div>
          )}

          {loadingProfile ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-mono text-zinc-500">Memuat profil...</p>
            </div>
          ) : (
            <>
              {/* Photo + Name */}
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  {foto ? (
                    <img src={foto} alt="Foto profil" className="w-16 h-16 rounded-lg object-cover border border-white/15" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-maroon-900/60 border border-maroon-800 flex items-center justify-center font-mono text-lg font-bold text-rose-200">
                      {(nama || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Nama Tampilan</p>
                    <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        className="flex-1 bg-[#0b0e14] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-maroon-700 transition-colors"
                        placeholder="Nama kamu"
                      />
                      <button
                        type="submit"
                        disabled={savingName || !nama.trim()}
                        className="px-3 py-2 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 hover:border-maroon-700 text-zinc-300 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingName ? '...' : 'Simpan'}
                      </button>
                    </form>
                  </div>

                  <div>
                    <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Foto Profil</p>
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
                      {uploadingPhoto ? 'Mengunggah...' : 'Ganti foto'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Info */}
              <div className="bg-[#0b0e14] border border-white/10 rounded p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-zinc-500 text-sm">mail</span>
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
                      setStatus(null)
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
                          setStatus(null)
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

import { useState } from 'react'
import { supabase } from '../config/supabaseClient'

export default function ResetPasswordModal({ onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Password minimal harus 6 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password baru.')
      return
    }

    try {
      setLoading(true)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        if (onClose) onClose()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Gagal memperbarui kata sandi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-brand-dark/95 border border-white/10 rounded-3xl p-8 shadow-2xl relative space-y-6">
        
        {/* Glow decoration */}
        <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-brand-maroon/20 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-maroon to-red-950 flex items-center justify-center font-bold text-white text-xl shadow-lg mx-auto">
            🔑
          </div>
          <h2 className="text-2xl font-bold text-white">Atur Ulang Kata Sandi</h2>
          <p className="text-xs text-slate-400">
            Masukkan kata sandi baru untuk akun mahasiswa Anda.
          </p>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="p-3.5 bg-rose-950/45 border border-rose-800 text-rose-300 text-xs rounded-xl leading-relaxed">
            <strong>Gagal:</strong> {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-950/45 border border-emerald-800 text-emerald-300 text-xs rounded-xl leading-relaxed">
            <strong>✓ Berhasil:</strong> Kata sandi Anda telah berhasil diperbarui! Mengalihkan ke halaman utama...
          </div>
        )}

        {!success && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full rounded-xl border border-white/10 bg-brand-dark p-3 text-sm focus:border-brand-maroon focus:outline-none text-white transition-colors"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-grow bg-brand-maroon hover:bg-brand-maroon-hover text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-brand-maroon/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

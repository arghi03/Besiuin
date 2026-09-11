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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#11141c] border border-white/10 rounded-lg p-6 shadow-2xl space-y-5 fade-up">

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-mono text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-maroon-600 text-base">key</span>
            Atur Ulang Kata Sandi
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer p-1" title="Tutup">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 font-mono">
          Masukkan kata sandi baru untuk akun mahasiswa Anda.
        </p>

        {error && (
          <div className="px-3 py-2.5 rounded border bg-maroon-950/60 border-maroon-800 text-rose-300 text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="px-3 py-2.5 rounded border bg-[#10231b] border-emerald-500/30 text-emerald-300 text-xs font-mono leading-relaxed">
            Kata sandi berhasil diperbarui. Mengalihkan ke halaman utama…
          </div>
        )}

        {!success && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
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

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 font-mono text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-grow py-2.5 rounded bg-maroon-800 hover:bg-maroon-700 text-white font-mono text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menyimpan…' : 'Simpan Kata Sandi'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

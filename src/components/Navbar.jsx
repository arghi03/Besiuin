import { useState } from 'react'
import { supabase } from '../config/supabaseClient'

export default function Navbar({ currentPage, onNavigate, userRole, userName, profilePhoto, onOpenProfile, onOpenWhitelist }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Beranda' },
    { id: 'schedule', label: 'Jadwal Kuliah' },
    { id: 'quotes', label: 'Quotes Wall' },
    { id: 'gacha', label: 'Gacha' },
    { id: 'gallery', label: 'Galeri' },
    { id: 'members', label: 'Anggota' },
    { id: 'hall-of-fame', label: 'Hall of Fame' },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const initials = (userName || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0e14]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">

        {/* Brand */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 rounded bg-[#161a23] border border-white/10 flex items-center justify-center p-1 group-hover:border-maroon-700 transition-colors">
            <img src="/logo.png" alt="Logo Besiuin Space" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold tracking-tight text-sm text-white group-hover:text-rose-300 transition-colors">
            Besiuin Space
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#121620] px-2 py-1 rounded-md border border-white/10 text-xs font-mono">
          {navItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  isActive
                    ? 'bg-maroon-800 text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Account */}
        <div className="flex items-center gap-2">

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#151922] hover:bg-[#1a202c] border border-white/10 transition-colors text-xs font-mono text-zinc-300 cursor-pointer"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="w-6 h-6 rounded object-cover border border-white/10" />
              ) : (
                <span className="w-6 h-6 rounded bg-maroon-900/70 border border-maroon-800 flex items-center justify-center text-[9px] font-bold text-rose-200">
                  {initials}
                </span>
              )}
              <span className="font-medium max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">
                {userName ? userName.split(' ')[0] : 'Akun'}
              </span>
              <span className="material-symbols-outlined text-sm text-zinc-400">
                {isUserDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isUserDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-[#11141c] border border-white/10 rounded-md shadow-xl py-2 z-50 text-xs font-mono fade-up"
                onMouseLeave={() => setIsUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-white font-medium truncate">{userName || 'Anggota Kelas Sistem Informasi'}</p>
                  <p className="text-[10px] text-zinc-400">
                    Role: <span className="text-emerald-400 uppercase">{userRole}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false)
                    onOpenProfile?.()
                  }}
                  className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-zinc-400">manage_accounts</span>
                  <span>Profil Saya</span>
                </button>

                {userRole === 'owner' && onOpenWhitelist && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false)
                      onOpenWhitelist()
                    }}
                    className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-400">admin_panel_settings</span>
                    <span>Kelola Whitelist</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-rose-400 hover:bg-maroon-950/60 hover:text-rose-200 flex items-center gap-2 cursor-pointer border-t border-white/10 mt-1"
                >
                  <span className="material-symbols-outlined text-sm text-rose-400">logout</span>
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-1.5 rounded bg-[#151922] border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#0b0e14] border-b border-white/10 px-4 py-3 space-y-1 font-mono text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                setIsMenuOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between cursor-pointer ${
                currentPage === item.id ? 'bg-maroon-800 text-white font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

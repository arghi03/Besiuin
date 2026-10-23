import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './config/supabaseClient'
import Dashboard from './components/Dashboard'
import QuotesPage from './components/QuotesPage'
import GachaPage from './components/GachaPage'
import LoginPage from './components/LoginPage'
import GroupsPage from './components/GroupsPage'
import GalleryPage from './components/GalleryPage'
import SchedulePage from './components/SchedulePage'
import HallOfFame from './components/HallOfFame'
import MembersPage from './components/MembersPage'
import ResetPasswordModal from './components/ResetPasswordModal'
import ProfileModal from './components/ProfileModal'
import Navbar from './components/Navbar'
import { fetchProfile } from './utils/profile'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('member')
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false)

  // Profile state (nama tampilan + foto + username)
  const [userName, setUserName] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const lastUserIdRef = useRef(null)

  // Sinkronisasi role dan profil pengguna secara senyap di background (tanpa unmount/reload UI)
  const syncUserData = useCallback(async (email) => {
    if (!email) {
      setUserRole('member')
      setUserName('')
      setProfilePhoto(null)
      return
    }

    const emailLower = email.trim().toLowerCase()

    try {
      const { data, error } = await supabase
        .from('whitelist_users')
        .select('role')
        .eq('email', emailLower)
        .maybeSingle()

      if (!error && data && data.role) {
        setUserRole(data.role)
      } else {
        setUserRole('member')
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
      setUserRole('member')
    }

    try {
      const profile = await fetchProfile(emailLower)
      setUserName(profile.username || emailLower.split('@')[0])
      setProfilePhoto(profile.foto || null)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // 1. Initial cold-start check: Hanya saat web pertama kali dibuka
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return

      if (initialSession?.user?.email) {
        lastUserIdRef.current = initialSession.user.id
        setSession(initialSession)
        await syncUserData(initialSession.user.email)
      } else {
        setSession(null)
      }

      if (isMounted) setLoading(false)
    }).catch(() => {
      if (isMounted) setLoading(false)
    })

    // 2. Auth listener: Mendeteksi login, logout, atau token refresh saat ganti tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return

      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true)
      }

      // Kasus: User Logout
      if (event === 'SIGNED_OUT' || !newSession) {
        lastUserIdRef.current = null
        setSession(null)
        setUserRole('member')
        setUserName('')
        setProfilePhoto(null)
        setLoading(false)
        return
      }

      const previousUserId = lastUserIdRef.current
      const currentUserId = newSession.user?.id
      lastUserIdRef.current = currentUserId
      setSession(newSession)

      // Jika user baru login (berganti user ID), muat profilnya
      if (previousUserId !== currentUserId && newSession.user?.email) {
        await syncUserData(newSession.user.email)
      }

      // Pastikan loading awal selalu selesai, dan JANGAN set loading(true) lagi
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [syncUserData])

  // Dipanggil dari ProfileModal saat profil berubah
  const handleProfileUpdated = useCallback((patch) => {
    if ('username' in patch) setUserName(patch.username)
    if ('foto' in patch) setProfilePhoto(patch.foto)
  }, [])

  // Show loading state while checking auth session status
  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b0e] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-6 w-6 rounded-full border-2 border-maroon-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Memverifikasi sesi…</p>
        </div>
      </div>
    )
  }

  // If user opened a Password Recovery link without an active full session
  if (isResetPasswordOpen && !session) {
    return (
      <ResetPasswordModal
        onClose={() => setIsResetPasswordOpen(false)}
        onSuccess={() => setIsResetPasswordOpen(false)}
      />
    )
  }

  // Protected Route Logic: Force LoginPage if no active session
  if (!session) {
    return <LoginPage />
  }

  const userEmail = session.user?.email

  const navProps = {
    currentPage,
    onNavigate: setCurrentPage,
    userRole,
    userName,
    profilePhoto,
    onOpenProfile: () => setIsProfileOpen(true),
    onOpenWhitelist: () => setIsWhitelistOpen(true),
  }

  // Render Hub once user session is successfully verified
  return (
    <>
      {/* Navbar global — tampil di semua halaman */}
      <Navbar {...navProps} />

      {isResetPasswordOpen && (
        <ResetPasswordModal
          onClose={() => setIsResetPasswordOpen(false)}
          onSuccess={() => setIsResetPasswordOpen(false)}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          userEmail={userEmail}
          onClose={() => setIsProfileOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          onNavigate={setCurrentPage}
          userRole={userRole}
          userName={userName}
          profilePhoto={profilePhoto}
          isWhitelistOpen={isWhitelistOpen}
          setIsWhitelistOpen={setIsWhitelistOpen}
        />
      )}
      {currentPage === 'quotes' && (
        <QuotesPage onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
      {currentPage === 'gacha' && (
        <GachaPage onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
      {currentPage === 'groups' && (
        <GroupsPage
          onBack={() => setCurrentPage('dashboard')}
          onNavigateToGacha={() => setCurrentPage('gacha')}
          userRole={userRole}
        />
      )}
      {currentPage === 'gallery' && (
        <GalleryPage onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
      {currentPage === 'schedule' && (
        <SchedulePage onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
      {currentPage === 'members' && (
        <MembersPage onBack={() => setCurrentPage('dashboard')} />
      )}
      {currentPage === 'hall-of-fame' && (
        <HallOfFame onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
    </>
  )
}

export default App

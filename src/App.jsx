import { useState, useEffect, useCallback } from 'react'
import { supabase } from './config/supabaseClient'
import Dashboard from './components/Dashboard'
import QuotesPage from './components/QuotesPage'
import GachaPage from './components/GachaPage'
import LoginPage from './components/LoginPage'
import GroupsPage from './components/GroupsPage'
import GalleryPage from './components/GalleryPage'
import SchedulePage from './components/SchedulePage'
import HallOfFame from './components/HallOfFame'
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

  // Profile state (nama tampilan + foto)
  const [userName, setUserName] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)

  useEffect(() => {
    // 1. Get initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 2. Listen for auth changes (Login, Logout, Token Refreshed, Password Recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch user role + profile whenever session changes
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session || !session.user || !session.user.email) {
        setUserRole('member')
        setUserName('')
        setProfilePhoto(null)
        setLoading(false)
        return
      }

      const email = session.user.email.trim().toLowerCase()

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('whitelist_users')
          .select('role')
          .eq('email', email)
          .maybeSingle()

        if (!error && data && data.role) {
          setUserRole(data.role)
        } else {
          setUserRole('member')
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
        setUserRole('member')
      } finally {
        setLoading(false)
      }

      // Load profil (nama + foto)
      const profile = await fetchProfile(email)
      setUserName(profile.nama || email.split('@')[0])
      setProfilePhoto(profile.foto || null)
    }

    fetchUserRole()
  }, [session])

  // Dipanggil dari ProfileModal saat profil berubah
  const handleProfileUpdated = useCallback((patch) => {
    if ('nama' in patch) setUserName(patch.nama)
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
      {currentPage === 'hall-of-fame' && (
        <HallOfFame onBack={() => setCurrentPage('dashboard')} userRole={userRole} />
      )}
    </>
  )
}

export default App

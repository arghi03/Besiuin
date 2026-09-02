import { useState, useEffect } from 'react'
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

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('member')
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)

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

  // Fetch user role whenever session changes
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session || !session.user || !session.user.email) {
        setUserRole('member')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('whitelist_users')
          .select('role')
          .eq('email', session.user.email.trim().toLowerCase())
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
    }

    fetchUserRole()
  }, [session])

  // Show premium loading spinner while checking auth session status
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center text-slate-400">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 rounded-full border-4 border-brand-maroon border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs font-mono">Memverifikasi Sesi...</p>
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

  // Render Hub once user session is successfully verified
  return (
    <>
      {isResetPasswordOpen && (
        <ResetPasswordModal 
          onClose={() => setIsResetPasswordOpen(false)}
          onSuccess={() => setIsResetPasswordOpen(false)}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard onNavigate={setCurrentPage} userRole={userRole} />
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

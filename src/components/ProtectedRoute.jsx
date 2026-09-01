import { Navigate } from 'react-router-dom'

/**
 * ProtectedRoute Wrapper for React Router
 * Prevents non-logged-in users from accessing class features
 */
export default function ProtectedRoute({ session, children }) {
  if (!session) {
    // If no active session, redirect to login page
    return <Navigate to="/login" replace />
  }

  // If authenticated, render protected component
  return children
}

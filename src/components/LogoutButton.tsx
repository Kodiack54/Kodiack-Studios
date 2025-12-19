'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LogoutButton() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear any local storage items
      localStorage.removeItem('selectedCompanyId')

      // Redirect to login page (gateway handles auth)
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      // Still try to redirect even if there's an error
      router.push('/login')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-10 h-10 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-xl flex items-center justify-center transition-colors border border-red-600/50"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => !isLoggingOut && setShowConfirm(false)}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-xl shadow-xl z-50 p-6 w-96 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Logout</h3>
                <p className="text-sm text-gray-400">End your session?</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to log out of the Dev Command Center? Any unsaved changes will be lost.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Yes, Logout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

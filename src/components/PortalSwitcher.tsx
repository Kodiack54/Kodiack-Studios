'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Monitor, Users, Wrench, LayoutGrid } from 'lucide-react'

interface Portal {
  id: string
  name: string
  description: string
  url: string
  icon: React.ReactNode
  color: string
  access: string[] // roles that can access this portal
}

interface PortalSwitcherProps {
  currentPortal?: string
  userRole?: string
}

export default function PortalSwitcher({ currentPortal = 'dev-dashboard', userRole = 'superadmin' }: PortalSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Define available portals - Production apps to verify deployments
  const portals: Portal[] = [
    {
      id: 'dev-command',
      name: 'Dev Command',
      description: 'Server management & deployment',
      url: '/dashboard',
      icon: <Monitor className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      access: ['superadmin', 'admin', 'dev']
    },
    {
      id: 'nextbid-portal',
      name: 'NextBid Portal',
      description: 'User opportunities & proposals',
      url: 'http://146.190.169.112:8004',
      icon: <Users className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      access: ['superadmin', 'admin', 'dev']
    },
    {
      id: 'nextbidder',
      name: 'NextBidder',
      description: 'Win SUPPLY contracts',
      url: 'http://146.190.169.112:8001',
      icon: <LayoutGrid className="w-5 h-5" />,
      color: 'from-purple-500 to-violet-500',
      access: ['superadmin', 'admin', 'dev']
    },
    {
      id: 'nextsource',
      name: 'NextSource',
      description: 'AI source learner',
      url: 'http://146.190.169.112:8003',
      icon: <Wrench className="w-5 h-5" />,
      color: 'from-orange-500 to-amber-500',
      access: ['superadmin', 'admin', 'dev']
    },
    {
      id: 'nexttech',
      name: 'NextTech',
      description: 'Dispatch & SOP tool',
      url: 'http://146.190.169.112:8002',
      icon: <Wrench className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-500',
      access: ['superadmin', 'admin', 'dev']
    },
  ]

  // Filter portals by user role
  const accessiblePortals = portals.filter(portal => portal.access.includes(userRole))
  const current = portals.find(p => p.id === currentPortal) || portals[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handlePortalSwitch(portal: Portal) {
    setIsOpen(false)

    // If it's an internal route, use Next.js navigation
    if (portal.url.startsWith('/')) {
      window.location.href = portal.url
    } else {
      // External URL - open in same window (or new tab with target="_blank")
      window.open(portal.url, '_blank')
    }
  }

  // Don't show if only one portal accessible
  if (accessiblePortals.length <= 1) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors border border-gray-600"
      >
        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${current.color} flex items-center justify-center text-white`}>
          {current.icon}
        </div>
        <span className="text-sm font-medium text-gray-200 hidden sm:inline">{current.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl border border-gray-700 py-2 z-50 bg-gray-800">
            <div className="px-3 pb-2 mb-2 border-b border-gray-700">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Switch Portal</p>
            </div>

            <div className="px-2 space-y-1">
              {accessiblePortals.map((portal) => {
                const isCurrent = portal.id === currentPortal
                return (
                  <button
                    key={portal.id}
                    onClick={() => handlePortalSwitch(portal)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-gray-700 cursor-default'
                        : 'hover:bg-gray-700 text-gray-300 hover:text-white'
                    }`}
                    disabled={isCurrent}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${portal.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {portal.icon}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${isCurrent ? 'text-white' : ''}`}>{portal.name}</p>
                        {isCurrent && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/50">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{portal.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer with hint */}
            <div className="px-3 pt-2 mt-2 border-t border-gray-700">
              <p className="text-xs text-gray-600 text-center">
                Access based on your role: <span className="text-gray-500 font-medium">{userRole}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

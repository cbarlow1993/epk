import { Link, useMatchRoute } from '@tanstack/react-router'
import { logout } from '~/server/auth'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

interface Profile {
  slug: string
  display_name: string
  profile_image_url: string
}

const NAV_ITEMS = [
  { label: 'Profile', href: '/dashboard' },
  { label: 'Bio', href: '/dashboard/bio' },
  { label: 'Music', href: '/dashboard/music' },
  { label: 'Events', href: '/dashboard/events' },
  { label: 'Technical', href: '/dashboard/technical' },
  { label: 'Press Assets', href: '/dashboard/press' },
  { label: 'Contact', href: '/dashboard/contact' },
  { label: 'Social Links', href: '/dashboard/socials' },
  { label: 'Theme', href: '/dashboard/theme' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export function DashboardSidebar({ profile }: { profile: Profile }) {
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  const navContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <p className="font-bold text-sm truncate">{profile.display_name}</p>
        <a
          href={`/${profile.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          View EPK
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = matchRoute({ to: item.href, fuzzy: true })
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-white bg-white/5 border-r-2 border-accent'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-text-secondary hover:text-white transition-colors text-left px-2 py-1"
        >
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-dark-surface border-b border-white/5 flex items-center px-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-2 -ml-2"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {mobileOpen ? (
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            )}
          </svg>
        </button>
        <span className="ml-3 font-bold text-sm truncate">{profile.display_name}</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 w-64 bg-dark-surface border-r border-white/5 flex flex-col z-40 transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-dark-surface border-r border-white/5 flex-col z-40">
        {navContent}
      </aside>
    </>
  )
}

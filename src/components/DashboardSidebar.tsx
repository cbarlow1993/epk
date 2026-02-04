import { Link, useMatchRoute } from '@tanstack/react-router'
import { logout } from '~/server/auth'
import { useState } from 'react'
import type { ProfileRow } from '~/types/database'

type SidebarProfile = Pick<ProfileRow, 'slug' | 'display_name' | 'profile_image_url'>

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
  { label: 'Files', href: '/dashboard/files' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Integrations', href: '/dashboard/integrations' },
  { label: 'Settings', href: '/dashboard/settings' },
]

const AGENCY_NAV_ITEMS = [
  { label: 'Roster', href: '/dashboard/roster' },
  { label: 'Team', href: '/dashboard/team' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Agency Analytics', href: '/dashboard/analytics-overview' },
]

export function DashboardSidebar({ profile, isAgency = false }: { profile: SidebarProfile; isAgency?: boolean }) {
  const matchRoute = useMatchRoute()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = isAgency
    ? [...NAV_ITEMS.slice(0, 1), ...AGENCY_NAV_ITEMS, ...NAV_ITEMS.slice(1)]
    : NAV_ITEMS

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const navContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-text-primary">
        <p className="font-display font-bold text-sm truncate">{profile.display_name}</p>
        <a
          href={`/${profile.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline uppercase tracking-wider"
        >
          View EPK
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = matchRoute({ to: item.href, fuzzy: true })
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-accent border-r-2 border-accent font-semibold bg-accent/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-text-primary">
        <button
          onClick={handleLogout}
          className="w-full text-xs text-text-secondary hover:text-accent transition-colors text-left px-2 py-1 uppercase tracking-wider"
        >
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-text-primary flex items-center px-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-text-primary p-2 -ml-2"
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
        <span className="ml-3 font-display font-bold text-sm truncate">{profile.display_name}</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-text-primary flex flex-col z-40 transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-text-primary flex-col z-40">
        {navContent}
      </aside>
    </>
  )
}

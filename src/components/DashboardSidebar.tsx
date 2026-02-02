import { Link, useMatchRoute } from '@tanstack/react-router'
import { logout } from '~/server/auth'
import { useNavigate } from '@tanstack/react-router'

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

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-dark-surface border-r border-white/5 flex flex-col z-40 hidden md:flex">
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
    </aside>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { GridIcon, BarsIcon, EyeIcon, GearIcon, HelpIcon, ClipboardIcon, BellIcon } from '@/components/common/icons'
import { NAV_ITEMS } from '@/data/constants'
import { useAuth } from '@/context/AuthContext'

const ICON_MAP: Record<string, React.ReactNode> = {
  grid: <GridIcon />, bars: <BarsIcon />, eye: <EyeIcon />,
  gear: <GearIcon />, help: <HelpIcon />, clipboard: <ClipboardIcon />,
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname, hash } = useLocation()
  const { user, isAuthenticated, isAdmin } = useAuth()
  
  function handleNavClick() {
    onClose() // Automatically close sidebar drawer on mobile after clicking link
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="brand brand--plain flex justify-between items-center w-full">
        <div className="brand-text"><div className="brand-name">Atheric AI</div></div>
        <button 
          onClick={onClose} 
          className="lg:hidden text-[#8a93a6] hover:text-[#e7eaf1] text-2xl font-bold p-1 cursor-pointer"
          aria-label="Close menu"
        >
          ×
        </button>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link 
              key={item.id} 
              to={item.href} 
              className={`nav-item${active ? ' active' : ''}`}
              onClick={handleNavClick}
            >
              {ICON_MAP[item.icon]}<span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="nav-sep"/>

      {/* Sidebar Footer with Profile ABOVE Settings, Support, and Notifikasi */}
      <nav className="nav-footer" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* User Profile as a standard sidebar nav-item ABOVE Settings (NON-CLICKABLE) */}
        <div 
          className="nav-item"
          style={{ cursor: 'default', pointerEvents: 'none', opacity: 0.95, marginBottom: '2px' }}
        >
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden',
            border: '1.5px solid var(--blue)', flexShrink: 0, background: 'var(--panel)'
          }}>
            <img src="/assets/avatar.svg" alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isAuthenticated && user ? user.username : 'Guest User'}
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isAuthenticated && user ? (user.role || 'USER') : 'Atheric AI'}
            </span>
          </div>
        </div>

        {/* Admin Portal Link — visible only for ADMIN role */}
        {isAdmin && (
          <Link
            to="/admin"
            className={`nav-item${pathname.startsWith('/admin') ? ' active' : ''}`}
            onClick={handleNavClick}
            style={{ background: pathname.startsWith('/admin') ? 'rgba(79,125,255,0.12)' : undefined }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Admin Portal</span>
          </Link>
        )}

        {/* Settings Link */}
        <Link 
          to="/settings" 
          className={`nav-item${pathname === '/settings' && hash !== '#notifications' ? ' active' : ''}`}
          onClick={handleNavClick}
        >
          {ICON_MAP.gear}<span>Settings</span>
        </Link>

        {/* Support Link */}
        <Link 
          to="/support" 
          className={`nav-item${pathname === '/support' ? ' active' : ''}`}
          onClick={handleNavClick}
        >
          {ICON_MAP.help}<span>Support</span>
        </Link>

        {/* Direct Link to Dedicated Notification History Page (/notifications) */}
        <Link
          to="/notifications"
          className={`nav-item${pathname === '/notifications' ? ' active' : ''}`}
          onClick={handleNavClick}
        >
          <BellIcon />
          <span>Notifikasi</span>
        </Link>
      </nav>
    </aside>
  )
}

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface Props { onSearch?: (q: string) => void }

function AppLayoutInner({ onSearch }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-active' : ''}`}>
      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar
          onSearch={onSearch}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <Outlet />
      </div>
    </div>
  )
}

export function AppLayout({ onSearch }: Props) {
  return <AppLayoutInner onSearch={onSearch} />
}

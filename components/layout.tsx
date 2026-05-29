import Link from 'next/link'
import { useRouter } from 'next/router'
import { LayoutDashboard, Users, LogOut, ChevronLeft } from 'lucide-react'
import { api } from '@/src/lib/api'

const NAV = [
  { href: '/',       icon: LayoutDashboard, label: 'Visão geral' },
  { href: '/users',  icon: Users,            label: 'Usuários'   },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()

  async function handleLogout() {
    try { await api.logout() } catch { /* ignore */ }
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-ink-800 border-r border-white/6 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/6">
          <div className="size-7 rounded-lg bg-brand-800 border border-brand-700/40 flex items-center justify-center text-brand-300 font-black text-sm">R</div>
          <span className="text-sm font-bold text-white">Rook Money</span>
          <span className="ml-auto text-[9px] font-bold text-danger bg-danger/15 border border-danger/30 px-1.5 py-0.5 rounded-full">ADMIN</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = router.pathname === href || (href !== '/' && router.pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-brand-800/60 text-brand-300 border border-brand-700/40' : 'text-slate-400 hover:bg-ink-700/60 hover:text-slate-200'
                }`}>
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/6 p-3 flex flex-col gap-1">
          <a href="http://localhost:3010/dashboard" target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-ink-700 transition-colors">
            <ChevronLeft className="size-3.5" />
            Abrir Dashboard
          </a>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-danger hover:bg-danger/10 transition-colors">
            <LogOut className="size-3.5" />
            Sair do backoffice
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { LayoutDashboard, Users, MessageSquare, LogOut, ChevronLeft, ScrollText, Crown, Tag, BarChart2, Bell, Settings, Newspaper, Mail, Sparkles, Activity, MessageCircle } from 'lucide-react'
import { api } from '../src/lib/api'

interface NavItem { href: string; icon: React.ElementType; label: string; badge?: number }

interface Props {
  children: React.ReactNode
  openFeedbackCount?: number
}

export function Layout({ children, openFeedbackCount = 0 }: Props) {
  const router = useRouter()

  const NAV: NavItem[] = [
    { href: '/',               icon: LayoutDashboard, label: 'Visão geral'    },
    { href: '/users',          icon: Users,           label: 'Usuários'       },
    { href: '/subscriptions',  icon: Crown,           label: 'Assinaturas PRO' },
    { href: '/rookinho-usage', icon: Sparkles,        label: 'Rookinho IA'    },
    { href: '/whatsapp-logs',  icon: MessageCircle,   label: 'WhatsApp'       },
    { href: '/reports',        icon: BarChart2,       label: 'Relatórios'     },
    { href: '/broadcast',      icon: Bell,            label: 'Push Broadcast' },
    { href: '/categories',     icon: Tag,             label: 'Categorias'     },
    { href: '/newsletter',     icon: Newspaper,       label: 'Newsletter'     },
    { href: '/email-flows',    icon: Mail,            label: 'Fluxos de Email' },
    { href: '/feedback',       icon: MessageSquare,   label: 'Feedback',      badge: openFeedbackCount || undefined },
    { href: '/logs',           icon: ScrollText,      label: 'Log de ações'   },
    { href: '/cron-status',    icon: Activity,        label: 'Status dos crons' },
    { href: '/settings',       icon: Settings,        label: 'Configurações'  },
  ]

  async function handleLogout() {
    try { await api.logout() } catch { /* ignore */ }
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-ink-800 border-r border-white/6 shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/6">
          <div className="relative h-8 shrink-0" style={{ width: 128 }}>
            <Image src="/logo.svg" alt="Rook Money" fill className="object-contain object-left" priority />
          </div>
          <span className="text-[10px] font-bold text-danger bg-danger/15 border border-danger/30 px-1.5 py-0.5 rounded-full leading-none shrink-0">ADMIN</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
          {NAV.map(({ href, icon: Icon, label, badge }) => {
            const active = router.pathname === href || (href !== '/' && router.pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-brand-800/60 text-brand-300 border border-brand-700/40'
                    : 'text-slate-500 hover:bg-ink-700/60 hover:text-slate-300'
                }`}>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && badge > 0 && (
                  <span className="size-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/6 p-3 flex flex-col gap-1">
          <a href="https://rookmoney.com/dashboard" target="_blank" rel="noreferrer"
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
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

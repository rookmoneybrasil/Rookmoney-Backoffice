import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Crown, Trash2, Shield, Mail, ArrowUpRight, Search, Bell } from 'lucide-react'
import { Layout } from '../../components/layout'
import type { AdminLog, LogsPage } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const page   = (query.page   as string) ?? '1'
  const action = (query.action as string) ?? ''
  const search = (query.search as string) ?? ''
  try {
    const qs  = new URLSearchParams({ page, pageSize: '30', action, search }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/logs?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, page: parseInt(page), action, search } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  plan_change:    <Crown  className="size-3.5 text-amber-400" />,
  delete_user:    <Trash2 className="size-3.5 text-danger" />,
  toggle_admin:   <Shield className="size-3.5 text-brand-400" />,
  send_email:     <Mail   className="size-3.5 text-success" />,
  push_broadcast: <Bell   className="size-3.5 text-brand-300" />,
}

const ACTION_LABELS: Record<string, string> = {
  plan_change:    'Plano alterado',
  delete_user:    'Conta deletada',
  toggle_admin:   'Admin alterado',
  send_email:     'Email enviado',
  push_broadcast: 'Push broadcast',
}

const ACTION_OPTIONS = [
  { value: '',               label: 'Todas as ações' },
  { value: 'plan_change',    label: 'Plano alterado' },
  { value: 'delete_user',    label: 'Conta deletada' },
  { value: 'toggle_admin',   label: 'Admin alterado' },
  { value: 'send_email',     label: 'Email enviado' },
  { value: 'push_broadcast', label: 'Push broadcast' },
]

export default function LogsPage({ data, page, action, search }: { data: LogsPage; page: number; action: string; search: string }) {
  return (
    <Layout>
      <Head><title>Log de ações — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Log de ações</h1>
          <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} registros</p>
        </div>

        <form className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 pointer-events-none" />
            <input name="search" defaultValue={search} placeholder="Buscar nos detalhes..."
              className="w-full bg-ink-800 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
          </div>
          <select name="action" defaultValue={action}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(search || action) && (
            <Link href="/logs" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          {data.items.length === 0 ? (
            <div className="py-12 text-center text-slate-600">Nenhuma ação encontrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['Ação', 'Detalhes', 'Data', ''].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((log: AdminLog) => (
                  <tr key={log.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {ACTION_ICONS[log.action] ?? null}
                        <span className="text-slate-300 font-medium whitespace-nowrap">{ACTION_LABELS[log.action] ?? log.action}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3">
                      {log.targetId !== 'broadcast' && (
                        <Link href={`/users/${log.targetId}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                          Ver <ArrowUpRight className="size-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/logs?action=${action}&search=${search}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/logs?action=${action}&search=${search}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

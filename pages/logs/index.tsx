import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { Crown, Trash2, Shield, Mail, ArrowUpRight } from 'lucide-react'
import { Layout } from '../../components/layout'
import type { AdminLog, LogsPage } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const page = (query.page as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ page, pageSize: '30' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/logs?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  plan_change:  <Crown  className="size-3.5 text-amber-400" />,
  delete_user:  <Trash2 className="size-3.5 text-danger" />,
  toggle_admin: <Shield className="size-3.5 text-brand-400" />,
  send_email:   <Mail   className="size-3.5 text-success" />,
}

const ACTION_LABELS: Record<string, string> = {
  plan_change:  'Plano alterado',
  delete_user:  'Conta deletada',
  toggle_admin: 'Admin alterado',
  send_email:   'Email enviado',
}

export default function LogsPage({ data, page }: { data: LogsPage; page: number }) {
  return (
    <Layout>
      <Head><title>Log de ações — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Log de ações</h1>
          <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} registros</p>
        </div>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          {data.items.length === 0 ? (
            <div className="py-12 text-center text-slate-600">Nenhuma ação registrada ainda.</div>
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
                        <span className="text-slate-300 font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/users/${log.targetId}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                        Ver <ArrowUpRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/logs?page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/logs?page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

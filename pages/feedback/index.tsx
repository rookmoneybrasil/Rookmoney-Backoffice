import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Bug, Lightbulb, ArrowUpRight } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type FeedbackPage } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const status = (query.status as string) ?? ''
  const type   = (query.type   as string) ?? ''
  const page   = (query.page   as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ status, type, page, pageSize: '20' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/feedback?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, status, type, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open:      { label: 'Aberto',     className: 'bg-brand-900/60 text-brand-300 border border-brand-700/40' },
  reviewing: { label: 'Analisando', className: 'bg-amber-900/60 text-amber-400 border border-amber-700/40' },
  done:      { label: 'Resolvido',  className: 'bg-success/10 text-success border border-success/20' },
}

export default function FeedbackPage({ data, status, type, page }: { data: FeedbackPage; status: string; type: string; page: number }) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id)
    try { await api.setFeedbackStatus(id, newStatus); router.replace(router.asPath) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setUpdating(null) }
  }

  return (
    <Layout>
      <Head><title>Feedback — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Bugs & Sugestões</h1>
            <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} envios</p>
          </div>
        </div>

        {/* Filters */}
        <form className="flex items-center gap-3 flex-wrap">
          <select name="status" defaultValue={status}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="reviewing">Analisando</option>
            <option value="done">Resolvido</option>
          </select>
          <select name="type" defaultValue={type}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos os tipos</option>
            <option value="bug">Bugs</option>
            <option value="suggestion">Sugestões</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(status || type) && (
            <Link href="/feedback" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        {/* List */}
        <div className="flex flex-col gap-3">
          {data.items.length === 0 && (
            <div className="bg-ink-800 border border-white/6 rounded-2xl py-12 text-center text-slate-600">Nenhum feedback encontrado.</div>
          )}
          {data.items.map(item => (
            <div key={item.id} className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3 flex-wrap">
                {/* Type icon */}
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'bug' ? 'bg-danger/10 text-danger' : 'bg-brand-800/60 text-brand-300'}`}>
                  {item.type === 'bug' ? <Bug className="size-4" /> : <Lightbulb className="size-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_LABELS[item.status]?.className ?? ''}`}>
                      {STATUS_LABELS[item.status]?.label ?? item.status}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.type === 'bug' ? 'bg-danger/10 text-danger' : 'bg-brand-900/60 text-brand-400'}`}>
                      {item.type === 'bug' ? 'Bug' : 'Sugestão'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.user.name} · {item.user.email} · {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Status changer */}
                <select
                  value={item.status}
                  disabled={updating === item.id}
                  onChange={e => updateStatus(item.id, e.target.value)}
                  className="bg-ink-700 border border-white/8 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none disabled:opacity-50"
                >
                  <option value="open">Aberto</option>
                  <option value="reviewing">Analisando</option>
                  <option value="done">Resolvido</option>
                </select>
              </div>

              <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{item.body}</p>

              <div className="flex justify-end">
                <Link href={`/users/${item.user.id}`} className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                  Ver usuário <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/feedback?status=${status}&type=${type}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/feedback?status=${status}&type=${type}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

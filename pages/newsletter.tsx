import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Mail, MailCheck, MailX, Trash2, ToggleLeft, ToggleRight, Download, Users } from 'lucide-react'
import { Layout } from '../components/layout'
import { api, type NewsletterPage, type NewsletterSubscriber } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const search = (query.search as string) ?? ''
  const status = (query.status as string) ?? ''
  const page   = (query.page   as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ search, status, page, pageSize: '50' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/newsletter?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, search, status, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

export default function NewsletterPageView({ data, search, status, page }: { data: NewsletterPage; search: string; status: string; page: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function toggleActive(sub: NewsletterSubscriber) {
    setLoading(sub.id)
    try {
      await api.newsletterToggle(sub.id, !sub.isActive)
      router.replace(router.asPath)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function deleteSub(sub: NewsletterSubscriber) {
    if (!confirm(`Remover ${sub.email} da newsletter?`)) return
    setLoading(sub.id)
    try {
      await api.newsletterDelete(sub.id)
      router.replace(router.asPath)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  function exportCSV() {
    const header = 'Email,Nome,Status,Inscrito em'
    const rows = data.items.map(s =>
      `${s.email},${s.name ?? ''},${s.isActive ? 'Ativo' : 'Inativo'},${new Date(s.createdAt).toLocaleDateString('pt-BR')}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <Head><title>Newsletter — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Newsletter</h1>
            <p className="text-sm text-slate-500 mt-1">Gerenciar inscritos da newsletter do blog</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-ink-700 border border-white/8 text-slate-300 hover:bg-ink-600 transition-colors">
            <Download className="size-3.5" /> Exportar CSV
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Users className="size-3.5" /> Total inscritos
            </div>
            <p className="text-2xl font-bold text-slate-100">{data.total}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <MailCheck className="size-3.5 text-success" /> Ativos
            </div>
            <p className="text-2xl font-bold text-success">{data.activeCount}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <MailX className="size-3.5 text-danger" /> Inativos
            </div>
            <p className="text-2xl font-bold text-danger">{data.total - data.activeCount}</p>
          </div>
        </div>

        {/* Filters */}
        <form className="flex items-center gap-3 flex-wrap">
          <input name="search" defaultValue={search} placeholder="Buscar por email ou nome..."
            className="flex-1 min-w-48 bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
          <select name="status" defaultValue={status}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(search || status) && (
            <Link href="/newsletter" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Nome</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Inscrito em</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600">Nenhum inscrito encontrado.</td></tr>
              )}
              {data.items.map(sub => (
                <tr key={sub.id} className="border-b border-white/4 hover:bg-ink-700/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-200 font-medium">{sub.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{sub.name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      sub.isActive
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {sub.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {new Date(sub.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(sub)}
                        disabled={loading === sub.id}
                        title={sub.isActive ? 'Desativar' : 'Reativar'}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          sub.isActive
                            ? 'text-success hover:bg-success/10'
                            : 'text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {sub.isActive ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                      </button>
                      <button
                        onClick={() => deleteSub(sub)}
                        disabled={loading === sub.id}
                        title="Remover permanentemente"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/newsletter?search=${search}&status=${status}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/newsletter?search=${search}&status=${status}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

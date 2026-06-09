import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Crown, ArrowUpRight, Search, Download, UserCheck } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type UsersPage } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const search = (query.search as string) ?? ''
  const plan   = (query.plan   as string) ?? ''
  const page   = (query.page   as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ search, plan, page, pageSize: '20' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/users?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, search, plan, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

export default function UsersPage({ data, search, plan, page }: { data: UsersPage; search: string; plan: string; page: number }) {
  return (
    <Layout>
      <Head><title>Usuários — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Usuários</h1>
            <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} cadastros</p>
          </div>
          <button onClick={() => api.exportUsers()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors">
            <Download className="size-4" /> Exportar CSV
          </button>
        </div>

        <form className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 pointer-events-none" />
            <input name="search" defaultValue={search} placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-ink-800 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
          </div>
          <select name="plan" defaultValue={plan}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos os planos</option>
            <option value="PRO">Pro (Stripe)</option>
            <option value="PRO_MANUAL">Pro Manual</option>
            <option value="FREE">Gratuito</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(search || plan) && (
            <Link href="/users" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                {['Usuário','E-mail','Plano','Transações','Metas','Cadastro',''].map((h,i) => (
                  <th key={i} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600">Nenhum usuário encontrado.</td></tr>
              )}
              {data.users.map(u => (
                <tr key={u.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-brand-800 border border-brand-700/50 flex items-center justify-center text-xs font-bold text-brand-300 shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{u.name}</p>
                        {u.isAdmin && <span className="text-[10px] text-danger font-semibold">ADMIN</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.plan === 'PRO' ? 'bg-amber-900/60 text-amber-400 border border-amber-700/40' : 'bg-ink-700 text-slate-500 border border-white/6'
                      }`}>
                        {u.plan === 'PRO' && <Crown className="size-3" />}{u.plan}
                      </span>
                      {u.plan === 'PRO' && !u.stripeSubscriptionId && (
                        <span title="Ativado manualmente" className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-white/8">
                          <UserCheck className="size-2.5" /> manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 tabular-nums">{u._count.transactions.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3 text-slate-400 tabular-nums">{u._count.goals}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/users/${u.id}`} className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                      Ver <ArrowUpRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/users?search=${search}&plan=${plan}&page=${page-1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/users?search=${search}&plan=${plan}&page=${page+1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

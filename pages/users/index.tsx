import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { useState } from 'react'
import { Crown, ArrowUpRight, Search, Download, UserCheck, Mail, X, CheckSquare, Square } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type UsersPage, type AdminUser } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const search   = (query.search   as string) ?? ''
  const plan     = (query.plan     as string) ?? ''
  const inactive = (query.inactive as string) ?? ''
  const page     = (query.page     as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ search, plan, inactive, page, pageSize: '20' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/users?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, search, plan, inactive, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

export default function UsersPage({ data, search, plan, inactive, page }: { data: UsersPage; search: string; plan: string; inactive: string; page: number }) {
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [showBulk, setShowBulk]     = useState(false)
  const [bulkSubject, setBulkSubj]  = useState('')
  const [bulkMessage, setBulkMsg]   = useState('')
  const [bulkLoading, setBulkLoad]  = useState(false)
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number } | null>(null)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === data.users.length) setSelected(new Set())
    else setSelected(new Set(data.users.map(u => u.id)))
  }

  async function sendBulk() {
    if (!bulkSubject.trim() || !bulkMessage.trim() || selected.size === 0) return
    setBulkLoad(true)
    setBulkResult(null)
    try {
      const r = await api.bulkEmail([...selected], bulkSubject.trim(), bulkMessage.trim())
      setBulkResult(r)
      setTimeout(() => { setShowBulk(false); setSelected(new Set()); setBulkSubj(''); setBulkMsg(''); setBulkResult(null) }, 3000)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao enviar') }
    finally { setBulkLoad(false) }
  }

  const allSelected = data.users.length > 0 && selected.size === data.users.length

  return (
    <Layout>
      <Head><title>Usuários — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">

        {/* Bulk email modal */}
        {showBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-ink-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Mail className="size-4 text-brand-400" />
                  Email para {selected.size} usuário{selected.size !== 1 ? 's' : ''}
                </p>
                <button onClick={() => setShowBulk(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="size-4" />
                </button>
              </div>
              {bulkResult ? (
                <div className="text-center py-4">
                  <p className="text-sm text-success">✓ {bulkResult.sent} enviados{bulkResult.failed > 0 ? ` · ${bulkResult.failed} falhas` : ''}</p>
                </div>
              ) : (
                <>
                  <input value={bulkSubject} onChange={e => setBulkSubj(e.target.value)} maxLength={200}
                    placeholder="Assunto"
                    className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
                  <textarea value={bulkMessage} onChange={e => setBulkMsg(e.target.value)} rows={5} maxLength={5000}
                    placeholder="Mensagem..."
                    className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-600/60" />
                  <div className="flex gap-2">
                    <button onClick={sendBulk} disabled={bulkLoading || !bulkSubject.trim() || !bulkMessage.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
                      <Mail className="size-3.5" /> {bulkLoading ? 'Enviando...' : `Enviar para ${selected.size}`}
                    </button>
                    <button onClick={() => setShowBulk(false)}
                      className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Usuários</h1>
            <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} cadastros</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={() => setShowBulk(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-brand-700/60 hover:bg-brand-600/60 border border-brand-700/40 text-brand-300 transition-colors">
                <Mail className="size-4" /> Email para {selected.size}
              </button>
            )}
            <button onClick={() => api.exportUsers()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors">
              <Download className="size-4" /> Exportar CSV
            </button>
          </div>
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
          <select name="inactive" defaultValue={inactive}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Qualquer atividade</option>
            <option value="30">Inativos 30d+</option>
            <option value="60">Inativos 60d+</option>
            <option value="90">Inativos 90d+</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(search || plan || inactive) && (
            <Link href="/users" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                <th className="px-4 py-3 w-8">
                  <button onClick={toggleAll} className="text-slate-500 hover:text-slate-300 transition-colors">
                    {allSelected ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4" />}
                  </button>
                </th>
                {['Usuário','E-mail','Plano','Transações','Metas','Cadastro',''].map((h,i) => (
                  <th key={i} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-600">Nenhum usuário encontrado.</td></tr>
              )}
              {data.users.map((u: AdminUser) => (
                <tr key={u.id} className={`border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors ${selected.has(u.id) ? 'bg-brand-900/20' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(u.id)} className="text-slate-500 hover:text-brand-400 transition-colors">
                      {selected.has(u.id) ? <CheckSquare className="size-4 text-brand-400" /> : <Square className="size-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{u._count.transactions.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{u._count.goals}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
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
            {page > 1 && <Link href={`/users?search=${search}&plan=${plan}&inactive=${inactive}&page=${page-1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/users?search=${search}&plan=${plan}&inactive=${inactive}&page=${page+1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

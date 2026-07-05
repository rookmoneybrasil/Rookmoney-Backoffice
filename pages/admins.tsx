import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { ShieldCheck, Shield, UserPlus, Power, Trash2, X } from 'lucide-react'
import { Layout } from '../components/layout'
import { api, type AdminAccount } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const headers = { Cookie: `rook_backoffice=${cookie}` }
    const meRes = await fetch(`${API_URL}/api/v1/admin/me`, { headers })
    if (meRes.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const me = (await meRes.json()).data as { email: string; role: string }
    if (me.role !== 'superadmin') return { redirect: { destination: '/', permanent: false } }

    const res = await fetch(`${API_URL}/api/v1/admin/admins`, { headers })
    const json = await res.json()
    return { props: { admins: json.data.admins, me } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminsPage({ admins, me }: { admins: AdminAccount[]; me: { email: string; role: string } }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api.createAdmin(form)
      router.replace(router.asPath)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'support' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar admin')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(a: AdminAccount) {
    if (!confirm(`${a.active ? 'Desativar' : 'Reativar'} ${a.email}?`)) return
    try { await api.updateAdmin(a.id, { active: !a.active }); router.replace(router.asPath) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro') }
  }

  async function changeRole(a: AdminAccount, role: string) {
    try { await api.updateAdmin(a.id, { role }); router.replace(router.asPath) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro') }
  }

  async function removeAdmin(a: AdminAccount) {
    if (!confirm(`Excluir ${a.email} permanentemente?`)) return
    try { await api.deleteAdmin(a.id); router.replace(router.asPath) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro') }
  }

  return (
    <Layout>
      <Head><title>Admins — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Administradores</h1>
            <p className="text-sm text-slate-500 mt-1">Contas com acesso ao backoffice e seus papéis</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            <UserPlus className="size-4" /> Novo admin
          </button>
        </div>

        {showForm && (
          <form onSubmit={createAdmin} className="bg-ink-800 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Novo administrador</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X className="size-4" /></button>
            </div>
            {error && <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome" required
                className="bg-ink-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required
                className="bg-ink-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Senha (mín. 8)" required minLength={8}
                className="bg-ink-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="bg-ink-700 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none">
                <option value="support">Suporte (leitura + ações seguras)</option>
                <option value="superadmin">Superadmin (acesso total)</option>
              </select>
            </div>
            <button type="submit" disabled={busy}
              className="self-start bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
              {busy ? 'Criando...' : 'Criar admin'}
            </button>
          </form>
        )}

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                {['Nome / Email', 'Papel', 'Status', 'Último acesso', 'Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(a => {
                const isSelf = a.email === me.email
                return (
                  <tr key={a.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-slate-200">{a.name}{isSelf && <span className="text-[10px] text-brand-400 ml-2">(você)</span>}</p>
                      <p className="text-[11px] text-slate-600">{a.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <select value={a.role} onChange={e => changeRole(a, e.target.value)} disabled={isSelf}
                        className="bg-ink-700 border border-white/8 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none disabled:opacity-50">
                        <option value="support">Suporte</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {a.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success"><ShieldCheck className="size-3.5" /> Ativo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Shield className="size-3.5" /> Inativo</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(a.lastLoginAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(a)} disabled={isSelf} title={a.active ? 'Desativar' : 'Reativar'}
                          className="text-slate-500 hover:text-warning disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"><Power className="size-4" /></button>
                        <button onClick={() => removeAdmin(a)} disabled={isSelf} title="Excluir"
                          className="text-slate-500 hover:text-danger disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

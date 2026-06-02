import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { ArrowLeft, Crown, TrendingUp, TrendingDown, Shield, Trash2, Mail, ScrollText } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type UserDetail } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const id = query.id as string
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    if (res.status === 404) return { notFound: true }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const ACTION_LABELS: Record<string, string> = {
  plan_change:   '📋 Plano alterado',
  delete_user:   '🗑️ Conta deletada',
  toggle_admin:  '🛡️ Admin alterado',
  send_email:    '✉️ Email enviado',
}

export default function UserDetailPage({ data }: { data: UserDetail }) {
  const { user, recentTransactions, logs = [] } = data
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]       = useState('')
  const [emailSent, setEmailSent]       = useState(false)
  const [showEmail, setShowEmail]       = useState(false)

  async function setPlan(plan: 'FREE' | 'PRO') {
    setLoading('plan')
    try { await api.setPlan(user.id, plan); router.replace(router.asPath) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function toggleAdmin() {
    setLoading('admin')
    try { await api.setAdmin(user.id, !user.isAdmin); router.replace(router.asPath) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function deleteUser() {
    if (!confirm(`Deletar conta de ${user.name}? Ação irreversível.`)) return
    setLoading('delete')
    try { await api.deleteUser(user.id); router.push('/users') }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function sendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) return
    setLoading('email')
    try {
      await api.sendEmail(user.id, emailSubject, emailBody)
      setEmailSent(true)
      setEmailSubject('')
      setEmailBody('')
      setTimeout(() => { setEmailSent(false); setShowEmail(false) }, 3000)
      router.replace(router.asPath)
    }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao enviar') }
    finally { setLoading(null) }
  }

  return (
    <Layout>
      <Head><title>{user.name} — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8 max-w-3xl">

        <Link href="/users" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 w-fit transition-colors">
          <ArrowLeft className="size-4" /> Voltar para usuários
        </Link>

        {/* Header */}
        <div className="flex items-start gap-5 flex-wrap">
          <div className="size-16 rounded-2xl bg-brand-800 border border-brand-700/50 flex items-center justify-center text-2xl font-bold text-brand-300 shrink-0">
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100">{user.name}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                user.plan === 'PRO' ? 'bg-amber-900/60 text-amber-400 border border-amber-700/40' : 'bg-ink-700 text-slate-500 border border-white/8'
              }`}>
                {user.plan === 'PRO' && <Crown className="size-3" />} {user.plan}
              </span>
              {user.isAdmin && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/30">ADMIN</span>}
            </div>
            <p className="text-slate-400 mt-1">{user.email}</p>
            <p className="text-slate-600 text-xs mt-1">
              Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              {user.whatsappPhone && ` · WhatsApp: ${user.whatsappPhone}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setPlan(user.plan === 'PRO' ? 'FREE' : 'PRO')} disabled={!!loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${user.plan === 'PRO' ? 'bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300' : 'bg-amber-900/60 hover:bg-amber-800/60 border border-amber-700/40 text-amber-300'}`}>
            <Crown className="size-4" />{loading === 'plan' ? '...' : user.plan === 'PRO' ? 'Rebaixar para Free' : 'Promover para Pro'}
          </button>
          <button onClick={() => setShowEmail(v => !v)} disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-800/60 hover:bg-brand-700/60 border border-brand-700/40 text-brand-300 transition-colors disabled:opacity-50">
            <Mail className="size-4" /> Enviar email
          </button>
          <button onClick={toggleAdmin} disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors disabled:opacity-50">
            <Shield className="size-4" />{loading === 'admin' ? '...' : user.isAdmin ? 'Remover admin' : 'Tornar admin'}
          </button>
          <button onClick={deleteUser} disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-900/20 hover:bg-red-900/30 border border-red-700/30 text-red-400 transition-colors disabled:opacity-50">
            <Trash2 className="size-4" />{loading === 'delete' ? '...' : 'Deletar conta'}
          </button>
        </div>

        {/* Email form */}
        {showEmail && (
          <div className="bg-ink-800 border border-brand-700/30 rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Mail className="size-4 text-brand-400" /> Enviar email para {user.name}
            </p>
            {emailSent ? (
              <p className="text-sm text-success">✓ Email enviado com sucesso!</p>
            ) : (
              <>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Assunto" maxLength={200}
                  className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                  placeholder="Mensagem..." rows={4} maxLength={5000}
                  className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-y focus:outline-none focus:border-brand-600/60" />
                <div className="flex gap-2">
                  <button onClick={sendEmail} disabled={loading === 'email' || !emailSubject.trim() || !emailBody.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
                    {loading === 'email' ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button onClick={() => setShowEmail(false)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[{l:'Transações',v:user._count.transactions},{l:'Metas',v:user._count.goals},{l:'Contas',v:user._count.bills},{l:'Orçamentos',v:user._count.budgets},{l:'Pessoas',v:user._count.people}].map(s => (
            <div key={s.l} className="bg-ink-800 border border-white/6 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-slate-100">{s.v.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Stripe */}
        {user.stripeCustomerId && (
          <div className="bg-ink-800 border border-white/6 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stripe</p>
            <p className="text-xs font-mono text-slate-400">Customer: <span className="text-slate-300">{user.stripeCustomerId}</span></p>
          </div>
        )}

        {/* Recent transactions */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-300">Últimas transações ({recentTransactions.length})</h2>
          {recentTransactions.length === 0
            ? <div className="bg-ink-800 border border-white/6 rounded-xl py-8 text-center text-slate-600 text-sm">Nenhuma transação.</div>
            : <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden"><div className="divide-y divide-white/5">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {tx.type === 'INCOME' ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{tx.description ?? '—'}</p>
                    <p className="text-xs text-slate-600">{tx.category.icon} {tx.category.name} · {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${tx.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{fmt(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div></div>
          }
        </div>

        {/* Action logs */}
        {logs.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ScrollText className="size-4" /> Histórico de ações admin
            </h2>
            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-sm">{ACTION_LABELS[log.action] ?? log.action}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 truncate">{log.details}</p>
                    </div>
                    <span className="text-xs text-slate-700 shrink-0">{new Date(log.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

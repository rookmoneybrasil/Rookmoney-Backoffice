import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { ArrowLeft, Crown, TrendingUp, TrendingDown, Shield, Trash2, Mail, ScrollText, Clock, UserCheck, StickyNote, RefreshCw, LogIn, Globe, Smartphone, MapPin, Briefcase, Calendar, MessageSquare, ScanLine, Bell, BellOff, Wallet, Activity, AlertTriangle } from 'lucide-react'
import { InfoIcon } from '../../components/tooltip'
import { ConfirmModal } from '../../components/confirm-modal'
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

const DURATION_LABELS: Record<string, string> = {
  '3m':       '3 meses',
  '6m':       '6 meses',
  '12m':      '12 meses',
  'lifetime': 'Vitalício',
}

const ACTION_LABELS: Record<string, string> = {
  plan_change:              '📋 Plano alterado',
  delete_user:              '🗑️ Conta deletada',
  toggle_admin:             '🛡️ Admin alterado',
  send_email:               '✉️ Email enviado',
  stripe_upgrade:           '💳 Upgrade Stripe',
  stripe_cancel_scheduled:  '⏳ Cancelamento agendado',
  stripe_cancel_reversed:   '✅ Cancelamento revertido',
  stripe_downgrade:         '📉 Downgrade Stripe',
  stripe_payment_failed:    '⚠️ Falha no pagamento',
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`
}

function accountAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 1) return 'Hoje'
  if (days === 1) return '1 dia'
  if (days < 30) return `${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}a ${rem}m` : `${years} ${years === 1 ? 'ano' : 'anos'}`
}

export default function UserDetailPage({ data }: { data: UserDetail }) {
  const { user, recentTransactions, logs = [], financialSummary } = data
  const router = useRouter()
  const [loading, setLoading]           = useState<string | null>(null)
  const [confirm, setConfirm]           = useState<{ title: string; message: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'default'; action: () => Promise<void> } | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]       = useState('')
  const [emailSent, setEmailSent]       = useState(false)
  const [showEmail, setShowEmail]       = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [duration, setDuration]         = useState<'3m' | '6m' | '12m' | 'lifetime'>('3m')
  const [reason, setReason]             = useState('')
  const [notes, setNotes]               = useState(user.adminNotes ?? '')
  const [notesSaved, setNotesSaved]     = useState(false)

  const isManualPro = user.plan === 'PRO' && !user.stripeSubscriptionId

  function calcExpiry(dur: string): string {
    if (dur === 'lifetime') return 'Sem expiração'
    const now = new Date()
    const months = dur === '3m' ? 3 : dur === '6m' ? 6 : 12
    const exp = new Date(now.getFullYear(), now.getMonth() + months, now.getDate())
    return `Expira em ${exp.toLocaleDateString('pt-BR')}`
  }

  async function promoteManualPro() {
    if (!reason.trim()) return
    setLoading('plan')
    try {
      await api.setManualPro(user.id, duration, reason.trim())
      setShowProModal(false)
      setReason('')
      router.replace(router.asPath)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function saveNotes() {
    setLoading('notes')
    try {
      await api.updateAdminNotes(user.id, notes)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  function demoteFree() {
    setConfirm({
      title:        'Rebaixar para Free',
      message:      `Remover o plano PRO de ${user.name}? O usuário perderá acesso imediatamente.`,
      confirmLabel: 'Rebaixar para Free',
      variant:      'warning',
      action: async () => {
        setLoading('plan')
        try { await api.setPlanFree(user.id); router.replace(router.asPath) }
        catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
        finally { setLoading(null) }
      },
    })
  }

  function toggleAdmin() {
    setConfirm(user.isAdmin ? {
      title:        'Remover acesso admin',
      message:      `Remover o acesso de backoffice de ${user.name}? Ele não poderá mais acessar o painel de admin.`,
      confirmLabel: 'Remover admin',
      variant:      'warning',
      action: async () => {
        setLoading('admin')
        try { await api.setAdmin(user.id, false); router.replace(router.asPath) }
        catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
        finally { setLoading(null) }
      },
    } : {
      title:        'Tornar admin',
      message:      `Dar acesso de admin para ${user.name}? Ele poderá acessar e modificar todos os dados no backoffice.`,
      confirmLabel: 'Tornar admin',
      variant:      'warning',
      action: async () => {
        setLoading('admin')
        try { await api.setAdmin(user.id, true); router.replace(router.asPath) }
        catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
        finally { setLoading(null) }
      },
    })
  }

  function deleteUser() {
    setConfirm({
      title:        'Deletar conta',
      message:      `Deletar permanentemente a conta de ${user.name}? Todas as transações, metas e dados serão apagados. Esta ação é irreversível.`,
      confirmLabel: 'Deletar permanentemente',
      variant:      'danger',
      action: async () => {
        setLoading('delete')
        try { await api.deleteUser(user.id); router.push('/users') }
        catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
        finally { setLoading(null) }
      },
    })
  }

  async function impersonate() {
    setLoading('impersonate')
    // Open popup synchronously (before await) — browsers block window.open() called after async ops
    const popup = window.open('about:blank', '_blank')
    try {
      const { url } = await api.impersonate(user.id)
      if (popup) {
        popup.location.href = url
      } else {
        // Popup was blocked — fallback: show link
        alert(`Popup bloqueado. Abra manualmente: ${url}`)
      }
    } catch (e) {
      popup?.close()
      alert(e instanceof Error ? e.message : 'Erro')
    }
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

  const expiryDays = daysUntil(user.proPlanExpiresAt ?? null)

  return (
    <Layout>
      <Head><title>{user.name} — Rook Backoffice</title></Head>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          loading={!!loading}
          onConfirm={async () => { await confirm.action(); setConfirm(null) }}
          onClose={() => setConfirm(null)}
        />
      )}

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
                {isManualPro && <UserCheck className="size-3" />}
              </span>
              {user.isAdmin && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/30">ADMIN</span>}
            </div>
            <p className="text-slate-400 mt-1">{user.email}</p>
            <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-slate-600">
              <span>Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')} ({accountAge(user.createdAt)})</span>
              {user.whatsappPhone && <span>WhatsApp: {user.whatsappPhone}</span>}
            </div>

            {/* PRO Manual info */}
            {isManualPro && (
              <div className="mt-2 flex items-center gap-4 flex-wrap">
                {user.proPlanExpiresAt ? (
                  <span className={`text-xs flex items-center gap-1.5 ${(expiryDays ?? 99) <= 7 ? 'text-danger' : 'text-amber-400'}`}>
                    <Clock className="size-3" />
                    Expira em {new Date(user.proPlanExpiresAt).toLocaleDateString('pt-BR')}
                    {expiryDays !== null && ` (${expiryDays}d)`}
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 flex items-center gap-1.5">
                    <Crown className="size-3" /> PRO vitalício
                  </span>
                )}
                {user.proPlanReason && (
                  <span className="text-xs text-slate-500">Motivo: {user.proPlanReason}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Last active */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-3.5 flex items-start gap-3">
            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
              user.lastActiveAt && (Date.now() - new Date(user.lastActiveAt).getTime()) < 5 * 60_000
                ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <Activity className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Último acesso</p>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">{timeAgo(user.lastActiveAt ?? null)}</p>
              {user.lastActiveAt && (
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {new Date(user.lastActiveAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às {new Date(user.lastActiveAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {/* Login method */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-3.5 flex items-start gap-3">
            <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-800 text-slate-400">
              {user.loginMethod === 'google' ? <Globe className="size-4" /> : <Mail className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Login</p>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                {user.loginMethod === 'google' ? 'Google' : 'Email/Senha'}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                {user.hasOnboarded ? '✓ Onboarding completo' : '⏳ Não fez onboarding'}
              </p>
            </div>
          </div>

          {/* Platform */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-3.5 flex items-start gap-3">
            <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-800 text-slate-400">
              <Smartphone className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Plataforma</p>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                {user.hasMobileApp ? 'Web + Mobile' : 'Apenas Web'}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                {user.currency ?? 'BRL'} · {user.dateFormat ?? 'dd/MM/yyyy'}
              </p>
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-3.5 flex items-start gap-3">
            <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-800 text-slate-400">
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Movimentação total</p>
              {financialSummary ? (
                <>
                  <p className="text-xs text-green-400 mt-1">+{fmt(financialSummary.totalIncome)}</p>
                  <p className="text-xs text-red-400">-{fmt(financialSummary.totalExpense)}</p>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-0.5">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {user.plan === 'PRO' ? (
            <>
              {isManualPro && (
                <button onClick={() => setShowProModal(true)} disabled={!!loading}
                  title="Estende a data de expiração do PRO manual — mantém o motivo original no histórico"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/30 text-amber-400 transition-colors disabled:opacity-50">
                  <RefreshCw className="size-4" /> Prorrogar PRO
                </button>
              )}
              <button onClick={demoteFree} disabled={!!loading}
                title="Remove o acesso PRO imediatamente. O usuário volta para o plano Free."
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors disabled:opacity-50">
                <Crown className="size-4" />{loading === 'plan' ? '...' : 'Rebaixar para Free'}
              </button>
            </>
          ) : (
            <button onClick={() => setShowProModal(true)} disabled={!!loading}
              title="Dá acesso PRO sem cobrança. Você precisa informar a duração e o motivo (fica registrado no log)."
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-900/60 hover:bg-amber-800/60 border border-amber-700/40 text-amber-300 transition-colors disabled:opacity-50">
              <Crown className="size-4" /> Promover para PRO Manual
            </button>
          )}
          <button onClick={() => setShowEmail(v => !v)} disabled={!!loading}
            title="Envia um email diretamente para este usuário via Resend"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-800/60 hover:bg-brand-700/60 border border-brand-700/40 text-brand-300 transition-colors disabled:opacity-50">
            <Mail className="size-4" /> Enviar email
          </button>
          <button onClick={toggleAdmin} disabled={!!loading}
            title={user.isAdmin ? 'Remove o acesso ao backoffice deste usuário' : 'Dá acesso ao backoffice — use com cuidado'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors disabled:opacity-50">
            <Shield className="size-4" />{loading === 'admin' ? '...' : user.isAdmin ? 'Remover admin' : 'Tornar admin'}
          </button>
          <button onClick={impersonate} disabled={!!loading}
            title="Gera um link temporário (5 min) que abre o dashboard logado como este usuário — útil para debugar problemas relatados"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors disabled:opacity-50">
            <LogIn className="size-4" />{loading === 'impersonate' ? '...' : 'Login como usuário'}
          </button>
          <button onClick={deleteUser} disabled={!!loading}
            title="Deleta permanentemente a conta e todos os dados do usuário. Irreversível."
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-900/20 hover:bg-red-900/30 border border-red-700/30 text-red-400 transition-colors disabled:opacity-50">
            <Trash2 className="size-4" />{loading === 'delete' ? '...' : 'Deletar conta'}
          </button>
        </div>

        {/* PRO Manual modal */}
        {showProModal && (
          <div className="bg-ink-800 border border-amber-700/30 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <Crown className="size-4" /> Promover {user.name} para PRO Manual
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(['3m', '6m', '12m', 'lifetime'] as const).map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    duration === d
                      ? 'bg-amber-900/60 text-amber-300 border-amber-700/60'
                      : 'bg-ink-700 text-slate-400 border-white/8 hover:border-amber-700/40 hover:text-amber-400'
                  }`}>
                  {DURATION_LABELS[d]}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="size-3" /> {calcExpiry(duration)}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Motivo <span className="text-danger">*</span></label>
              <textarea
                value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Ex: influencer, parceria, compensação de bug..."
                rows={2} maxLength={300}
                className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-amber-600/60"
              />
              <p className="text-[10px] text-slate-600 text-right">{reason.length}/300</p>
            </div>

            <div className="flex gap-2">
              <button onClick={promoteManualPro}
                disabled={loading === 'plan' || !reason.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50">
                {loading === 'plan' ? 'Salvando...' : `Confirmar PRO ${DURATION_LABELS[duration]}`}
              </button>
              <button onClick={() => { setShowProModal(false); setReason('') }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

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
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {[
            { l: 'Transações',   v: user._count.transactions },
            { l: 'Metas',        v: user._count.goals },
            { l: 'Contas',       v: user._count.bills },
            { l: 'Orçamentos',   v: user._count.budgets },
            { l: 'Pessoas',      v: user._count.people },
            { l: 'Rendas',       v: user._count.incomeSources ?? 0 },
            { l: 'Fixas',        v: user._count.recurringBills ?? 0 },
          ].map(s => (
            <div key={s.l} className="bg-ink-800 border border-white/6 rounded-xl p-3.5 text-center">
              <p className="text-lg font-bold text-slate-100">{s.v.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Profile + Preferences side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profile */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</p>
            <div className="flex flex-col gap-2.5 text-sm">
              {user.city && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="size-3.5 text-slate-600 shrink-0" />
                  <span>{user.city}</span>
                </div>
              )}
              {user.occupation && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Briefcase className="size-3.5 text-slate-600 shrink-0" />
                  <span>{user.occupation}</span>
                </div>
              )}
              {user.birthdate && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="size-3.5 text-slate-600 shrink-0" />
                  <span>{new Date(user.birthdate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {user.bio && (
                <p className="text-xs text-slate-500 italic border-l-2 border-white/10 pl-2.5 mt-1">{user.bio}</p>
              )}
              {!user.city && !user.occupation && !user.birthdate && !user.bio && (
                <p className="text-xs text-slate-700">Nenhuma informação de perfil preenchida.</p>
              )}
            </div>
          </div>

          {/* Preferences & Usage */}
          <div className="bg-ink-800 border border-white/6 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uso de features</p>
            <div className="flex flex-col gap-2.5 text-sm">
              {/* Chat AI */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <MessageSquare className="size-3.5 text-slate-600 shrink-0" />
                  <span>Chat IA</span>
                </div>
                <span className="text-xs font-mono text-slate-300">
                  {(user.chatUsageCount ?? 0) > 0
                    ? `${user.chatUsageCount}× (${user.chatUsageMonth ?? '—'})`
                    : 'Nunca usou'}
                </span>
              </div>
              {/* Scanner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <ScanLine className="size-3.5 text-slate-600 shrink-0" />
                  <span>Scanner</span>
                </div>
                <span className="text-xs font-mono text-slate-300">
                  {(user.scannerUsageCount ?? 0) > 0
                    ? `${user.scannerUsageCount}× (${user.scannerUsageMonth ?? '—'})`
                    : 'Nunca usou'}
                </span>
              </div>
              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  {user.notifBillReminder || user.notifCategoryLimit || user.notifMonthlyEmail
                    ? <Bell className="size-3.5 text-slate-600 shrink-0" />
                    : <BellOff className="size-3.5 text-slate-600 shrink-0" />}
                  <span>Notificações</span>
                </div>
                <div className="flex gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.notifBillReminder ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-600'}`}>Contas</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.notifCategoryLimit ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-600'}`}>Limite</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.notifMonthlyEmail ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-600'}`}>Mensal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe */}
        {user.stripeCustomerId && (
          <div className={`bg-ink-800 border rounded-xl p-4 ${user.stripeCancelAtPeriodEnd ? 'border-danger/30' : 'border-white/6'}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stripe</p>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-mono text-slate-400">Customer: <span className="text-slate-300">{user.stripeCustomerId}</span></p>
              {user.stripeSubscriptionId && (
                <p className="text-xs font-mono text-slate-400">Subscription: <span className="text-slate-300">{user.stripeSubscriptionId}</span></p>
              )}
              {user.stripeCancelAtPeriodEnd && (
                <div className="flex items-center gap-2 mt-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="size-4 text-danger shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-danger">Cancelamento agendado</p>
                    {user.stripeCurrentPeriodEnd && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PRO até {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
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

        {/* Admin notes */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <StickyNote className="size-4" /> Notas internas
            <span className="text-[10px] font-normal text-slate-600">visível só no backoffice</span>
          </h2>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-4 flex flex-col gap-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1000}
              placeholder="Ex: influencer do TikTok, veio por indicação da Luana, reportou bug X..."
              className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-600/60" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-700">{notes.length}/1000</span>
              <div className="flex items-center gap-2">
                {notesSaved && <span className="text-xs text-success">✓ Salvo</span>}
                <button onClick={saveNotes} disabled={loading === 'notes'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-700/60 hover:bg-brand-600/60 border border-brand-600/30 text-brand-300 transition-colors disabled:opacity-50">
                  {loading === 'notes' ? 'Salvando...' : 'Salvar nota'}
                </button>
              </div>
            </div>
          </div>
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

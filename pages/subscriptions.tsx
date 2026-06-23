import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Crown, AlertTriangle, Clock, Sparkles } from 'lucide-react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
import type { SubscriptionsData, SubscriptionEntry } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/subscriptions`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function RenewalBadge({ date, cancel }: { date: string | null; cancel: boolean }) {
  const days = daysUntil(date)
  if (!date || days === null) return <span className="text-xs text-slate-600">—</span>
  const label = new Date(date).toLocaleDateString('pt-BR')
  if (cancel) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-danger">{label}</span>
        <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded-full font-semibold">Cancela</span>
      </div>
    )
  }
  if (days <= 7) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-warning">{label}</span>
        <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded-full font-semibold">{days}d</span>
      </div>
    )
  }
  return <span className="text-xs text-slate-400">{label}</span>
}

function ManualExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-amber-500/60 flex items-center gap-1"><Crown className="size-3" /> Vitalício</span>
  const days = daysUntil(date)
  const label = new Date(date).toLocaleDateString('pt-BR')
  if (days === null) return null
  if (days < 0)  return <span className="text-xs text-danger">Expirado</span>
  if (days <= 7) {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="size-3 text-danger" />
        <span className="text-xs font-medium text-danger">{label}</span>
        <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 px-1.5 py-0.5 rounded-full font-semibold">{days}d</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="size-3 text-slate-500" />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

export default function SubscriptionsPage({ data }: { data: SubscriptionsData }) {
  const subs = data.subscriptions as SubscriptionEntry[]
  const proCount          = subs.filter(s => s.plan === 'PRO').length
  const proPlusCount      = subs.filter(s => s.plan === 'PRO_PLUS').length
  const withStripe        = subs.filter(s => s.hasStripe).length
  const manualPro         = subs.filter(s => !s.hasStripe).length
  const cancelling        = subs.filter(s => s.cancelAtPeriodEnd).length
  const renewingSoon      = subs.filter(s => { const d = daysUntil(s.renewalDate); return d !== null && d <= 7 && !s.cancelAtPeriodEnd }).length
  const manualExpiringSoon = subs.filter(s => !s.hasStripe && s.proPlanExpiresAt !== null && (daysUntil(s.proPlanExpiresAt) ?? 99) <= 7).length

  return (
    <Layout>
      <Head><title>Assinaturas PRO e PRO+ — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Assinaturas PRO e PRO+</h1>
          <p className="text-sm text-slate-500 mt-1">{data.total} usuários em planos pagos ({proCount} PRO, {proPlusCount} PRO+)</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Pagos',   value: data.total,     color: 'text-amber-400',               tip: 'Todos os usuários PRO + PRO+ ativos agora (Stripe + Manual).' },
            { label: 'PRO',           value: proCount,       color: 'text-blue-400',                tip: 'Usuários no plano PRO (R$19,90/mês).' },
            { label: 'PRO+',          value: proPlusCount,   color: 'text-amber-400',               tip: 'Usuários no plano PRO+ (R$34,90/mês).' },
            { label: 'Com Stripe',    value: withStripe,     color: 'text-brand-300',               tip: 'Assinatura paga por cartão via Stripe. Renova automaticamente.' },
            { label: 'Renovam em 7d', value: renewingSoon,   color: 'text-warning',                 tip: 'Assinaturas Stripe que renovam (cobram o cartão) nos próximos 7 dias.' },
            { label: 'Cancelando',    value: cancelling,     color: cancelling > 0 ? 'text-danger' : 'text-slate-400', tip: 'Usuário cancelou — ainda tem acesso até o fim do período pago, mas não vai renovar.' },
          ].map(({ label, value, color, tip }) => (
            <div key={label} className="bg-ink-800 border border-white/6 rounded-2xl p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                <InfoIcon text={tip} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Avisos */}
        {cancelling > 0 && (
          <div className="flex items-center gap-3 bg-danger/10 border border-danger/25 rounded-xl px-4 py-3">
            <AlertTriangle className="size-4 text-danger shrink-0" />
            <p className="text-sm text-danger">
              <span className="font-semibold">{cancelling} assinatura{cancelling > 1 ? 's' : ''}</span> marcada{cancelling > 1 ? 's' : ''} para cancelar no fim do período.
            </p>
          </div>
        )}
        {manualExpiringSoon > 0 && (
          <div className="flex items-center gap-3 bg-warning/10 border border-warning/25 rounded-xl px-4 py-3">
            <Clock className="size-4 text-warning shrink-0" />
            <p className="text-sm text-warning">
              <span className="font-semibold">{manualExpiringSoon} PRO manual</span> expira nos próximos 7 dias.
            </p>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                {[
                { h: 'Usuário',                tip: '' },
                { h: 'Plano',                  tip: 'PRO (R$19,90/mês) ou PRO+ (R$34,90/mês)' },
                { h: 'Cadastro',               tip: 'Data em que o usuário criou a conta no app' },
                { h: 'Renovação / Expiração',  tip: 'Stripe: data da próxima cobrança. Manual: data em que o acesso expira.' },
                { h: 'Fonte',                  tip: 'Como o plano foi ativado: Stripe (pagamento) ou Manual (backoffice)' },
                { h: 'Motivo',                 tip: 'Motivo registrado pelo admin ao ativar plano manual' },
                { h: '', tip: '' },
              ].map(({ h, tip }, i) => (
                <th key={i} className="text-left text-xs text-slate-500 font-medium px-5 py-3">
                  {h && <span className="flex items-center gap-1.5">{h}{tip && <InfoIcon text={tip} />}</span>}
                </th>
              ))}
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600">Nenhum assinante.</td></tr>
              )}
              {subs.map(s => {
                const isPlus = s.plan === 'PRO_PLUS'
                return (
                <tr key={s.id} className={`border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors ${s.cancelAtPeriodEnd ? 'bg-danger/5' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${isPlus ? 'bg-amber-900/50 border-amber-700/30 text-amber-300' : 'bg-blue-900/50 border-blue-700/30 text-blue-300'}`}>
                        {s.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200 flex items-center gap-1.5">
                          {s.name}
                          {isPlus ? <Sparkles className="size-3 text-amber-400" /> : <Crown className="size-3 text-blue-400" />}
                        </p>
                        <p className="text-[10px] text-slate-600">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {isPlus
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/30 inline-flex items-center gap-1"><Sparkles className="size-3" />PRO+</span>
                      : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/30 inline-flex items-center gap-1"><Crown className="size-3" />PRO</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3">
                    {s.hasStripe
                      ? <RenewalBadge date={s.renewalDate} cancel={s.cancelAtPeriodEnd} />
                      : <ManualExpiryBadge date={s.proPlanExpiresAt ?? null} />
                    }
                  </td>
                  <td className="px-5 py-3">
                    {s.hasStripe
                      ? <span className="text-[10px] font-mono text-slate-600">{s.stripeSubId?.slice(0, 14)}…</span>
                      : <span className="text-xs text-amber-500/70 flex items-center gap-1"><Crown className="size-3" /> Manual</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {s.proPlanReason
                      ? <span className="text-xs text-slate-500 max-w-[160px] truncate block" title={s.proPlanReason}>{s.proPlanReason}</span>
                      : <span className="text-xs text-slate-700">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/users/${s.id}`} className="text-xs text-brand-400 hover:text-brand-300">
                      Ver →
                    </Link>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

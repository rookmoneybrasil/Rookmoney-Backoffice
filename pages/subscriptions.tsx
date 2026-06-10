import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Crown, AlertTriangle } from 'lucide-react'
import { Layout } from '../components/layout'
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
  if (!date || days === null) {
    return <span className="text-xs text-slate-600">—</span>
  }
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

export default function SubscriptionsPage({ data }: { data: SubscriptionsData }) {
  const subs = data.subscriptions as SubscriptionEntry[]
  const withStripe  = subs.filter(s => s.hasStripe).length
  const cancelling  = subs.filter(s => s.cancelAtPeriodEnd).length
  const renewingSoon = subs.filter(s => {
    const d = daysUntil(s.renewalDate)
    return d !== null && d <= 7 && !s.cancelAtPeriodEnd
  }).length

  return (
    <Layout>
      <Head><title>Assinaturas PRO — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Assinaturas PRO</h1>
          <p className="text-sm text-slate-500 mt-1">{data.total} usuários no plano PRO</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total PRO',       value: data.total,     color: 'text-amber-400' },
            { label: 'Com Stripe',      value: withStripe,     color: 'text-brand-300' },
            { label: 'Renovam em 7d',   value: renewingSoon,   color: 'text-warning' },
            { label: 'Cancelando',      value: cancelling,     color: cancelling > 0 ? 'text-danger' : 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-ink-800 border border-white/6 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Aviso de cancelamentos próximos */}
        {cancelling > 0 && (
          <div className="flex items-center gap-3 bg-danger/10 border border-danger/25 rounded-xl px-4 py-3">
            <AlertTriangle className="size-4 text-danger shrink-0" />
            <p className="text-sm text-danger">
              <span className="font-semibold">{cancelling} assinatura{cancelling > 1 ? 's' : ''}</span> marcada{cancelling > 1 ? 's' : ''} para cancelar no fim do período.
            </p>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                {['Usuário', 'Cadastro', 'Renovação', 'Stripe', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600">Nenhum usuário PRO.</td></tr>
              )}
              {subs.map(s => (
                <tr key={s.id} className={`border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors ${s.cancelAtPeriodEnd ? 'bg-danger/5' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-amber-900/50 border border-amber-700/30 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                        {s.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200 flex items-center gap-1.5">
                          {s.name}
                          <Crown className="size-3 text-amber-400" />
                        </p>
                        <p className="text-[10px] text-slate-600">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3">
                    <RenewalBadge date={s.renewalDate} cancel={s.cancelAtPeriodEnd} />
                  </td>
                  <td className="px-5 py-3">
                    {s.stripeSubId
                      ? <span className="text-[10px] font-mono text-slate-600">{s.stripeSubId.slice(0, 14)}…</span>
                      : <span className="text-xs text-slate-700">Manual</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/users/${s.id}`} className="text-xs text-brand-400 hover:text-brand-300">
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

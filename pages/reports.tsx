import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Users, DollarSign, UserMinus, BarChart2 } from 'lucide-react'
import { Layout } from '../components/layout'
import type { ReportsData } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/reports`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function shortMonth(iso: string) {
  const [y, m] = iso.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const mIdx = parseInt(m) - 1
  return mIdx === 0 ? `Jan/${y.slice(2)}` : months[mIdx]
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ series, labelEvery = 1 }: {
  series: { label: string; value: number; color: string }[][]
  labelEvery?: number
}) {
  const allValues = series.flat().map(s => s.value)
  const max = Math.max(...allValues, 1)
  const W = 600; const H = 70; const LABEL_H = 14
  const n = series.length
  const groupW = W / n
  const barCount = series[0]?.length ?? 1
  const barW = (groupW * 0.7) / barCount
  const barGap = barW * 0.15

  return (
    <div style={{ aspectRatio: `${W} / ${H + LABEL_H}` }}>
      <svg viewBox={`0 0 ${W} ${H + LABEL_H}`} className="w-full h-full" preserveAspectRatio="none">
        {series.map((group, gi) => {
          const gx = gi * groupW + groupW * 0.15
          return group.map((bar, bi) => {
            const h = Math.max(0.5, (bar.value / max) * H)
            const x = gx + bi * (barW + barGap)
            return (
              <g key={`${gi}-${bi}`}>
                <rect x={x} y={H - h} width={barW} height={h} fill={bar.color} rx="1" opacity={bar.value === 0 ? 0.15 : 1} />
                <title>{bar.label}: {bar.value}</title>
              </g>
            )
          }).concat(
            gi % labelEvery === 0 ? [
              <text key={`lbl-${gi}`} x={gx + (barW * barCount + barGap * (barCount - 1)) / 2} y={H + 10}
                textAnchor="middle" fontSize="13" fill="#475569">
                {series[gi][0].label.slice(0, 3)}
              </text>
            ] : []
          )
        })}
      </svg>
    </div>
  )
}

type Tab = 'revenue' | 'acquisition' | 'churn' | 'usage'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'revenue',     label: 'Receita',    icon: DollarSign },
  { id: 'acquisition', label: 'Aquisição',  icon: Users },
  { id: 'churn',       label: 'Churn',      icon: UserMinus },
  { id: 'usage',       label: 'Uso',        icon: BarChart2 },
]

export default function ReportsPage({ data }: { data: ReportsData }) {
  const [tab, setTab] = useState<Tab>('revenue')

  // ── Revenue summaries ──────────────────────────────────────────────────────
  const totalMrr      = data.revenue.at(-1)?.mrr ?? 0
  const totalStripe   = data.revenue.reduce((a, r) => a + r.stripeNew, 0)
  const totalManual   = data.revenue.reduce((a, r) => a + r.manualNew, 0)

  // ── Acquisition summaries ─────────────────────────────────────────────────
  const totalSignups  = data.acquisition.reduce((a, r) => a + r.signups, 0)
  const totalNewPro   = data.acquisition.reduce((a, r) => a + r.newPro, 0)
  const avgConversion = totalSignups > 0 ? Math.round((totalNewPro / totalSignups) * 100) : 0

  // ── Churn summaries ───────────────────────────────────────────────────────
  const totalChurn    = data.churn.reduce((a, r) => a + r.churn, 0)
  const maxChurn      = Math.max(...data.churn.map(r => r.churn), 1)

  return (
    <Layout>
      <Head><title>Relatórios — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Últimos 12 meses</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-800 border border-white/6 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-brand-800/60 text-brand-300 border border-brand-700/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── RECEITA ──────────────────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">MRR Atual</p>
                <p className="text-2xl font-bold text-success">{fmt(totalMrr)}</p>
                <p className="text-xs text-slate-600 mt-1">receita mensal recorrente</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Novos Stripe (12m)</p>
                <p className="text-2xl font-bold text-brand-300">{totalStripe}</p>
                <p className="text-xs text-slate-600 mt-1">conversões via pagamento</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Novos Manual (12m)</p>
                <p className="text-2xl font-bold text-amber-400">{totalManual}</p>
                <p className="text-xs text-slate-600 mt-1">ativados pelo backoffice</p>
              </div>
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold text-slate-300 flex-1">Novos PRO por mês</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-400 inline-block" /> Stripe</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400 inline-block" /> Manual</span>
                </div>
              </div>
              <BarChart
                series={data.revenue.map(r => [
                  { label: shortMonth(r.month), value: r.stripeNew, color: '#60A5FA' },
                  { label: shortMonth(r.month), value: r.manualNew, color: '#F59E0B' },
                ])}
                labelEvery={1}
              />
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Mês','Novos Stripe','Novos Manual','MRR Stripe','MRR Manual','MRR Total'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.revenue].reverse().map(r => (
                    <tr key={r.month} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                      <td className="px-5 py-2.5 text-xs text-slate-300">{shortMonth(r.month)}</td>
                      <td className="px-5 py-2.5 text-xs text-brand-300">{r.stripeNew}</td>
                      <td className="px-5 py-2.5 text-xs text-amber-400">{r.manualNew}</td>
                      <td className="px-5 py-2.5 text-xs text-success">{fmt(r.mrrStripe)}</td>
                      <td className="px-5 py-2.5 text-xs text-amber-500/80">{fmt(r.mrrManual)}</td>
                      <td className="px-5 py-2.5 text-xs font-semibold text-success">{fmt(r.mrr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AQUISIÇÃO ─────────────────────────────────────────────────────────── */}
        {tab === 'acquisition' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cadastros (12m)</p>
                <p className="text-2xl font-bold text-slate-100">{totalSignups.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conversões PRO (12m)</p>
                <p className="text-2xl font-bold text-amber-400">{totalNewPro.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-brand-300">{avgConversion}%</p>
                <p className="text-xs text-slate-600 mt-1">Free → PRO (média 12m)</p>
              </div>
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold text-slate-300 flex-1">Cadastros vs Conversões PRO</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400 inline-block" /> Cadastros</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400 inline-block" /> PRO</span>
                </div>
              </div>
              <BarChart
                series={data.acquisition.map(r => [
                  { label: shortMonth(r.month), value: r.signups, color: '#94A3B8' },
                  { label: shortMonth(r.month), value: r.newPro,  color: '#F59E0B' },
                ])}
                labelEvery={1}
              />
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Mês','Cadastros','Novos PRO','Conversão'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.acquisition].reverse().map(r => (
                    <tr key={r.month} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                      <td className="px-5 py-2.5 text-xs text-slate-300">{shortMonth(r.month)}</td>
                      <td className="px-5 py-2.5 text-xs text-slate-300">{r.signups}</td>
                      <td className="px-5 py-2.5 text-xs text-amber-400">{r.newPro}</td>
                      <td className="px-5 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.conversionRate >= 20 ? 'bg-success/10 text-success' :
                          r.conversionRate >= 10 ? 'bg-warning/10 text-warning' :
                          'bg-ink-700 text-slate-500'
                        }`}>{r.conversionRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CHURN ────────────────────────────────────────────────────────────── */}
        {tab === 'churn' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Churn (12m)</p>
                <p className={`text-2xl font-bold ${totalChurn > 0 ? 'text-danger' : 'text-success'}`}>{totalChurn}</p>
                <p className="text-xs text-slate-600 mt-1">downgrade PRO → Free</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pior Mês</p>
                {(() => {
                  const worst = data.churn.reduce((a, b) => b.churn > a.churn ? b : a, data.churn[0])
                  return (
                    <>
                      <p className="text-2xl font-bold text-danger">{worst?.churn ?? 0}</p>
                      <p className="text-xs text-slate-600 mt-1">{worst ? shortMonth(worst.month) : '—'}</p>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-slate-300">Churn mensal (downgrade PRO → Free)</h2>
              <BarChart
                series={data.churn.map(r => [{ label: shortMonth(r.month), value: r.churn, color: '#EF4444' }])}
                labelEvery={1}
              />
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Mês','Churn','Severidade'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.churn].reverse().map(r => (
                    <tr key={r.month} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                      <td className="px-5 py-2.5 text-xs text-slate-300">{shortMonth(r.month)}</td>
                      <td className="px-5 py-2.5 text-xs font-semibold text-danger">{r.churn}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-ink-700 rounded-full h-1.5 max-w-[120px]">
                            <div className="h-full bg-danger rounded-full" style={{ width: `${(r.churn / maxChurn) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USO ──────────────────────────────────────────────────────────────── */}
        {tab === 'usage' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Média de Transações</p>
                <p className="text-2xl font-bold text-brand-300">{data.usage.avgTx}</p>
                <p className="text-xs text-slate-600 mt-1">por usuário (all-time)</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Média de Metas</p>
                <p className="text-2xl font-bold text-amber-400">{data.usage.avgGoals}</p>
                <p className="text-xs text-slate-600 mt-1">por usuário (all-time)</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-slate-300">Top 10 usuários mais ativos</h2>
              <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {['#','Usuário','Transações',''].map((h, i) => (
                        <th key={i} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.usage.topUsers.length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600">Sem dados.</td></tr>
                    )}
                    {data.usage.topUsers.map((u, i) => {
                      const maxTx = data.usage.topUsers[0]?.txCount ?? 1
                      return (
                        <tr key={u.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                          <td className="px-5 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-slate-200">{u.name}</p>
                            <p className="text-[10px] text-slate-600">{u.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-ink-700 rounded-full h-1.5">
                                <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(u.txCount / maxTx) * 100}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-brand-300 tabular-nums">{u.txCount.toLocaleString('pt-BR')}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Link href={`/users/${u.id}`} className="text-xs text-brand-400 hover:text-brand-300">Ver →</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

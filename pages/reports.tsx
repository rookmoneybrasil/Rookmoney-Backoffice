import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { useState } from 'react'
import { Users, DollarSign, UserMinus, BarChart2, Download, Crown, Sparkles } from 'lucide-react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
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

function downloadCsv(filename: string, rows: (string | number)[][], headers: string[]) {
  const lines = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob  = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type Tab = 'revenue' | 'acquisition' | 'churn' | 'usage' | 'cohort' | 'funnel'

const TABS: { id: Tab; label: string; icon: React.ElementType; tip: string }[] = [
  { id: 'revenue',     label: 'Receita',    icon: DollarSign, tip: 'MRR, novos PRO Stripe vs Manual — evolução mensal nos últimos 12 meses' },
  { id: 'acquisition', label: 'Aquisição',  icon: Users,      tip: 'Cadastros por mês e taxa de conversão Free → PRO' },
  { id: 'churn',       label: 'Churn',      icon: UserMinus,  tip: 'Quantos usuários saíram de planos pagos PRO/PRO+ (downgrade ou cancelamento) por mês' },
  { id: 'usage',       label: 'Uso',        icon: BarChart2,  tip: 'Engajamento: médias de transações e metas, + top 10 usuários mais ativos' },
  { id: 'cohort',      label: 'Cohort',     icon: Users,      tip: 'Retenção por coorte: de quem se cadastrou em cada mês, quantos ainda estão ativos?' },
  { id: 'funnel',      label: 'Funil',      icon: BarChart2,  tip: 'Funil de ativação: Cadastro → Onboarding → Primeira transação → Primeira meta' },
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

        {/* Tabs + export */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-ink-800 border border-white/6 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon, tip }) => (
            <button key={id} onClick={() => setTab(id)}
              title={tip}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-brand-800/60 text-brand-300 border border-brand-700/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <button onClick={() => {
          if (tab === 'revenue')     downloadCsv('receita.csv', data.revenue.map(r => [shortMonth(r.month), r.stripeNew, r.manualNew, fmt(r.mrrStripe), fmt(r.mrrManual), fmt(r.mrr)]), ['Mês','Novos Stripe','Novos Manual','MRR Stripe','MRR Manual','MRR Total'])
          else if (tab === 'acquisition') downloadCsv('aquisicao.csv', data.acquisition.map(r => [shortMonth(r.month), r.signups, r.newPro, r.conversionRate + '%']), ['Mês','Cadastros','Novos PRO','Conversão'])
          else if (tab === 'churn')  downloadCsv('churn.csv', data.churn.map(r => [shortMonth(r.month), r.churn]), ['Mês','Churn'])
          else if (tab === 'cohort') downloadCsv('cohort.csv', (data.cohort ?? []).map(r => [shortMonth(r.cohortMonth), r.total, r.active30d, r.retentionRate + '%']), ['Mês de Cadastro','Usuários','Ativos 30d','Retenção'])
          else if (tab === 'funnel') downloadCsv('funil.csv', [['Total','Onboarded','Com Transações','Com Metas'],[data.funnel?.totalUsers,data.funnel?.onboarded,data.funnel?.hasTransactions,data.funnel?.hasGoals].map(String)], ['Etapa','Qtd'])
          else downloadCsv('uso.csv', data.usage.topUsers.map((u, i) => [i+1, u.name, u.email, u.txCount]), ['#','Nome','Email','Transações'])
        }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-ink-700 hover:bg-ink-600 border border-white/8 text-slate-300 transition-colors">
          <Download className="size-4" /> Exportar CSV
        </button>
        </div>

        {/* ── RECEITA ──────────────────────────────────────────────────────────── */}
        {tab === 'revenue' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR Atual</p>
                  <InfoIcon text="Receita Mensal Recorrente do último mês: PRO × R$19,90 + PRO+ × R$34,90" />
                </div>
                <p className="text-2xl font-bold text-success">{fmt(totalMrr)}</p>
                <p className="text-xs text-slate-600 mt-1">receita mensal recorrente</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Novos Stripe (12m)</p>
                  <InfoIcon text="Total de upgrades Free → PRO feitos via Stripe (pagamento com cartão) nos últimos 12 meses" />
                </div>
                <p className="text-2xl font-bold text-brand-300">{totalStripe}</p>
                <p className="text-xs text-slate-600 mt-1">conversões via pagamento</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Novos Manual (12m)</p>
                  <InfoIcon text="Total de upgrades ativados pelo backoffice sem cobrança (gratuidades, parcerias, testes)" />
                </div>
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
                <p className="text-xs text-slate-600 mt-1">downgrade PRO/PRO+ → Free</p>
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
              <h2 className="text-sm font-semibold text-slate-300">Churn mensal (downgrade PRO/PRO+ → Free)</h2>
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

        {/* ── COHORT ───────────────────────────────────────────────────────────── */}
        {tab === 'cohort' && (
          <div className="flex flex-col gap-6">
            <div className="bg-ink-800 border border-amber-700/20 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-400 text-lg shrink-0">ℹ️</span>
              <p className="text-xs text-slate-400">
                Mostra, de cada coorte de cadastro, quantos usuários ainda estavam ativos nos <strong className="text-slate-300">últimos 30 dias</strong>.
                Um usuário é considerado ativo se tiver <code className="text-brand-300 bg-ink-700 px-1 rounded">lastActiveAt</code> recente.
              </p>
            </div>

            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Mês de Cadastro','Usuários no mês','Ativos (30d)','Retenção','Barra'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.cohort ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-600">Sem dados.</td></tr>
                  )}
                  {[...(data.cohort ?? [])].reverse().map(r => (
                    <tr key={r.cohortMonth} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                      <td className="px-5 py-3 text-xs text-slate-300">{shortMonth(r.cohortMonth)}</td>
                      <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{r.total.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-3 text-xs text-brand-300 tabular-nums font-semibold">{r.active30d.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.retentionRate >= 50 ? 'bg-success/10 text-success' :
                          r.retentionRate >= 25 ? 'bg-warning/10 text-warning' :
                          'bg-ink-700 text-slate-500'
                        }`}>{r.retentionRate}%</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-32 bg-ink-700 rounded-full h-1.5">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${r.retentionRate}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FUNIL ────────────────────────────────────────────────────────────── */}
        {tab === 'funnel' && data.funnel && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Taxa de Onboarding</p>
                <p className="text-2xl font-bold text-brand-300">
                  {data.funnel.totalUsers > 0 ? Math.round((data.funnel.onboarded / data.funnel.totalUsers) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-600 mt-1">{data.funnel.onboarded.toLocaleString('pt-BR')} de {data.funnel.totalUsers.toLocaleString('pt-BR')} completaram o onboarding</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Usuários Engajados</p>
                <p className="text-2xl font-bold text-amber-400">
                  {data.funnel.totalUsers > 0 ? Math.round((data.funnel.hasTransactions / data.funnel.totalUsers) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-600 mt-1">criaram ao menos 1 transação</p>
              </div>
            </div>

            {/* Funnel visualization */}
            <div className="bg-ink-800 border border-white/6 rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-slate-300">Funil de ativação</h2>
              {[
                { label: 'Cadastrados',        count: data.funnel.totalUsers,      color: 'bg-slate-500',   pct: 100 },
                { label: 'Onboarding completo', count: data.funnel.onboarded,       color: 'bg-brand-500',   pct: data.funnel.totalUsers > 0 ? Math.round((data.funnel.onboarded / data.funnel.totalUsers) * 100) : 0 },
                { label: 'Tem transações',      count: data.funnel.hasTransactions, color: 'bg-amber-500',   pct: data.funnel.totalUsers > 0 ? Math.round((data.funnel.hasTransactions / data.funnel.totalUsers) * 100) : 0 },
                { label: 'Tem metas',           count: data.funnel.hasGoals,        color: 'bg-success',     pct: data.funnel.totalUsers > 0 ? Math.round((data.funnel.hasGoals / data.funnel.totalUsers) * 100) : 0 },
              ].map(step => (
                <div key={step.label} className="flex items-center gap-4">
                  <div className="w-36 text-xs text-slate-400 shrink-0">{step.label}</div>
                  <div className="flex-1 bg-ink-700 rounded-full h-6 overflow-hidden">
                    <div className={`h-full ${step.color} flex items-center px-3 transition-all`} style={{ width: `${Math.max(step.pct, 2)}%` }}>
                      <span className="text-xs font-semibold text-white/90 whitespace-nowrap">{step.pct}%</span>
                    </div>
                  </div>
                  <div className="w-24 text-xs text-slate-400 text-right tabular-nums shrink-0">
                    {step.count.toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
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

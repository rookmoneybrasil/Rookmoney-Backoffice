import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
import type { ChatUsageData } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/chat-usage`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const fmtUsd = (n: number) => `US$ ${n.toFixed(2)}`

function shortDay(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── Bar chart (mensagens/dia, web vs whatsapp) ───────────────────────────────

function BarChart({ series, labelEvery = 5 }: {
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
                {series[gi][0].label}
              </text>
            ] : []
          )
        })}
      </svg>
    </div>
  )
}

export default function RookinhoUsagePage({ data }: { data: ChatUsageData }) {
  const maxMessages = Math.max(...data.topUsers.map(u => u.messages), 1)

  return (
    <Layout>
      <Head><title>Rookinho IA — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Uso do Rookinho IA</h1>
          <p className="text-sm text-slate-500 mt-1">Custo estimado (Claude Sonnet 5) — mês corrente e últimos 30 dias</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mensagens (mês)</p>
            <p className="text-2xl font-bold text-slate-100">{data.month.totalMessages.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo (mês)</p>
              <InfoIcon text="Estimado a partir de input/output/cache tokens de cada chamada, com o preço por MTok vigente do Sonnet 5" />
            </div>
            <p className="text-2xl font-bold text-success">{fmtUsd(data.month.totalCostUsd)}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Custo médio/msg</p>
            <p className="text-2xl font-bold text-brand-300">{fmtUsd(data.month.avgCostPerMessage)}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projeção (mês)</p>
              <InfoIcon text="Custo do mês corrente extrapolado linearmente pelos dias já passados" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{fmtUsd(data.month.projectedCostUsd)}</p>
          </div>
        </div>

        <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-300 flex-1">Mensagens por dia (30 dias)</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-400 inline-block" /> Web</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400 inline-block" /> WhatsApp</span>
            </div>
          </div>
          <BarChart
            series={data.daily.map(d => [
              { label: shortDay(d.date), value: d.web,      color: '#60A5FA' },
              { label: shortDay(d.date), value: d.whatsapp, color: '#34D399' },
            ])}
            labelEvery={5}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-300">Top 20 usuários por custo (30 dias)</h2>
          <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['#', 'Usuário', 'Plano', 'Mensagens', 'Custo', ''].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topUsers.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600">Sem dados.</td></tr>
                )}
                {data.topUsers.map((u, i) => (
                  <tr key={u.userId} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40">
                    <td className="px-5 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-slate-600">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.plan === 'PRO_PLUS' ? 'bg-brand-800/60 text-brand-300' :
                        u.plan === 'PRO' ? 'bg-amber-800/30 text-amber-400' :
                        'bg-ink-700 text-slate-500'
                      }`}>{u.plan}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-ink-700 rounded-full h-1.5">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(u.messages / maxMessages) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-brand-300 tabular-nums">{u.messages.toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-success tabular-nums">{fmtUsd(u.costUsd)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/users/${u.userId}`} className="text-xs text-brand-400 hover:text-brand-300">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

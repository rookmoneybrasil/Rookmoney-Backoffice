import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Bug, Lightbulb, Ticket, TrendingUp, TrendingDown, ArrowUpRight, UserCheck } from 'lucide-react'
import { Layout } from '../components/layout'
import type { AdminStats, GrowthData, MrrHistory } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const headers = { Cookie: `rook_backoffice=${cookie}` }
  try {
    const [statsRes, growthRes, mrrRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/admin/stats`,       { headers }),
      fetch(`${API_URL}/api/v1/admin/growth`,       { headers }),
      fetch(`${API_URL}/api/v1/admin/mrr-history`,  { headers }),
    ])
    if (statsRes.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const [statsJson, growthJson, mrrJson] = await Promise.all([
      statsRes.json(), growthRes.json(), mrrRes.json(),
    ])
    return { props: { stats: statsJson.data, growth: growthJson.data, mrr: mrrJson.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function KPI({ label, value, sub, color = 'text-white', badge }: { label: string; value: string; sub?: string; color?: string; badge?: React.ReactNode }) {
  return (
    <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        {badge}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data, color, labelEvery = 1 }: {
  data: { label: string; value: number }[]
  color: string
  labelEvery?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100
  const H = 60
  const n = data.length
  const barW = (W / n) * 0.7
  const gap  = W / n

  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max(0.5, (d.value / max) * H)
        const x = i * gap + gap * 0.15
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} fill={color} rx="0.5" opacity={d.value === 0 ? 0.15 : 1} />
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H + 9} textAnchor="middle" fontSize="3.5" fill="#475569">
                {d.label}
              </text>
            )}
            <title>{d.label}: {d.value}</title>
          </g>
        )
      })}
    </svg>
  )
}

const FEEDBACK_ICONS: Record<string, React.ReactNode> = {
  bug:        <Bug        className="size-3 text-danger" />,
  suggestion: <Lightbulb className="size-3 text-amber-400" />,
  ticket:     <Ticket     className="size-3 text-brand-400" />,
}

const LOG_LABELS: Record<string, string> = {
  plan_change:  '📋',
  delete_user:  '🗑️',
  toggle_admin: '🛡️',
  send_email:   '✉️',
}

function shortMonth(iso: string) {
  const [y, m] = iso.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`
}

function shortDay(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function Dashboard({ stats: s, growth: g, mrr: m }: { stats: AdminStats; growth: GrowthData; mrr: MrrHistory }) {
  const growth = s.growthVsLastMonth

  const dailyChartData = g.daily.map((d, i) => ({
    label: i % 5 === 0 ? shortDay(d.date) : '',
    value: d.count,
  }))

  const mrrChartData = m.monthly.map(d => ({
    label: shortMonth(d.month),
    value: d.newPro,
  }))

  return (
    <Layout openFeedbackCount={s.openFeedbackCount}>
      <Head><title>Visão geral — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Visão geral</h1>
            <p className="text-sm text-slate-500 mt-1">Métricas em tempo real</p>
          </div>
          <div className="flex items-center gap-2 bg-ink-800 border border-white/6 rounded-xl px-4 py-2">
            <span className={`size-2 rounded-full shrink-0 ${s.onlineUsers > 0 ? 'bg-success animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-sm font-semibold text-slate-200">{s.onlineUsers}</span>
            <span className="text-xs text-slate-500">online agora</span>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total usuários" value={s.totalUsers.toLocaleString('pt-BR')} sub={`+${s.newToday} hoje`}
            badge={growth !== null && growth !== undefined ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                growth >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}>
                {growth >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {Math.abs(growth)}%
              </span>
            ) : undefined}
          />
          <KPI label="Plano Pro" value={s.proUsers.toLocaleString('pt-BR')} sub={`${s.proRate}% da base`} color="text-amber-400" />
          <KPI label="MRR"       value={fmt(s.mrr)} sub={`ARR: ${fmt(s.arr)}`} color="text-success" />
          <KPI label="Transações" value={s.totalTransactions.toLocaleString('pt-BR')} sub={`+${s.transactionsThisMonth} este mês`} color="text-brand-300" />
        </div>

        {/* Métricas de negócio */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Novos este mês"  value={s.newThisMonth.toString()}     sub="cadastros" />
          <KPI label="Gratuitos"       value={s.freeUsers.toLocaleString('pt-BR')} sub={`${100 - s.proRate}% da base`} />
          <KPI label="Conversões PRO"  value={s.newProThisMonth?.toString() ?? '0'} sub="Free → PRO este mês" color="text-amber-400" />
          <KPI label="Churn este mês"  value={s.churnThisMonth?.toString()  ?? '0'} sub="PRO → Free este mês"
            color={(s.churnThisMonth ?? 0) > 0 ? 'text-danger' : 'text-slate-300'} />
          {(s.proManual ?? 0) > 0 && (
            <Link href="/users?plan=PRO_MANUAL" className="bg-ink-800 border border-amber-700/30 rounded-2xl p-5 flex flex-col gap-2 hover:bg-ink-700/60 transition-colors group">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PRO Manual</p>
                <UserCheck className="size-3.5 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-amber-500">{s.proManual}</p>
              <p className="text-xs text-slate-600">ativados sem Stripe · ver lista →</p>
            </Link>
          )}
        </div>

        {/* Gráficos de crescimento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Crescimento diário */}
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-300">Novos cadastros</h2>
                <p className="text-xs text-slate-600">últimos 30 dias</p>
              </div>
              <span className="text-lg font-bold text-brand-300">{s.newThisMonth}</span>
            </div>
            <BarChart data={dailyChartData} color="#3B82F6" labelEvery={5} />
          </div>

          {/* Novos PRO por mês */}
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-300">Novos PRO por mês</h2>
                <p className="text-xs text-slate-600">últimos 12 meses · usuários PRO ativos por data de cadastro</p>
              </div>
              <span className="text-lg font-bold text-amber-400">{m.currentPro}</span>
            </div>
            <BarChart data={mrrChartData} color="#F59E0B" labelEvery={1} />
          </div>
        </div>

        {/* Linha inferior: últimos cadastros + feedback aberto + logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Últimos cadastros */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Últimos cadastros</h2>
              <Link href="/users" className="text-xs text-brand-400 hover:text-brand-300">Ver todos →</Link>
            </div>
            <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Usuário','Plano','Cadastro'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.recentUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div>
                          <Link href={`/users/${u.id}`} className="font-medium text-slate-200 hover:text-white text-sm">{u.name}</Link>
                          <p className="text-[10px] text-slate-600">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.plan === 'PRO' ? 'bg-amber-900/60 text-amber-400 border border-amber-700/40' : 'bg-ink-700 text-slate-500 border border-white/6'}`}>{u.plan}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel lateral: feedbacks + logs */}
          <div className="flex flex-col gap-4">

            {/* Feedbacks abertos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  Feedback aberto
                  {(s.openFeedbackCount ?? 0) > 0 && (
                    <span className="ml-2 text-[10px] bg-danger/15 text-danger px-1.5 py-0.5 rounded-full font-bold">{s.openFeedbackCount}</span>
                  )}
                </h2>
                <Link href="/feedback" className="text-xs text-brand-400 hover:text-brand-300">Ver todos →</Link>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl divide-y divide-white/5">
                {!s.recentFeedback?.length ? (
                  <p className="text-xs text-slate-600 text-center py-5">Nenhum feedback aberto 🎉</p>
                ) : s.recentFeedback.map((f: { id: string; type: string; title: string; createdAt: string; user: { name: string } }) => (
                  <Link key={f.id} href={`/feedback`}
                    className="flex items-start gap-2.5 px-4 py-3 hover:bg-ink-700/40 transition-colors">
                    <span className="mt-0.5">{FEEDBACK_ICONS[f.type] ?? null}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{f.title}</p>
                      <p className="text-[10px] text-slate-600">{f.user.name} · {new Date(f.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <ArrowUpRight className="size-3 text-slate-600 shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Últimas ações admin */}
            {s.recentLogs?.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-300">Últimas ações</h2>
                  <Link href="/logs" className="text-xs text-brand-400 hover:text-brand-300">Ver log →</Link>
                </div>
                <div className="bg-ink-800 border border-white/6 rounded-2xl divide-y divide-white/5">
                  {s.recentLogs.map((l: { id: string; action: string; details: string; createdAt: string }) => (
                    <div key={l.id} className="flex items-start gap-2 px-4 py-2.5">
                      <span className="text-sm shrink-0">{LOG_LABELS[l.action] ?? '•'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 truncate">{l.details}</p>
                        <p className="text-[9px] text-slate-700">{new Date(l.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  )
}

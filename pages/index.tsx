import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Bug, Lightbulb, Ticket, TrendingUp, TrendingDown, ArrowUpRight, UserCheck, Clock, Target, Crown, Sparkles, Smartphone } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
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

function KPI({ label, value, sub, color = 'text-white', badge, tooltip }: { label: string; value: string; sub?: string; color?: string; badge?: React.ReactNode; tooltip?: string }) {
  return (
    <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {tooltip && <InfoIcon text={tooltip} />}
        </div>
        {badge}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, icon, color }: { title: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-white/6" />
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
  const W = 600
  const H = 60
  const LABEL_H = 14
  const n = data.length
  const barW = (W / n) * 0.7
  const gap  = W / n

  return (
    <div style={{ aspectRatio: `${W} / ${H + LABEL_H}` }}>
      <svg viewBox={`0 0 ${W} ${H + LABEL_H}`} className="w-full h-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = Math.max(0.5, (d.value / max) * H)
          const x = i * gap + gap * 0.15
          return (
            <g key={i}>
              <rect x={x} y={H - h} width={barW} height={h} fill={color} rx="1" opacity={d.value === 0 ? 0.15 : 1} />
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H + 10} textAnchor="middle" fontSize="13" fill="#475569">
                  {d.label}
                </text>
              )}
              <title>{d.label}: {d.value}</title>
            </g>
          )
        })}
      </svg>
    </div>
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
  const mIdx = parseInt(m) - 1
  return mIdx === 0 ? `Jan/${y.slice(2)}` : months[mIdx]
}

function shortDay(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function Dashboard({ stats: s, growth: g, mrr: m }: { stats: AdminStats; growth: GrowthData; mrr: MrrHistory }) {
  const growth = s.growthVsLastMonth
  const [mrrTarget, setMrrTarget]       = useState(0)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput]   = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('rook_mrr_target')
    if (saved) setMrrTarget(parseFloat(saved))
  }, [])

  function saveMrrTarget() {
    const val = parseFloat(targetInput.replace(',', '.'))
    if (!isNaN(val) && val > 0) {
      setMrrTarget(val)
      localStorage.setItem('rook_mrr_target', String(val))
    }
    setEditingTarget(false)
  }

  const dailyChartData = g.daily.map((d, i) => ({
    label: i % 5 === 0 ? shortDay(d.date) : '',
    value: d.count,
  }))

  const mrrChartData = m.monthly.map(d => ({
    label: shortMonth(d.month),
    value: d.newPro,
  }))

  const totalManual = s.proManual + s.proPlusManual

  return (
    <Layout openFeedbackCount={s.openFeedbackCount}>
      <Head><title>Visão geral — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Visão geral</h1>
            <p className="text-sm text-slate-500 mt-1">Métricas em tempo real</p>
          </div>
        </div>

        {/* Modal de meta de MRR */}
        {editingTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingTarget(false)}>
            <div className="bg-ink-800 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 w-80" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Target className="size-4 text-success" /> Meta de MRR</p>
              <input autoFocus value={targetInput} onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveMrrTarget()}
                placeholder="Ex: 1000.00" type="number" min="0"
                className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-success/60" />
              <div className="flex gap-2">
                <button onClick={saveMrrTarget} className="px-4 py-2 rounded-lg text-sm font-medium bg-success/20 hover:bg-success/30 text-success border border-success/20 transition-colors">Salvar</button>
                {mrrTarget > 0 && <button onClick={() => { setMrrTarget(0); localStorage.removeItem('rook_mrr_target'); setEditingTarget(false) }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-danger transition-colors">Remover</button>}
                <button onClick={() => setEditingTarget(false)} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de progresso de MRR */}
        {mrrTarget > 0 && (
          <div className="bg-ink-800 border border-success/20 rounded-xl px-5 py-3 flex items-center gap-4">
            <Target className="size-4 text-success shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Meta mensal de MRR</span>
                <span className="text-success font-semibold">{Math.min(100, Math.round((s.mrr / mrrTarget) * 100))}%</span>
              </div>
              <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${Math.min(100, (s.mrr / mrrTarget) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-600">{fmt(s.mrr)} de {fmt(mrrTarget)}</p>
            </div>
          </div>
        )}

        {/* Alerta PRO manual expirando */}
        {(s.manualExpiringCount ?? 0) > 0 && (
          <div className="flex items-center gap-3 bg-warning/10 border border-warning/25 rounded-xl px-4 py-3">
            <Clock className="size-4 text-warning shrink-0" />
            <p className="text-sm text-warning flex-1">
              <span className="font-semibold">{s.manualExpiringCount} usuário{s.manualExpiringCount > 1 ? 's' : ''} PRO manual</span>{' '}
              expira{s.manualExpiringCount > 1 ? 'm' : ''} nos próximos 7 dias.
            </p>
            <Link href="/subscriptions" className="text-xs text-warning/80 hover:text-warning underline shrink-0">Ver assinaturas →</Link>
          </div>
        )}

        {/* ═══════════════════ SEÇÕES 2×2 ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── GERAL ──────────────────────────────────────── */}
          <div className="bg-ink-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader title="Geral" icon={<TrendingUp className="size-4" />} color="text-brand-400" />
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Total usuários" value={s.totalUsers.toLocaleString('pt-BR')} sub={`+${s.newToday} hoje`}
                tooltip="Total de contas cadastradas (free + PRO + PRO+)."
                badge={growth !== null && growth !== undefined ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                    growth >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}>
                    {growth >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                    {Math.abs(growth)}%
                  </span>
                ) : undefined}
              />
              <KPI label="Novos este mês" value={s.newThisMonth.toString()} sub="cadastros"
                tooltip="Cadastros realizados no mês atual (do dia 1 até hoje)." />
              <KPI label="Gratuitos" value={s.freeUsers.toLocaleString('pt-BR')} sub={`${100 - s.proRate}% da base`}
                tooltip="Usuários no plano Free — potenciais conversões." />
              <KPI label="Transações" value={s.totalTransactions.toLocaleString('pt-BR')} sub={`+${s.transactionsThisMonth} este mês`} color="text-brand-300"
                tooltip="Total de transações registradas (receitas + despesas)." />
            </div>
          </div>

          {/* ── PLATAFORMA ─────────────────────────────────── */}
          <div className="bg-ink-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader title="Plataforma" icon={<Smartphone className="size-4" />} color="text-cyan-400" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-green-400"><path d="M17.523 2.234a.752.752 0 00-1.037.234l-1.07 1.838a7.628 7.628 0 00-6.832 0L7.514 2.468a.752.752 0 00-1.271.804l.96 1.648A7.532 7.532 0 004 11.25h16a7.532 7.532 0 00-3.203-6.33l.96-1.648a.752.752 0 00.234-1.037h-.468zM8.5 8.75a.75.75 0 110-1.5.75.75 0 010 1.5zm7 0a.75.75 0 110-1.5.75.75 0 010 1.5zM4 12.75h16v7.5a2.25 2.25 0 01-2.25 2.25H6.25A2.25 2.25 0 014 20.25v-7.5z"/></svg>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Android</p>
                </div>
                <p className="text-2xl font-bold text-green-400">{s.androidUsers ?? 0}</p>
                <p className="text-xs text-slate-600">{s.totalUsers > 0 ? Math.round(((s.androidUsers ?? 0) / s.totalUsers) * 100) : 0}% da base</p>
              </div>
              <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-slate-300"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Apple</p>
                </div>
                <p className="text-2xl font-bold text-slate-200">{s.iosUsers ?? 0}</p>
                <p className="text-xs text-slate-600">{s.totalUsers > 0 ? Math.round(((s.iosUsers ?? 0) / s.totalUsers) * 100) : 0}% da base</p>
              </div>
              <KPI label="Web only" value={(s.webOnlyUsers ?? s.totalUsers).toLocaleString('pt-BR')} color="text-blue-400"
                sub="sem app instalado"
                tooltip="Usuários que nunca registraram push token do app mobile." />
              <KPI label="Online agora" value={s.onlineUsers.toString()} color={s.onlineUsers > 0 ? 'text-success' : 'text-slate-500'}
                sub="ativos nos últimos 5 min"
                tooltip="Usuários que fizeram alguma ação nos últimos 5 minutos."
                badge={s.onlineUsers > 0 ? <span className="size-2 rounded-full bg-success animate-pulse" /> : undefined} />
            </div>
          </div>

          {/* ── PRO ────────────────────────────────────────── */}
          <div className="bg-ink-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader title="PRO" icon={<Crown className="size-4" />} color="text-amber-400" />
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Stripe PRO" value={s.proStripe.toString()} color="text-amber-400"
                sub={`MRR: ${fmt(s.mrrPro)}`}
                tooltip="Assinantes PRO pagando via Stripe (R$19,90/mês). Geram MRR."
                badge={mrrTarget > 0 ? (
                  <button onClick={() => { setTargetInput(String(mrrTarget)); setEditingTarget(true) }}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                    <Target className="size-2.5" /> meta
                  </button>
                ) : undefined}
              />
              <Link href="/users?plan=PRO_MANUAL" className="bg-ink-800 border border-amber-700/20 rounded-2xl p-5 hover:bg-ink-700/60 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manual PRO</p>
                    <InfoIcon text="PRO ativado pelo backoffice sem Stripe — não gera MRR." />
                  </div>
                  <UserCheck className="size-3.5 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-amber-500/70">{s.proManual}</p>
                <p className="text-xs text-slate-600 mt-1">sem receita · ver lista →</p>
              </Link>
              <KPI label="Conversões PRO" value={s.convPro.toString()} sub="→ PRO este mês" color="text-amber-400"
                tooltip="Upgrades para PRO neste mês (Stripe + manual)." />
              <KPI label="Churn PRO" value={s.churnPro.toString()} sub="PRO → Free este mês"
                color={s.churnPro > 0 ? 'text-danger' : 'text-slate-300'}
                tooltip="Downgrades de PRO para Free neste mês." />
            </div>
          </div>

          {/* ── PRO+ ───────────────────────────────────────── */}
          <div className="bg-ink-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader title="PRO+" icon={<Sparkles className="size-4" />} color="text-violet-400" />
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Stripe PRO+" value={s.proPlusStripe.toString()} color="text-violet-400"
                sub={`MRR: ${fmt(s.mrrProPlus)}`}
                tooltip="Assinantes PRO+ pagando via Stripe (R$34,90/mês). Geram MRR." />
              <KPI label="Manual PRO+" value={s.proPlusManual.toString()} color="text-violet-400/60"
                sub="sem receita"
                tooltip="PRO+ ativado pelo backoffice sem Stripe — não gera MRR." />
              <KPI label="Conversões PRO+" value={s.convProPlus.toString()} sub="→ PRO+ este mês" color="text-violet-400"
                tooltip="Upgrades para PRO+ neste mês (Stripe + manual)." />
              <KPI label="Churn PRO+" value={s.churnProPlus.toString()} sub="PRO+ → Free este mês"
                color={s.churnProPlus > 0 ? 'text-danger' : 'text-slate-300'}
                tooltip="Downgrades de PRO+ para Free neste mês." />
            </div>
          </div>

          {/* ── RECEITA ────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-ink-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <SectionHeader title="Receita" icon={<Target className="size-4" />} color="text-success" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPI label="MRR Total" value={fmt(s.mrr)} color="text-success"
                sub={`PRO: ${fmt(s.mrrPro)} + PRO+: ${fmt(s.mrrProPlus)}`}
                tooltip="Receita Mensal Recorrente total (só Stripe). ARR = MRR × 12."
                badge={!mrrTarget ? (
                  <button onClick={() => { setTargetInput(''); setEditingTarget(true) }}
                    className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors">+ meta</button>
                ) : undefined}
              />
              <KPI label="ARR" value={fmt(s.arr)} color="text-success"
                sub="MRR × 12" tooltip="Receita Anual Recorrente projetada." />
              <KPI label="Planos Pagos" value={s.proUsers.toString()} color="text-amber-400"
                sub={`${s.proRate}% da base · ${s.proUsers - totalManual} Stripe · ${totalManual} manual`}
                tooltip="Total de usuários PRO + PRO+ ativos." />
              <KPI label="Total PRO Ativos" value={(s.proTotal + s.proPlusTotal).toString()} color="text-amber-400"
                sub={`PRO: ${s.proTotal} · PRO+: ${s.proPlusTotal}`}
                tooltip="Soma de todos os usuários em planos pagos." />
            </div>
          </div>

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
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.plan === 'PRO_PLUS' ? 'bg-violet-900/60 text-violet-300 border border-violet-600/50' :
                          u.plan === 'PRO' ? 'bg-amber-900/60 text-amber-300 border border-amber-600/40' :
                          'bg-ink-700 text-slate-500 border border-white/6'
                        }`}>
                          {u.plan === 'PRO_PLUS' && <Sparkles className="size-3" />}
                          {u.plan === 'PRO' && <Crown className="size-3" />}
                          {u.plan === 'PRO_PLUS' ? 'PRO+' : u.plan}
                        </span>
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
                  <p className="text-xs text-slate-600 text-center py-5">Nenhum feedback aberto</p>
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

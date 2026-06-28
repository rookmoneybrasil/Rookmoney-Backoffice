import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { Mail, Zap, Target, RefreshCw, Megaphone, ShieldCheck, Users, TrendingUp } from 'lucide-react'
import { Layout } from '../components/layout'
import type { EmailFlowsData, EmailFlow } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/email-flows`, {
      headers: { Cookie: `rook_backoffice=${cookie}` },
    })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Mail }> = {
  transactional:  { label: 'Transacional',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Zap },
  lifecycle:      { label: 'Lifecycle',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: RefreshCw },
  conversion:     { label: 'Conversão',      color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20',  icon: Target },
  reengagement:   { label: 'Reengajamento', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   icon: RefreshCw },
  marketing:      { label: 'Marketing',      color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20',    icon: Megaphone },
  internal:       { label: 'Interno',        color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',   icon: ShieldCheck },
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.transactional
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <cfg.icon className="size-3" />
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="bg-ink-800 border border-white/6 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-4 text-slate-500" />
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-200">{value.toLocaleString('pt-BR')}</p>
    </div>
  )
}

function FlowSection({ title, flows }: { title: string; flows: EmailFlow[] }) {
  if (flows.length === 0) return null
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="bg-ink-800 border border-white/6 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6">
              <th className="text-left text-[11px] text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Email</th>
              <th className="text-left text-[11px] text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Tipo</th>
              <th className="text-left text-[11px] text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Disparador</th>
              <th className="text-left text-[11px] text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Audiência</th>
              <th className="text-right text-[11px] text-slate-500 font-medium px-4 py-3 uppercase tracking-wider">Enviados</th>
            </tr>
          </thead>
          <tbody>
            {flows.map(flow => (
              <tr key={flow.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{flow.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{flow.description}</p>
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={flow.type} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{flow.trigger}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{flow.audience}</td>
                <td className="px-4 py-3 text-right">
                  {flow.sent !== null ? (
                    <span className="text-sm font-semibold text-slate-200">{flow.sent.toLocaleString('pt-BR')}</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EmailFlowsPage({ data }: { data: EmailFlowsData }) {
  const { flows, totalUsers, freeUsers, usersInactive7d } = data

  const lifecycle    = flows.filter(f => f.type === 'lifecycle')
  const conversion   = flows.filter(f => f.type === 'conversion')
  const reengagement = flows.filter(f => f.type === 'reengagement')
  const transactional = flows.filter(f => f.type === 'transactional')
  const marketing    = flows.filter(f => f.type === 'marketing')
  const internal     = flows.filter(f => f.type === 'internal')

  return (
    <Layout>
      <Head><title>Fluxos de Email — Backoffice</title></Head>

      <div className="p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail className="size-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-200">Fluxos de Email</h1>
            <p className="text-sm text-slate-500">{flows.length} fluxos configurados · Resend</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total de fluxos" value={flows.length} icon={Mail} />
          <StatCard label="Total usuários" value={totalUsers} icon={Users} />
          <StatCard label="Usuários FREE" value={freeUsers} icon={Target} />
          <StatCard label="Inativos 7d+" value={usersInactive7d} icon={TrendingUp} />
        </div>

        {/* Funnel visual */}
        <div className="bg-ink-800 border border-white/6 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Funil de Email</h2>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-blue-400 font-semibold">Cadastro</p>
              <p className="text-slate-500 mt-1">Boas-vindas</p>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-emerald-400 font-semibold">D+1 / D+3 / D+7</p>
              <p className="text-slate-500 mt-1">Onboarding drip</p>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <p className="text-purple-400 font-semibold">D+14 / D+30 / D+60</p>
              <p className="text-slate-500 mt-1">Conversão FREE → PRO</p>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
              <p className="text-amber-400 font-semibold">7d+ inativo</p>
              <p className="text-slate-500 mt-1">Reengajamento</p>
            </div>
          </div>
        </div>

        {/* Flow tables by category */}
        <FlowSection title="Conversão FREE → PRO" flows={conversion} />
        <FlowSection title="Lifecycle & Onboarding" flows={lifecycle} />
        <FlowSection title="Reengajamento" flows={reengagement} />
        <FlowSection title="Transacional" flows={transactional} />
        <FlowSection title="Marketing" flows={marketing} />
        <FlowSection title="Interno" flows={internal} />
      </div>
    </Layout>
  )
}

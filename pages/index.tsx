import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { Layout } from '../components/layout'
import type { AdminStats } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res  = await fetch(`${API_URL}/api/v1/admin/stats`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { stats: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function KPI({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard({ stats: s }: { stats: AdminStats }) {
  return (
    <Layout openFeedbackCount={s.openFeedbackCount}>
      <Head><title>Visão geral — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Visão geral</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas em tempo real</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total usuários" value={s.totalUsers.toLocaleString('pt-BR')} sub={`+${s.newToday} hoje`} />
          <KPI label="Plano Pro"      value={s.proUsers.toLocaleString('pt-BR')}   sub={`${s.proRate}% da base`} color="text-amber-400" />
          <KPI label="MRR"            value={fmt(s.mrr)}                            sub={`ARR: ${fmt(s.arr)}`}   color="text-success" />
          <KPI label="Transações"     value={s.totalTransactions.toLocaleString('pt-BR')} sub={`+${s.transactionsThisMonth} este mês`} color="text-brand-300" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI label="Novos este mês" value={s.newThisMonth.toString()} sub="usuários cadastrados" />
          <KPI label="Gratuitos"      value={s.freeUsers.toLocaleString('pt-BR')} sub={`${100 - s.proRate}% da base`} />
          <KPI label="Metas ativas"   value={s.totalGoals.toLocaleString('pt-BR')} sub="na base toda" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Últimos cadastros</h2>
            <Link href="/users" className="text-xs text-brand-400 hover:text-brand-300">Ver todos →</Link>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['Usuário','E-mail','Plano','Cadastro'].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.recentUsers.map(u => (
                  <tr key={u.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/40 transition-colors">
                    <td className="px-5 py-3"><Link href={`/users/${u.id}`} className="font-medium text-slate-200 hover:text-white">{u.name}</Link></td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.plan === 'PRO' ? 'bg-amber-900/60 text-amber-400 border border-amber-700/40' : 'bg-ink-700 text-slate-500 border border-white/6'}`}>{u.plan}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
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

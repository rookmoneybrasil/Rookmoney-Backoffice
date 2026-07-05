import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
import type { CronRunsData, CronRun } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/cron-runs`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const CRON_LABELS: Record<string, string> = {
  'daily':         'Cron diário (8h)',
  'blog-generate': 'Geração de blog',
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

export default function CronStatusPage({ data }: { data: CronRunsData }) {
  return (
    <Layout>
      <Head><title>Status dos crons — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Status dos crons</h1>
          <p className="text-sm text-slate-500 mt-1">Última execução e histórico dos jobs agendados</p>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4">
          {data.latest.map(({ name, expectedEveryHours, lastRun }) => {
            const stale = lastRun ? hoursAgo(lastRun.startedAt) > expectedEveryHours : true
            const failed = lastRun?.status === 'error'
            const border = failed ? 'border-danger/40' : stale ? 'border-warning/40' : 'border-success/30'
            return (
              <div key={name} className={`bg-ink-800 border ${border} rounded-2xl p-5 flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">{CRON_LABELS[name] ?? name}</h2>
                  {!lastRun ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="size-4" /> Nunca rodou</span>
                  ) : failed ? (
                    <span className="flex items-center gap-1.5 text-xs text-danger font-semibold"><XCircle className="size-4" /> Falhou</span>
                  ) : stale ? (
                    <span className="flex items-center gap-1.5 text-xs text-warning font-semibold"><AlertTriangle className="size-4" /> Atrasado</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-success font-semibold"><CheckCircle className="size-4" /> OK</span>
                  )}
                </div>
                {lastRun ? (
                  <>
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <p className="text-slate-600">Última execução</p>
                        <p className="text-slate-300 font-medium mt-0.5">{fmtDateTime(lastRun.startedAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Duração</p>
                        <p className="text-slate-300 font-medium mt-0.5">{fmtDuration(lastRun.durationMs)}</p>
                      </div>
                    </div>
                    {lastRun.error && (
                      <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 font-mono break-words">{lastRun.error}</p>
                    )}
                    {lastRun.meta && (
                      <p className="text-[11px] text-slate-500 font-mono break-words">{JSON.stringify(lastRun.meta)}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-600">Sem execuções registradas ainda.</p>
                )}
              </div>
            )
          })}
        </div>

        {/* History table */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-300">Histórico recente</h2>
            <InfoIcon text="Uma linha por execução completa de cada cron, mais recente primeiro." />
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
            {data.items.length === 0 ? (
              <div className="py-12 text-center text-slate-600">Nenhuma execução registrada ainda.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Cron', 'Status', 'Início', 'Duração', 'Detalhes'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((run: CronRun) => (
                    <tr key={run.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/30 transition-colors">
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap">{CRON_LABELS[run.name] ?? run.name}</td>
                      <td className="px-5 py-3">
                        {run.status === 'error' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-danger font-semibold"><XCircle className="size-3.5" /> Erro</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-success font-semibold"><CheckCircle className="size-3.5" /> OK</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtDateTime(run.startedAt)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDuration(run.durationMs)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-md truncate">
                        {run.error ?? (run.meta ? JSON.stringify(run.meta) : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

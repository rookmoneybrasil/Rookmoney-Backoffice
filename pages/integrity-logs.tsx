import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert, ShieldCheck, Search as SearchIcon } from 'lucide-react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
import type { IntegrityLogsData, IntegrityLogItem } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const page   = (query.page   as string) ?? '1'
  const status = (query.status as string) ?? ''
  try {
    const qs  = new URLSearchParams({ page, pageSize: '40', status }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/integrity-logs?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, page: parseInt(page), status } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const STATUS_OPTIONS = [
  { value: '',      label: 'Todos os resultados' },
  { value: 'PASS',  label: 'Aprovados' },
  { value: 'FAIL',  label: 'Reprovados' },
  { value: 'BLOCK', label: 'Bloqueados (sem token)' },
  { value: 'ERROR', label: 'Erros de decode' },
]

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PASS')
    return <span className="inline-flex items-center gap-1.5 text-xs text-success font-semibold"><CheckCircle className="size-3.5" /> Aprovado</span>
  if (status === 'FAIL')
    return <span className="inline-flex items-center gap-1.5 text-xs text-danger font-semibold"><XCircle className="size-3.5" /> Reprovado</span>
  if (status === 'BLOCK')
    return <span className="inline-flex items-center gap-1.5 text-xs text-danger font-semibold"><ShieldAlert className="size-3.5" /> Bloqueado</span>
  if (status === 'ERROR')
    return <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold"><AlertTriangle className="size-3.5" /> Erro</span>
  return <span className="text-xs text-slate-500">{status}</span>
}

export default function IntegrityLogsPage({ data, page, status }: { data: IntegrityLogsData; page: number; status: string }) {
  return (
    <Layout>
      <Head><title>Play Integrity — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Play Integrity</h1>
          <p className="text-sm text-slate-500 mt-1">Verificações de integridade do dispositivo nas compras Android (últimos 7 dias)</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Verificações (7d)</p>
            <p className="text-2xl font-bold text-slate-100">{data.summary.total7d.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Aprovadas</p>
            <p className="text-2xl font-bold text-success">{data.summary.pass7d.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reprovadas</p>
              <InfoIcon text="Device sem MEETS_DEVICE_INTEGRITY, app modificado, ou (em require mode) sem token. Taxa alta pode indicar falso-positivo em ROMs custom — considere PLAY_INTEGRITY_ENFORCE=false." />
            </div>
            <p className={`text-2xl font-bold ${data.summary.denyRate7d > 10 ? 'text-danger' : 'text-slate-100'}`}>
              {data.summary.denied7d.toLocaleString('pt-BR')} <span className="text-sm font-medium text-slate-500">({data.summary.denyRate7d}%)</span>
            </p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Erros de decode</p>
              <InfoIcon text="Falha ao decodificar o token (outage/config da Play Integrity API). Fail-open: não bloqueia a compra por padrão." />
            </div>
            <p className={`text-2xl font-bold ${data.summary.error7d > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{data.summary.error7d.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <form className="flex items-center gap-3 flex-wrap">
          <select name="status" defaultValue={status}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            <SearchIcon className="size-4" /> Filtrar
          </button>
          {status && <Link href="/integrity-logs" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>}
        </form>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          {data.items.length === 0 ? (
            <div className="py-12 text-center text-slate-600">
              <ShieldCheck className="size-8 mx-auto mb-3 text-slate-700" />
              Nenhuma verificação registrada ainda.
              <p className="text-xs text-slate-700 mt-1">Aparece após a primeira compra Android com o build que usa Play Integrity.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['Data', 'Etapa', 'Resultado', 'Detalhe', 'Usuário'].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((log: IntegrityLogItem) => (
                  <tr key={log.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/30 transition-colors">
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-400">{log.stage === 'precheck' ? 'Pré-compra' : 'Verificação'}</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-md truncate font-mono">{log.summary}</td>
                    <td className="px-5 py-3">
                      {log.user ? (
                        <Link href={`/users/${log.user.id}`} className="group">
                          <p className="text-sm text-slate-300 group-hover:text-brand-300">{log.user.name}</p>
                          <p className="text-[10px] text-slate-600">{log.user.email}</p>
                        </Link>
                      ) : (
                        <p className="text-sm text-slate-600">—</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/integrity-logs?status=${status}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/integrity-logs?status=${status}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

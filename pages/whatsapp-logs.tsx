import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, XCircle, Search, Image as ImageIcon, FileText, Mic, MessageSquare, HelpCircle } from 'lucide-react'
import { Layout } from '../components/layout'
import { InfoIcon } from '../components/tooltip'
import type { WhatsAppLogsData, WhatsAppLogItem } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const page   = (query.page   as string) ?? '1'
  const status = (query.status as string) ?? ''
  const phone  = (query.phone  as string) ?? ''
  try {
    const qs  = new URLSearchParams({ page, pageSize: '40', status, phone }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/whatsapp-logs?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, page: parseInt(page), status, phone } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:        <MessageSquare className="size-3.5 text-slate-400" />,
  image:       <ImageIcon     className="size-3.5 text-brand-400" />,
  document:    <FileText      className="size-3.5 text-amber-400" />,
  audio:       <Mic           className="size-3.5 text-emerald-400" />,
  unsupported: <HelpCircle    className="size-3.5 text-slate-600" />,
}

const STATUS_OPTIONS = [
  { value: '',         label: 'Todos os status' },
  { value: 'received', label: 'Recebidas' },
  { value: 'sent',     label: 'Enviadas' },
  { value: 'failed',   label: 'Falhadas' },
]

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function WhatsAppLogsPage({ data, page, status, phone }: { data: WhatsAppLogsData; page: number; status: string; phone: string }) {
  return (
    <Layout>
      <Head><title>WhatsApp Rookinho — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">WhatsApp Rookinho</h1>
          <p className="text-sm text-slate-500 mt-1">Tráfego de mensagens (metadados — o texto não é armazenado)</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mensagens hoje</p>
            <p className="text-2xl font-bold text-slate-100">{data.summary.today.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxa de falha (7d)</p>
              <InfoIcon text="% de mensagens enviadas (outbound) que falharam na Graph API da Meta nos últimos 7 dias" />
            </div>
            <p className={`text-2xl font-bold ${data.summary.failureRate7d > 5 ? 'text-danger' : 'text-success'}`}>{data.summary.failureRate7d}%</p>
          </div>
          <div className="bg-ink-800 border border-white/6 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Usuários ativos (7d)</p>
            <p className="text-2xl font-bold text-brand-300">{data.summary.activeUsers7d.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <form className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 pointer-events-none" />
            <input name="phone" defaultValue={phone} placeholder="Buscar por telefone..."
              className="w-full bg-ink-800 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-600/60" />
          </div>
          <select name="status" defaultValue={status}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(status || phone) && (
            <Link href="/whatsapp-logs" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          {data.items.length === 0 ? (
            <div className="py-12 text-center text-slate-600">Nenhuma mensagem registrada ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {['Data', 'Direção', 'Tipo', 'Status', 'Usuário / Telefone', 'Erro'].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((log: WhatsAppLogItem) => (
                  <tr key={log.id} className="border-b border-white/4 last:border-0 hover:bg-ink-700/30 transition-colors">
                    <td className="px-5 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                    <td className="px-5 py-3">
                      {log.direction === 'inbound' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-300"><ArrowDownLeft className="size-3.5" /> Recebida</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><ArrowUpRight className="size-3.5" /> Enviada</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        {TYPE_ICONS[log.messageType] ?? TYPE_ICONS.unsupported}
                        {log.messageType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-danger font-semibold"><XCircle className="size-3.5" /> Falhou</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success font-semibold"><CheckCircle className="size-3.5" /> {log.status === 'received' ? 'Recebida' : 'OK'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {log.user ? (
                        <Link href={`/users/${log.user.id}`} className="group">
                          <p className="text-sm text-slate-300 group-hover:text-brand-300">{log.user.name}</p>
                          <p className="text-[10px] text-slate-600">{log.phone}</p>
                        </Link>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-500">Não vinculado</p>
                          <p className="text-[10px] text-slate-600">{log.phone}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-danger text-xs max-w-xs truncate font-mono">{log.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/whatsapp-logs?status=${status}&phone=${phone}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/whatsapp-logs?status=${status}&phone=${phone}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

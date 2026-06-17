import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Bug, Lightbulb, Ticket, ArrowUpRight, Mail, X } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type FeedbackPage, type FeedbackItem } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  const status = (query.status as string) ?? ''
  const type   = (query.type   as string) ?? ''
  const search = (query.search as string) ?? ''
  const page   = (query.page   as string) ?? '1'
  try {
    const qs  = new URLSearchParams({ status, type, search, page, pageSize: '20' }).toString()
    const res = await fetch(`${API_URL}/api/v1/admin/feedback?${qs}`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { data: json.data, status, type, search, page: parseInt(page) } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open:      { label: 'Aberto',     className: 'bg-brand-900/60 text-brand-300 border border-brand-700/40' },
  reviewing: { label: 'Analisando', className: 'bg-amber-900/60 text-amber-400 border border-amber-700/40' },
  done:      { label: 'Resolvido',  className: 'bg-success/10 text-success border border-success/20' },
}

export default function FeedbackPage({ data, status, type, search, page }: { data: FeedbackPage; status: string; type: string; search: string; page: number }) {
  const router = useRouter()
  const [updating, setUpdating]   = useState<string | null>(null)
  const [replyItem, setReplyItem] = useState<FeedbackItem | null>(null)
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id)
    try { await api.setFeedbackStatus(id, newStatus); router.replace(router.asPath) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setUpdating(null) }
  }

  function openReply(item: FeedbackItem) {
    setReplyItem(item)
    setSubject(`Re: ${item.title}`)
    setMessage('')
    setSent(false)
  }

  function closeReply() { setReplyItem(null); setSubject(''); setMessage('') }

  async function sendReply() {
    if (!replyItem || !subject.trim() || !message.trim()) return
    setSending(true)
    try {
      await api.sendEmail(replyItem.user.id, subject.trim(), message.trim())
      setSent(true)
      setTimeout(closeReply, 2000)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao enviar') }
    finally { setSending(false) }
  }

  return (
    <Layout>
      <Head><title>Feedback — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">

        {/* Reply modal */}
        {replyItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-ink-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Mail className="size-4 text-brand-400" />
                  Responder {replyItem.user.name}
                </p>
                <button onClick={closeReply} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 -mt-2">Para: {replyItem.user.email}</p>
              {sent ? (
                <p className="text-sm text-success text-center py-4">✓ Resposta enviada!</p>
              ) : (
                <>
                  <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
                    placeholder="Assunto"
                    className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={5000}
                    placeholder="Sua mensagem..."
                    className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-600/60" />
                  <div className="flex gap-2">
                    <button onClick={sendReply} disabled={sending || !subject.trim() || !message.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
                      <Mail className="size-3.5" /> {sending ? 'Enviando...' : 'Enviar resposta'}
                    </button>
                    <button onClick={closeReply}
                      className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Bugs & Sugestões</h1>
            <p className="text-sm text-slate-500 mt-1">{data.total.toLocaleString('pt-BR')} envios</p>
          </div>
        </div>

        {/* Filters */}
        <form className="flex items-center gap-3 flex-wrap">
          <input name="search" defaultValue={search} placeholder="Buscar por título ou descrição..."
            className="flex-1 min-w-48 bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
          <select name="status" defaultValue={status}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="reviewing">Analisando</option>
            <option value="done">Resolvido</option>
          </select>
          <select name="type" defaultValue={type}
            className="bg-ink-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
            <option value="">Todos os tipos</option>
            <option value="ticket">Tickets</option>
            <option value="bug">Bugs</option>
            <option value="suggestion">Sugestões</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Filtrar
          </button>
          {(status || type) && (
            <Link href="/feedback" className="text-sm text-slate-500 hover:text-slate-300 px-2">Limpar</Link>
          )}
        </form>

        {/* List */}
        <div className="flex flex-col gap-3">
          {data.items.length === 0 && (
            <div className="bg-ink-800 border border-white/6 rounded-2xl py-12 text-center text-slate-600">Nenhum feedback encontrado.</div>
          )}
          {data.items.map(item => (
            <div key={item.id} className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3 flex-wrap">
                {/* Type icon */}
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                  item.type === 'bug' ? 'bg-danger/10 text-danger' :
                  item.type === 'ticket' ? 'bg-brand-800/60 text-brand-300' :
                  'bg-amber-900/40 text-amber-400'}`}>
                  {item.type === 'bug' ? <Bug className="size-4" /> : item.type === 'ticket' ? <Ticket className="size-4" /> : <Lightbulb className="size-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_LABELS[item.status]?.className ?? ''}`}>
                      {STATUS_LABELS[item.status]?.label ?? item.status}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.type === 'bug' ? 'bg-danger/10 text-danger' :
                      item.type === 'ticket' ? 'bg-brand-900/60 text-brand-400' :
                      'bg-amber-900/40 text-amber-400'}`}>
                      {item.type === 'bug' ? 'Bug' : item.type === 'ticket' ? 'Ticket' : 'Sugestão'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.user.name} · {item.user.email} · {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Status changer */}
                <select
                  value={item.status}
                  disabled={updating === item.id}
                  onChange={e => updateStatus(item.id, e.target.value)}
                  title="Aberto = novo, sem resposta. Analisando = em progresso. Resolvido = encerrado."
                  className="bg-ink-700 border border-white/8 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none disabled:opacity-50"
                >
                  <option value="open">Aberto</option>
                  <option value="reviewing">Analisando</option>
                  <option value="done">Resolvido</option>
                </select>
              </div>

              <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{item.body}</p>

              {item.imageData && (
                <div className="rounded-xl overflow-hidden border border-white/8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageData}
                    alt="Screenshot"
                    className="w-full max-h-80 object-contain bg-ink-900 cursor-zoom-in"
                    onClick={() => window.open(item.imageData!, '_blank')}
                    title="Clique para ampliar"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <button onClick={() => openReply(item)}
                  title="Abre um modal para enviar um email de resposta diretamente para o usuário via Resend"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-800/40 hover:bg-brand-700/40 border border-brand-700/30 px-3 py-1.5 rounded-lg transition-colors">
                  <Mail className="size-3" /> Responder
                </button>
                <Link href={`/users/${item.user.id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                  Ver usuário <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <Link href={`/feedback?status=${status}&type=${type}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">← Anterior</Link>}
            <span className="text-sm text-slate-500">Página {page} de {data.totalPages}</span>
            {page < data.totalPages && <Link href={`/feedback?status=${status}&type=${type}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-ink-700">Próxima →</Link>}
          </div>
        )}
      </div>
    </Layout>
  )
}

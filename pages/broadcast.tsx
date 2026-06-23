import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { useState } from 'react'
import { Bell, Users, Crown, Send, Sparkles } from 'lucide-react'
import { Layout } from '../components/layout'
import { api } from '../src/lib/api'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  return { props: {} }
}

export default function BroadcastPage() {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [audience, setAudience] = useState<'all' | 'pro' | 'pro_plus'>('all')
  const [screen, setScreen]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ sent: number } | null>(null)
  const [error, setError]       = useState('')

  async function send() {
    if (!title.trim() || !body.trim()) return
    if (!confirm(`Enviar push para ${audience === 'pro' ? 'usuários PRO e PRO+' : audience === 'pro_plus' ? 'usuários PRO+' : 'todos os usuários'} com o app instalado?`)) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.pushBroadcast(title.trim(), body.trim(), audience, screen.trim() || undefined)
      setResult(res)
      setTitle('')
      setBody('')
      setScreen('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setLoading(false)
    }
  }

  const SCREENS = [
    { value: '',             label: 'Nenhuma (abre o app)' },
    { value: 'home',         label: 'Home / Dashboard' },
    { value: 'transactions', label: 'Transações' },
    { value: 'bills',        label: 'Contas' },
    { value: 'goals',        label: 'Metas' },
    { value: 'reports',      label: 'Relatórios' },
  ]

  return (
    <Layout>
      <Head><title>Broadcast Push — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Bell className="size-6 text-brand-300" /> Broadcast Push
          </h1>
          <p className="text-sm text-slate-500 mt-1">Envie uma notificação push para usuários com o app instalado.</p>
        </div>

        {/* Audience */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audiência</label>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setAudience('all')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                audience === 'all'
                  ? 'bg-brand-800/60 border-brand-700/50 text-brand-300'
                  : 'bg-ink-800 border-white/8 text-slate-400 hover:border-brand-700/30'
              }`}>
              <Users className="size-4" />
              <div className="text-left">
                <p>Todos os usuários</p>
                <p className="text-[10px] font-normal text-slate-600">FREE + PRO + PRO+</p>
              </div>
            </button>
            <button onClick={() => setAudience('pro')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                audience === 'pro'
                  ? 'bg-blue-900/40 border-blue-700/50 text-blue-300'
                  : 'bg-ink-800 border-white/8 text-slate-400 hover:border-blue-700/30'
              }`}>
              <Crown className="size-4" />
              <div className="text-left">
                <p>Planos pagos</p>
                <p className="text-[10px] font-normal text-slate-600">PRO + PRO+</p>
              </div>
            </button>
            <button onClick={() => setAudience('pro_plus')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                audience === 'pro_plus'
                  ? 'bg-amber-900/40 border-amber-700/50 text-amber-300'
                  : 'bg-ink-800 border-white/8 text-slate-400 hover:border-amber-700/30'
              }`}>
              <Sparkles className="size-4" />
              <div className="text-left">
                <p>Somente PRO+</p>
                <p className="text-[10px] font-normal text-slate-600">Plano PRO+ apenas</p>
              </div>
            </button>
          </div>
        </div>

        {/* Message */}
        <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Bell className="size-4 text-brand-400" /> Mensagem
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Título <span className="text-danger">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
              placeholder="Ex: Nova funcionalidade disponível! 🚀"
              className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
            <p className="text-[10px] text-slate-700 text-right">{title.length}/100</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Corpo <span className="text-danger">*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={250}
              placeholder="Ex: Agora você pode exportar suas transações em CSV. Confira!"
              className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-brand-600/60" />
            <p className="text-[10px] text-slate-700 text-right">{body.length}/250</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Tela de destino (opcional)</label>
            <select value={screen} onChange={e => setScreen(e.target.value)}
              className="w-full bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-600/60">
              {SCREENS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="bg-ink-700 border border-white/6 rounded-xl p-4 flex flex-col gap-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Preview da notificação</p>
            <div className="bg-ink-800 border border-white/8 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="size-8 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">R</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{title || 'Título...'}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{body || 'Corpo da mensagem...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result / Error */}
        {result && (
          <div className="flex items-center gap-3 bg-success/10 border border-success/25 rounded-xl px-4 py-3">
            <Send className="size-4 text-success shrink-0" />
            <p className="text-sm text-success">Push enviado para <span className="font-semibold">{result.sent} dispositivo{result.sent !== 1 ? 's' : ''}</span>.</p>
          </div>
        )}
        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <button onClick={send} disabled={loading || !title.trim() || !body.trim()}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
          <Send className="size-4" />
          {loading ? 'Enviando...' : `Enviar para ${audience === 'pro' ? 'planos pagos' : audience === 'pro_plus' ? 'usuários PRO+' : 'todos'}`}
        </button>
      </div>
    </Layout>
  )
}

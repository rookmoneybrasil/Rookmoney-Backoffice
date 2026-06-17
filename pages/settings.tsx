import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { useState } from 'react'
import { Settings, Save, AlertTriangle, Mail } from 'lucide-react'
import { Layout } from '../components/layout'
import { api, type AppSettings } from '../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/app-settings`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { initial: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

function SettingRow({
  label, description, icon: Icon, value, type = 'text', min, onSave,
}: {
  label:       string
  description: string
  icon:        React.ElementType
  value:       string
  type?:       string
  min?:        number
  onSave:      (v: string) => Promise<void>
}) {
  const [val, setVal]       = useState(value)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  async function save() {
    if (!val.trim()) return
    setSaving(true); setError('')
    try {
      await onSave(val.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-ink-800 border border-white/6 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-lg bg-brand-800/60 border border-brand-700/30 flex items-center justify-center shrink-0">
          <Icon className="size-4 text-brand-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type={type}
          min={min}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="flex-1 bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60"
        />
        <button
          onClick={save}
          disabled={saving || val.trim() === value}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-700/60 hover:bg-brand-600/60 border border-brand-600/30 text-brand-300 transition-colors disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar'}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export default function SettingsPage({ initial }: { initial: AppSettings }) {
  return (
    <Layout>
      <Head><title>Configurações — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Settings className="size-6 text-brand-300" /> Configurações
          </h1>
          <p className="text-sm text-slate-500 mt-1">Variáveis operacionais editáveis sem deploy.</p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas automáticos</h2>

          <SettingRow
            label="Limite de alerta de churn"
            description="Se o churn do mês ultrapassar este número, um email de alerta é enviado no dia 2 do mês seguinte."
            icon={AlertTriangle}
            type="number"
            min={1}
            value={initial.churn_alert_threshold ?? '5'}
            onSave={v => api.updateSetting('churn_alert_threshold', v)}
          />

          <SettingRow
            label="Email para alertas de sistema"
            description="Para onde são enviados alertas de churn e notificações operacionais."
            icon={Mail}
            type="email"
            value={initial.admin_alert_email ?? ''}
            onSave={v => api.updateSetting('admin_alert_email', v)}
          />
        </div>
      </div>
    </Layout>
  )
}

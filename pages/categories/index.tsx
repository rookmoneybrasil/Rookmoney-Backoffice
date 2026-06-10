'use client'

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { Layout } from '../../components/layout'
import { api, type DefaultCategory } from '../../src/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.cookies['rook_backoffice']
  if (!cookie) return { redirect: { destination: '/login', permanent: false } }
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/categories`, { headers: { Cookie: `rook_backoffice=${cookie}` } })
    if (res.status === 401) return { redirect: { destination: '/login', permanent: false } }
    const json = await res.json()
    return { props: { initialCategories: json.data } }
  } catch {
    return { redirect: { destination: '/login', permanent: false } }
  }
}

const PRESET_COLORS = [
  '#3B82F6','#F59E0B','#06B6D4','#F43F5E','#8B5CF6',
  '#EC4899','#84CC16','#14B8A6','#6366F1','#78716C',
  '#22C55E','#10B981','#34D399','#F97316','#EF4444',
]

interface FormState { name: string; icon: string; color: string }
const EMPTY: FormState = { name: '', icon: '', color: '#3B82F6' }

function CategoryForm({ initial, onSave, onCancel, loading }: {
  initial: FormState
  onSave:  (f: FormState) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="bg-ink-800 border border-brand-700/30 rounded-2xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">Ícone (emoji)</label>
          <input value={form.icon} onChange={e => set('icon')(e.target.value)} maxLength={4}
            placeholder="🏠"
            className="bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-xl text-center focus:outline-none focus:border-brand-600/60" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs text-slate-500 font-medium">Nome</label>
          <input value={form.name} onChange={e => set('name')(e.target.value)} maxLength={50}
            placeholder="Ex: Moradia"
            className="bg-ink-700 border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-600/60" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-500 font-medium">Cor</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color')(c)}
              style={{ backgroundColor: c }}
              className={`size-6 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`} />
          ))}
          <input type="color" value={form.color} onChange={e => set('color')(e.target.value)}
            className="size-6 rounded-full border-0 cursor-pointer bg-transparent" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={loading || !form.name.trim() || !form.icon.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
          <Check className="size-4" />{loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function CategoriesPage({ initialCategories }: { initialCategories: DefaultCategory[] }) {
  const router = useRouter()
  const [categories, setCategories] = useState<DefaultCategory[]>(initialCategories)
  const [creating, setCreating]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading]     = useState<string | null>(null)

  async function handleCreate(form: FormState) {
    setLoading('create')
    try {
      await api.createCategory(form)
      setCreating(false)
      router.replace(router.asPath)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function handleUpdate(id: string, form: FormState) {
    setLoading(id)
    try {
      const updated = await api.updateCategory(id, form) as DefaultCategory
      setCategories(cs => cs.map(c => c.id === id ? updated : c))
      setEditingId(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deletar a categoria "${name}"? Ela será removida de todas as listas de usuários.`)) return
    setLoading(id + '-del')
    try {
      await api.deleteCategory(id)
      setCategories(cs => cs.filter(c => c.id !== id))
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(null) }
  }

  return (
    <Layout>
      <Head><title>Categorias padrão — Rook Backoffice</title></Head>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Categorias padrão</h1>
            <p className="text-sm text-slate-500 mt-1">{categories.length} categorias visíveis para todos os usuários</p>
          </div>
          {!creating && (
            <button onClick={() => { setCreating(true); setEditingId(null) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors">
              <Plus className="size-4" /> Nova categoria
            </button>
          )}
        </div>

        {creating && (
          <CategoryForm
            initial={EMPTY}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            loading={loading === 'create'}
          />
        )}

        <div className="bg-ink-800 border border-white/6 rounded-2xl overflow-hidden">
          {categories.length === 0 && (
            <div className="py-12 text-center text-slate-600 text-sm">Nenhuma categoria padrão.</div>
          )}
          <div className="divide-y divide-white/5">
            {categories.map(cat => (
              <div key={cat.id}>
                {editingId === cat.id ? (
                  <div className="p-4">
                    <CategoryForm
                      initial={{ name: cat.name, icon: cat.icon, color: cat.color }}
                      onSave={(f) => handleUpdate(cat.id, f)}
                      onCancel={() => setEditingId(null)}
                      loading={loading === cat.id}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-ink-700/40 transition-colors group">
                    <div className="size-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: cat.color + '22', border: `1px solid ${cat.color}44` }}>
                      {cat.icon}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-medium text-slate-200">{cat.name}</span>
                      <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-mono text-slate-600">{cat.color}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(cat.id); setCreating(false) }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-300 hover:bg-brand-900/40 transition-colors">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cat.id, cat.name)} disabled={loading === cat.id + '-del'}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50">
                        {loading === cat.id + '-del' ? <X className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
